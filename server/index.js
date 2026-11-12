import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import os from 'os';
import http from 'http';
import { authenticateAdmin, isAdminAuthenticatedRequest, safeCompareSecret } from './middleware/auth.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import crypto from 'crypto';

function getNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175',
  'http://localhost:5050',
  'http://127.0.0.1:5050',
]);

const networkIp = getNetworkIp();
if (networkIp && networkIp !== 'localhost') {
  allowedOrigins.add(`http://${networkIp}:5173`);
  allowedOrigins.add(`http://${networkIp}:5175`);
  allowedOrigins.add(`http://${networkIp}:5050`);
}
if (process.env.FRONTEND_URL) {
  allowedOrigins.add(process.env.FRONTEND_URL.replace(/\/+$/, ''));
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Protocol detector: enforces Secure cookie flag and HSTS exclusively over true HTTPS connections (CWE-614)
function isHttpsRequest(req) {
  return Boolean(
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.COOKIE_SECURE === 'true'
  );
}

// Defense-in-depth security headers (OWASP Recommended)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isHttpsRequest(req)) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests or same-origin requests with no origin header (curl, mobile, health checks)
    if (!origin) return callback(null, true);

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    // Allow Cloudflare quick tunnels or ngrok ONLY outside strict production mode unless explicitly opted in
    const allowTunnels = process.env.NODE_ENV !== 'production' || process.env.ALLOW_TUNNEL_ORIGINS === 'true';
    if (allowTunnels && (origin.endsWith('.trycloudflare.com') || origin.endsWith('.ngrok-free.app'))) {
      return callback(null, true);
    }

    // Refuse unauthorized cross-origin requests
    return callback(null, false);
  },
  credentials: true
}));
const SESSION_SECRET = process.env.SESSION_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('FATAL: SESSION_SECRET must be set in production.'); })()
    : crypto.randomBytes(32).toString('hex')
);
if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSCODE) {
  throw new Error('FATAL: ADMIN_PASSCODE must be set in production.');
}
app.use(cookieParser(SESSION_SECRET));
// High-capacity payload parser for anti-cheating proctoring webcam snapshots & promotional banners
app.use('/api/proctoring', express.json({ limit: '10mb' }));
app.use('/api/banners', express.json({ limit: '10mb' }));
// Safe global payload parser mitigating memory exhaustion Denial of Service (CWE-400)
app.use(express.json({ limit: '2mb' }));

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS ?? '',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

const DB_NAME = process.env.DB_NAME || 'evalnium_db';
const PORT = parseInt(process.env.PORT || '5050', 10);

let pool;

// In-Memory OTP Store: email -> { otp, expiresAt, attempts }
const otpStore = new Map();
// Server-Issued Verified Email Tokens (proof of OTP verification for register / password reset)
const verifiedEmailTokens = new Map();
// Rate Limiter Store: email -> { count, windowStart }
const otpRateLimitStore = new Map();

function issueVerifiedEmailToken(email) {
  const token = crypto.randomBytes(32).toString('hex');
  verifiedEmailTokens.set(token, {
    email: String(email).toLowerCase().trim(),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });
  return token;
}

function consumeVerifiedEmailToken(token, email) {
  if (typeof token !== 'string' || !token) return false;
  const record = verifiedEmailTokens.get(token);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    verifiedEmailTokens.delete(token);
    return false;
  }
  if (record.email !== String(email).toLowerCase().trim()) {
    return false;
  }
  verifiedEmailTokens.delete(token);
  return true;
}

// Constant-time string comparison preventing side-channel timing attacks (CWE-208)
function safeCompareOtp(storedOtp, candidateOtp) {
  if (typeof storedOtp !== 'string' || typeof candidateOtp !== 'string') return false;
  const storedBuf = Buffer.from(storedOtp, 'utf8');
  const candidateBuf = Buffer.from(candidateOtp.trim(), 'utf8');
  if (storedBuf.length !== candidateBuf.length) return false;
  return crypto.timingSafeEqual(storedBuf, candidateBuf);
}

// Automated heap cleanup sweep for expired OTPs, verified tokens, and email rate limits every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (now > value.expiresAt) {
      otpStore.delete(key);
    }
  }
  for (const [token, value] of verifiedEmailTokens.entries()) {
    if (now > value.expiresAt) {
      verifiedEmailTokens.delete(token);
    }
  }
  for (const [emailKey, rateData] of otpRateLimitStore.entries()) {
    if (now - rateData.windowStart > 5 * 60 * 1000) {
      otpRateLimitStore.delete(emailKey);
    }
  }
}, 5 * 60 * 1000).unref();

// --- CENTRAL IN-MEMORY EVENT ACTIVITY FEED BUFFER & AUDIT LOG PIPELINE ---
const globalActivityLog = [];

async function recordAuditLog({
  eventType = 'info',
  severity = 'info', // 'info' | 'success' | 'warning' | 'danger'
  actorName = 'System',
  actorEmail = null,
  actorRole = 'student',
  actionTitle = '',
  detailsText = '',
  ipAddress = '127.0.0.1'
}) {
  const nowIso = new Date().toISOString();

  // 1. Maintain in-memory buffer for real-time live terminal streaming
  const memoryItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type: eventType,
    severity: severity,
    message: actionTitle,
    actorName: actorName,
    actorEmail: actorEmail,
    timestamp: nowIso
  };
  globalActivityLog.unshift(memoryItem);
  if (globalActivityLog.length > 60) {
    globalActivityLog.pop();
  }

  // 2. Persist permanently to MySQL activity_audit_logs table
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO activity_audit_logs (
          event_type, severity, actor_name, actor_email, actor_role, action_title, details_text, ip_address, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventType,
          severity,
          actorName || 'Anonymous',
          actorEmail || null,
          actorRole || 'student',
          actionTitle,
          detailsText || '',
          ipAddress || '127.0.0.1',
          nowIso
        ]
      );
    } catch (err) {
      console.error('Failed to persist audit log into MySQL:', err.message);
    }
  }

  return memoryItem;
}

function logActivityEvent(type, message) {
  return recordAuditLog({
    eventType: type,
    actionTitle: message,
    severity: type === 'proctoring' || type === 'danger' ? 'danger' : type === 'completed' ? 'success' : 'info'
  });
}


function createMailTransporter() {
  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

  if (!user || !pass) {
    throw new Error('SMTP credentials (SMTP_USER and SMTP_PASS) are not configured in environment.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });
}

async function sendTemplatedEmail({
  to,
  templateId,
  templateData = {},
  fallbackSubject = 'Evalnium Notification',
  fallbackHeading = 'Notice from Evalnium',
  fallbackBody = 'You have a new update from Evalnium.'
}) {
  let finalSubject = fallbackSubject;
  try {
    let subject = fallbackSubject;
    let heading = fallbackHeading;
    let bodyText = fallbackBody;
    let ctaText = 'Open Evalnium Portal';
    let ctaUrl = '/';

    // 1. Fetch live template from MySQL database if pool is ready
    if (pool && templateId) {
      const [rows] = await pool.query('SELECT * FROM email_templates WHERE id = ?', [templateId]);
      if (rows && rows.length > 0) {
        const tpl = rows[0];
        subject = tpl.subject || subject;
        heading = tpl.heading || heading;
        bodyText = tpl.body_text || bodyText;
        ctaText = tpl.cta_text || ctaText;
        ctaUrl = tpl.cta_url || ctaUrl;
      }
    }

    const escapeHtml = (val) => String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // 2. Variable Interpolation: Replace all {{variable}} placeholders with real values
    // isHtml: whether to escape interpolated values for HTML context and format OTP badge
    const replaceVars = (str, isHtml = false) => {
      if (!str) return '';
      return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
        if (templateData[key] !== undefined && templateData[key] !== null) {
          const safeVal = isHtml ? escapeHtml(templateData[key]) : String(templateData[key]);
          // If in HTML body context and variable is OTP, style as a bold security badge
          if (isHtml && key === 'otp') {
            return `<div style="font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: 8px; color: #2563eb; background: #f8fafc; padding: 16px; text-align: center; border-radius: 10px; border: 1px solid #cbd5e1; margin: 18px 0;">${safeVal}</div>`;
          }
          return safeVal;
        }
        return match;
      });
    };

    // Email subjects MUST be plain text (RFC 5322); strip any accidental HTML tags
    finalSubject = replaceVars(subject, false).replace(/<[^>]*>/g, '').trim();
    const finalHeading = escapeHtml(replaceVars(heading, false).replace(/<[^>]*>/g, '').trim());
    const finalBodyText = replaceVars(bodyText, true);
    const finalCtaText = escapeHtml(replaceVars(ctaText, false).replace(/<[^>]*>/g, '').trim());
    let finalCtaUrl = replaceVars(ctaUrl, false).replace(/<[^>]*>/g, '').trim();

    // Ensure CTA URL is fully qualified if it's a safe root-relative path
    const networkIp = getNetworkIp();
    const defaultHost = networkIp !== 'localhost' ? `http://${networkIp}:5175` : 'http://localhost:5175';
    const appBaseUrl = process.env.APP_URL || defaultHost;
    if (finalCtaUrl.startsWith('/') && !finalCtaUrl.startsWith('//')) {
      finalCtaUrl = `${appBaseUrl}${finalCtaUrl}`;
    } else if (!finalCtaUrl.startsWith('https://') && !finalCtaUrl.startsWith('http://')) {
      finalCtaUrl = appBaseUrl;
    }

    // Convert newlines in body text to clean HTML paragraphs
    const formattedHtmlBody = finalBodyText
      .split('\n\n')
      .map(paragraph => `<p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">${paragraph.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    const safeRecipientDisplay = escapeHtml(to);
    const safeHrefUrl = escapeHtml(finalCtaUrl);

    // 3. Assemble responsive, high-converting HTML email layout
    const htmlEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
                
                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px 28px; text-align: center;">
                    <div style="font-size: 13px; font-weight: 700; letter-spacing: 2px; color: #93c5fd; text-transform: uppercase; margin-bottom: 8px;">
                      Evalnium Assessment Portal
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; line-height: 1.3;">
                      ${finalHeading}
                    </h1>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 32px 28px;">
                    ${formattedHtmlBody}

                    ${finalCtaText ? `
                    <div style="margin-top: 28px; text-align: center;">
                      <a href="${safeHrefUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                        ${finalCtaText} →
                      </a>
                    </div>
                    ` : ''}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                      This notification was delivered to <strong>${safeRecipientDisplay}</strong> by the Evalnium CBT System.
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      © 2026 Evalnium Examination Portal • All Rights Reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 4. Send via Nodemailer Transporter
    const transporter = createMailTransporter();
    const senderEmail = process.env.SMTP_USER || 'arsnaz1234@gmail.com';

    const info = await transporter.sendMail({
      from: `"Evalnium Assessment Portal" <${senderEmail}>`,
      to: to,
      subject: finalSubject,
      html: htmlEmail,
    });

    console.log(`[TEMPLATED EMAIL DELIVERED] ✅ Sent "${templateId}" to ${to}. MessageID: ${info.messageId}`);

    // 5. Asynchronously log successful dispatch to email_logs
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO email_logs (recipient_email, recipient_name, email_type, subject, status, error_message)
           VALUES (?, ?, ?, ?, 'sent', NULL)`,
          [to, templateData.candidate_name || null, templateId || 'direct_notice', finalSubject]
        );
      } catch (logErr) {
        console.error('[EMAIL LOG ERROR] Failed to record success telemetry:', logErr.message);
      }
    }

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[TEMPLATED EMAIL FAILED] ❌ Failed to dispatch email to ${to}:`, err);

    // 5. Asynchronously log failed dispatch to email_logs
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO email_logs (recipient_email, recipient_name, email_type, subject, status, error_message)
           VALUES (?, ?, ?, ?, 'failed', ?)`,
          [to, templateData.candidate_name || null, templateId || 'direct_notice', finalSubject, err.message || String(err)]
        );
      } catch (logErr) {
        console.error('[EMAIL LOG ERROR] Failed to record failure telemetry:', logErr.message);
      }
    }

    throw err;
  }
}



async function initDatabase() {
  try {
    // 1. Connect without DB selected to ensure evalnium_db database exists
    const connection = await mysql.createConnection(DB_CONFIG);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.end();

    // 2. Create connection pool with DB
    pool = mysql.createPool({
      ...DB_CONFIG,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log(`✅ Connected to MySQL Server database "${DB_NAME}"`);

    // 3. Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        topic VARCHAR(150),
        category VARCHAR(150),
        difficulty VARCHAR(50),
        time_limit_minutes INT DEFAULT 15,
        passing_percentage INT DEFAULT 60,
        negative_marks DOUBLE DEFAULT 0.25,
        quiz_type VARCHAR(50) DEFAULT 'practice',
        scheduled_start_datetime VARCHAR(100),
        scheduled_end_datetime VARCHAR(100),
        is_published TINYINT(1) DEFAULT 1,
        created_at VARCHAR(100),
        updated_at VARCHAR(100),
        author VARCHAR(100),
        enable_certificate TINYINT(1) DEFAULT 1,
        enable_anti_cheating TINYINT(1) DEFAULT 0,
        timing_mode VARCHAR(50) DEFAULT 'quiz',
        sectional_config_json LONGTEXT,
        question_time_limit_seconds INT DEFAULT 60,
        prevent_prev_section TINYINT(1) DEFAULT 0,
        prevent_early_next_section TINYINT(1) DEFAULT 0,
        prevent_prev_question TINYINT(1) DEFAULT 0,
        prevent_early_next_question TINYINT(1) DEFAULT 0,
        question_view_mode VARCHAR(50) DEFAULT 'both',
        allow_manual_early_move TINYINT(1) DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Auto-migrate columns if missing
    const columnsToAdd = [
      `ALTER TABLE quizzes ADD COLUMN enable_certificate TINYINT(1) DEFAULT 1;`,
      `ALTER TABLE quizzes ADD COLUMN enable_anti_cheating TINYINT(1) DEFAULT 0;`,
      `ALTER TABLE quizzes ADD COLUMN timing_mode VARCHAR(50) DEFAULT 'quiz';`,
      `ALTER TABLE quizzes ADD COLUMN sectional_config_json LONGTEXT;`,
      `ALTER TABLE quizzes ADD COLUMN question_time_limit_seconds INT DEFAULT 60;`,
      `ALTER TABLE quizzes ADD COLUMN prevent_prev_section TINYINT(1) DEFAULT 0;`,
      `ALTER TABLE quizzes ADD COLUMN prevent_early_next_section TINYINT(1) DEFAULT 0;`,
      `ALTER TABLE quizzes ADD COLUMN prevent_prev_question TINYINT(1) DEFAULT 0;`,
      `ALTER TABLE quizzes ADD COLUMN prevent_early_next_question TINYINT(1) DEFAULT 0;`,
      `ALTER TABLE quizzes ADD COLUMN shuffle_questions TINYINT(1) DEFAULT 1;`,
      `ALTER TABLE quizzes ADD COLUMN shuffle_options TINYINT(1) DEFAULT 1;`,
      `ALTER TABLE quizzes ADD COLUMN enable_practice_mode TINYINT(1) DEFAULT 0;`,
      `ALTER TABLE quizzes ADD COLUMN default_language_mode VARCHAR(20) DEFAULT 'en';`,
      `ALTER TABLE questions ADD COLUMN question_type VARCHAR(50) DEFAULT 'mcq';`,
      `ALTER TABLE questions ADD COLUMN image_url LONGTEXT;`,
      `ALTER TABLE questions ADD COLUMN list_i_json LONGTEXT;`,
      `ALTER TABLE questions ADD COLUMN list_ii_json LONGTEXT;`,
      `ALTER TABLE questions ADD COLUMN correct_option_ids_json LONGTEXT;`,
      `ALTER TABLE quizzes ADD COLUMN access_code VARCHAR(100) DEFAULT NULL;`,
      `ALTER TABLE quizzes ADD COLUMN allowed_emails LONGTEXT DEFAULT NULL;`,
      `ALTER TABLE quizzes ADD COLUMN question_view_mode VARCHAR(50) DEFAULT 'both';`,
      `ALTER TABLE results ADD COLUMN candidate_email VARCHAR(150) DEFAULT NULL;`,
      `ALTER TABLE quizzes ADD COLUMN max_attempts INT DEFAULT 0;`,
      `ALTER TABLE quizzes ADD COLUMN allow_manual_early_move TINYINT(1) DEFAULT 0;`,
      `ALTER TABLE quizzes ADD COLUMN result_announcement_datetime VARCHAR(100) DEFAULT NULL;`,
      `ALTER TABLE quizzes ADD COLUMN max_tab_switches INT DEFAULT 3;`,
      `ALTER TABLE visitor_logs ADD COLUMN visit_count INT DEFAULT 1;`,
      `ALTER TABLE visitor_logs ADD COLUMN duration_seconds INT DEFAULT 0;`,
    ];

    for (const alterSql of columnsToAdd) {
      try {
        await pool.query(alterSql);
      } catch (err) {
        // Ignore column already exists errors
      }
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR(100) PRIMARY KEY,
        quiz_id VARCHAR(100),
        question_text TEXT NOT NULL,
        question_english TEXT,
        question_hindi TEXT,
        correct_option_id VARCHAR(10),
        explanation TEXT,
        explanation_english TEXT,
        explanation_hindi TEXT,
        topic VARCHAR(150),
        marks DOUBLE DEFAULT 1,
        question_type VARCHAR(50) DEFAULT 'mcq',
        image_url LONGTEXT,
        list_i_json LONGTEXT,
        list_ii_json LONGTEXT,
        correct_option_ids_json LONGTEXT,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id VARCHAR(100),
        option_letter VARCHAR(10),
        option_text TEXT,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS results (
        id VARCHAR(100) PRIMARY KEY,
        quiz_id VARCHAR(100),
        quiz_title VARCHAR(255),
        candidate_name VARCHAR(150),
        topic VARCHAR(150),
        score DOUBLE,
        max_score DOUBLE,
        percentage DOUBLE,
        passed TINYINT(1),
        time_spent_seconds INT,
        correct_answers INT,
        wrong_answers INT,
        skipped_questions INT,
        user_answers_json LONGTEXT,
        attempted_at VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255),
        message TEXT,
        scheduled_datetime VARCHAR(100),
        target_quiz_id VARCHAR(100),
        is_active TINYINT(1) DEFAULT 1,
        created_at VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150),
        email VARCHAR(150),
        role VARCHAR(50),
        target_exam VARCHAR(150),
        phone VARCHAR(50),
        institution VARCHAR(200),
        gender VARCHAR(20),
        occupation_status VARCHAR(50) DEFAULT 'Student',
        designation VARCHAR(150),
        university_institute VARCHAR(255),
        city VARCHAR(100),
        address TEXT,
        password_hash VARCHAR(255),
        auth_provider VARCHAR(50) DEFAULT 'local',
        is_verified TINYINT(1) DEFAULT 1,
        created_at VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS visitor_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL UNIQUE,
        ip_address VARCHAR(50),
        country VARCHAR(100) DEFAULT 'India',
        candidate_name VARCHAR(150) DEFAULT 'Anonymous Guest',
        candidate_email VARCHAR(150) DEFAULT NULL,
        is_registered TINYINT(1) DEFAULT 0,
        browser VARCHAR(50) DEFAULT 'Chrome',
        os VARCHAR(50) DEFAULT 'Windows',
        device_type VARCHAR(50) DEFAULT 'Desktop',
        current_page VARCHAR(255) DEFAULT 'Home / Catalog',
        first_seen VARCHAR(100),
        last_seen VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Performance Indexing
    try {
      await pool.query(`CREATE INDEX idx_visitor_last_seen ON visitor_logs(last_seen);`);
      await pool.query(`CREATE INDEX idx_visitor_ip ON visitor_logs(ip_address);`);
    } catch {
      // Indexes already exist
    }
    try {
      await pool.query(`CREATE INDEX idx_results_quiz_id ON results(quiz_id);`);
      await pool.query(`CREATE INDEX idx_results_candidate_name ON results(candidate_name);`);
      await pool.query(`CREATE INDEX idx_quizzes_category ON quizzes(category);`);
    } catch {
      // Indexes already exist
    }
    try {
      await pool.query(`CREATE UNIQUE INDEX idx_users_email ON users(email);`);
    } catch {
      // Index already exists
    }
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN is_verified TINYINT(1) DEFAULT 1;`);
    } catch {
      // Column already exists
    }
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);`);
    } catch {
      // Column already exists
    }
    try { await pool.query(`ALTER TABLE users ADD COLUMN gender VARCHAR(20) DEFAULT NULL;`); } catch { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN occupation_status VARCHAR(50) DEFAULT 'Student';`); } catch { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN designation VARCHAR(150) DEFAULT NULL;`); } catch { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN university_institute VARCHAR(255) DEFAULT NULL;`); } catch { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN city VARCHAR(100) DEFAULT NULL;`); } catch { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN address TEXT DEFAULT NULL;`); } catch { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN terms_accepted_at VARCHAR(100) DEFAULT NULL;`); } catch { }
    try { await pool.query(`CREATE INDEX idx_users_occupation ON users(occupation_status);`); } catch { }
    try { await pool.query(`CREATE INDEX idx_users_city ON users(city);`); } catch { }

    await syncCandidatesToUsersTable();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id VARCHAR(150) PRIMARY KEY,
        uid VARCHAR(100) NOT NULL,
        question_id VARCHAR(100) NOT NULL,
        question_json LONGTEXT,
        bookmarked_at VARCHAR(100),
        UNIQUE KEY unique_user_question (uid, question_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try { await pool.query(`CREATE INDEX idx_bookmarks_uid ON bookmarks(uid);`); } catch { }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_visits (
        ip_address VARCHAR(100),
        visited_date DATE,
        PRIMARY KEY (ip_address, visited_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 1. Promotional Banners Table & Seed
    await pool.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle TEXT,
        image_url LONGTEXT NOT NULL,
        badge_text VARCHAR(100) DEFAULT 'HOT ANNOUNCEMENT',
        cta_text VARCHAR(100) DEFAULT 'Take Test Now',
        cta_link TEXT,
        quiz_id VARCHAR(100) DEFAULT NULL,
        slot_type VARCHAR(50) DEFAULT 'hero',
        is_active TINYINT(1) DEFAULT 1,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await pool.query(`ALTER TABLE banners ADD COLUMN slot_type VARCHAR(50) DEFAULT 'hero';`);
    } catch {
      // Column already exists
    }

    try {
      await pool.query(`ALTER TABLE banners ADD COLUMN allow_dismiss TINYINT(1) DEFAULT 1;`);
    } catch {
      // Column already exists
    }

    try {
      await pool.query(`ALTER TABLE banners ADD COLUMN image_only TINYINT(1) DEFAULT 0;`);
    } catch {
      // Column already exists
    }

    // Ensure system_settings table exists to track administrative configurations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Check if banners initial seed has ever been executed
    // Once seed flag is set, user deletions are permanent and will NEVER be resurrected on server restart
    const [seedFlagRows] = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'banners_seed_completed'");
    const isBannerSeedCompleted = seedFlagRows.length > 0;

    if (!isBannerSeedCompleted) {
      // Mark as completed immediately so future restarts respect any admin deletions
      await pool.query("INSERT INTO system_settings (setting_key, setting_value) VALUES ('banners_seed_completed', 'true') ON DUPLICATE KEY UPDATE setting_value = 'true'");
      console.log(`ℹ️ Banner seeding lifecycle initialized - admin banner deletions are permanent.`);
    }

    // 2. Question Discussions & Doubts Forum Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_discussions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id VARCHAR(100) NOT NULL,
        question_id VARCHAR(100) NOT NULL,
        user_name VARCHAR(150) NOT NULL,
        user_email VARCHAR(150),
        role VARCHAR(50) DEFAULT 'candidate',
        comment TEXT NOT NULL,
        likes_count INT DEFAULT 0,
        is_pinned TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try { await pool.query(`CREATE INDEX idx_discussions_quiz_q ON question_discussions(quiz_id, question_id);`); } catch { }

    // 3. Live Proctoring & Anti-Cheating Logs Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proctoring_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL,
        quiz_id VARCHAR(100) NOT NULL,
        candidate_name VARCHAR(150),
        candidate_email VARCHAR(150),
        violation_type VARCHAR(100) NOT NULL,
        details TEXT,
        snapshot_base64 LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try { await pool.query(`CREATE INDEX idx_proctoring_quiz ON proctoring_logs(quiz_id);`); } catch { }

    // 4. Permanent Activity Audit Logs Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_audit_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'info',
        actor_name VARCHAR(150),
        actor_email VARCHAR(150),
        actor_role VARCHAR(50) DEFAULT 'student',
        action_title VARCHAR(255) NOT NULL,
        details_text TEXT,
        ip_address VARCHAR(50),
        created_at VARCHAR(100) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try { await pool.query(`CREATE INDEX idx_audit_created_at ON activity_audit_logs(created_at);`); } catch { }
    try { await pool.query(`CREATE INDEX idx_audit_event_type ON activity_audit_logs(event_type);`); } catch { }
    try { await pool.query(`CREATE INDEX idx_audit_severity ON activity_audit_logs(severity);`); } catch { }
    try { await pool.query(`CREATE INDEX idx_audit_actor_email ON activity_audit_logs(actor_email);`); } catch { }

    //5. Outgoing Email Templates and Braodcasts Tables 
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates(
      id VARCHAR(50) PRIMARY KEY,
      template_name VARCHAR(100) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      heading VARCHAR(255) NOT NULL,
      body_text TEXT NOT NULL,
      cta_text VARCHAR(100) DEFAULT 'Open Evalnium Portal',
      cta_url VARCHAR(255) DEFAULT '/',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`

    );

    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_broadcasts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NUll,
      message_body TEXT NOT NULL,
      target_audience VARCHAR(50) DEFAULT 'all',
      recipients_count INT DEFAULT 0,
      status VARCHAR(30) DEFAULT 'sent',
      scheduled_for VARCHAR(100) NULL,
      sent_at VARCHAR(100) NOT NULL       
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255) NULL,
        email_type VARCHAR(50) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status ENUM('sent', 'failed') NOT NULL DEFAULT 'sent',
        error_message TEXT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try { await pool.query(`CREATE INDEX idx_email_logs_status ON email_logs(status);`); } catch { }
    try { await pool.query(`CREATE INDEX idx_email_logs_type ON email_logs(email_type);`); } catch { }
    try { await pool.query(`CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);`); } catch { }
    try { await pool.query(`CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);`); } catch { }

    // 6. Seed Default Outgoing Email Templates (if not already seeded)
    await pool.query(`
      INSERT IGNORE INTO email_templates (id, template_name, subject, heading, body_text, cta_text, cta_url)
      VALUES 
      (
        'new_exam_alert',
        'New Exam / Quiz Notification',
        '🎯 New Exam Available: {{quiz_title}}',
        'A New Mock Assessment is Now Live!',
        'Dear {{candidate_name}},\n\nA new assessment "{{quiz_title}}" has just been published on Evalnium. It consists of {{question_count}} questions with a duration of {{duration_minutes}} minutes.\n\nLog in now to practice under real NTA CBT exam conditions and assess your All-India ranking.',
        'Take Exam Now',
        '/quiz/{{quiz_id}}'
      ),
      (
        'candidate_notice',
        'General Announcement & Notice',
        '📢 Official Notice from Evalnium Administration',
        'Important Candidate Update',
        'Dear {{candidate_name}},\n\n{{custom_message}}\n\nPlease review your candidate dashboard for further schedule details and syllabus guidelines.',
        'Open Candidate Dashboard',
        '/'
      ),
      (
        'otp_verification',
        'OTP Verification Code',
        '🔑 Your Verification Code: {{otp}} - Evalnium Portal',
        'Confirm Your Account',
        'Dear Candidate,\n\nYour one-time security code to verify your Evalnium account is:\n\n{{otp}}\n\nThis code will expire in 10 minutes. If you did not initiate this request, please ignore this email.',
        'Verify Now',
        '/login'
      );
    `);


    // Seed initial audit log if empty
    const [auditCountRows] = await pool.query('SELECT COUNT(*) as count FROM activity_audit_logs');
    if (auditCountRows[0].count === 0) {
      const nowIso = new Date().toISOString();
      await pool.query(`
        INSERT INTO activity_audit_logs (event_type, severity, actor_name, actor_email, actor_role, action_title, details_text, ip_address, created_at)
        VALUES 
        ('admin_action', 'success', 'Admin System', 'system@evalnium.com', 'admin', '🛡️ Evalnium Secure CBT Engine & MySQL Tables Initialized', 'Database verified with active indexes on results, quizzes, users, banners, and audit logs.', '127.0.0.1', ?),
        ('admin_action', 'info', 'Admin System', 'system@evalnium.com', 'admin', '🎯 All-India Mock Test Series Armed & Ready', 'NTA UGC NET Paper 1 and specialized assessment catalogs prepared for testing.', '127.0.0.1', ?)
      `, [nowIso, nowIso]);
    }

    // Auto-sync any test results into activity_audit_logs if not already present
    try {
      const [unsyncedResults] = await pool.query(`
        SELECT r.* FROM results r 
        LEFT JOIN activity_audit_logs a 
          ON a.actor_name = r.candidate_name 
          AND a.event_type = 'exam_submit' 
          AND a.created_at = r.attempted_at 
        WHERE a.id IS NULL
      `);
      if (unsyncedResults.length > 0) {
        for (const r of unsyncedResults) {
          const actionTitle = `🎯 Exam Completed: ${r.candidate_name} completed "${r.quiz_title}" (${r.percentage}%)`;
          const detailsText = `Result: ${r.score}/${r.max_score} (${r.percentage}%), Verdict: ${r.passed ? 'PASSED ✓' : 'FAILED ✗'}, Time Spent: ${r.time_spent_seconds || 0}s, Correct: ${r.correct_answers || 0}, Wrong: ${r.wrong_answers || 0}, Skipped: ${r.skipped_questions || 0}`;
          await pool.query(
            `INSERT INTO activity_audit_logs (event_type, severity, actor_name, actor_email, actor_role, action_title, details_text, ip_address, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              'exam_submit',
              r.passed ? 'success' : 'warning',
              r.candidate_name,
              r.candidate_email || null,
              'student',
              actionTitle,
              detailsText,
              '127.0.0.1',
              r.attempted_at
            ]
          );
        }
        console.log(`✅ Synced ${unsyncedResults.length} historical exam submissions to activity_audit_logs.`);
      }
    } catch (e) {
      console.warn('Sync results to audit logs skipped:', e.message);
    }

    console.log(`✅ All MySQL Database Tables & Indexes (Banners, Discussions, Proctoring, Audit Logs) Verified & Ready!`);
  } catch (err) {
    console.error('❌ Failed to initialize MySQL Database:', err);
  }
}

async function syncCandidatesToUsersTable() {
  try {
    const [results] = await pool.query(`
      SELECT candidate_name, candidate_email, MIN(attempted_at) as first_attempt 
      FROM results 
      WHERE candidate_name IS NOT NULL AND candidate_name != ''
      GROUP BY candidate_name, candidate_email
    `);

    for (const r of results) {
      const name = r.candidate_name.trim();
      let email = (r.candidate_email || '').trim().toLowerCase();

      if (!email || email === 'not provided') {
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        email = `${slug || 'candidate'}@evalnium.app`;
        await pool.query('UPDATE results SET candidate_email = ? WHERE candidate_name = ? AND (candidate_email IS NULL OR candidate_email = "" OR candidate_email = "Not Provided")', [email, name]);
      }

      const uid = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const createdAt = r.first_attempt || new Date().toISOString();

      await pool.query(`
        INSERT INTO users (uid, name, email, role, created_at)
        VALUES (?, ?, ?, 'candidate', ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name)
      `, [uid, name, email, createdAt]);
    }
    await pool.query(`
      UPDATE results r
      INNER JOIN quizzes q ON r.quiz_id = q.id
      SET r.topic = q.topic, r.quiz_title = q.title
      WHERE COALESCE(r.topic, '') <> COALESCE(q.topic, '')
         OR COALESCE(r.quiz_title, '') <> COALESCE(q.title, '')
    `);
    console.log(`✅ Candidates auto-synced to users table.`);
  } catch (err) {
    console.error('Failed to sync candidates to users table:', err.message);
  }
}

initDatabase();

// --- OTP AUTH ENDPOINTS WITH RATE LIMITING ---
const otpIpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many OTP requests from this network. Please wait 15 minutes before requesting another verification code.'
});

app.post('/api/auth/send-otp', otpIpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required' });

    const key = email.toLowerCase().trim();
    const now = Date.now();
    const rateData = otpRateLimitStore.get(key) || { count: 0, windowStart: now };

    if (now - rateData.windowStart > 5 * 60 * 1000) {
      rateData.count = 0;
      rateData.windowStart = now;
    }

    if (rateData.count >= 3) {
      const waitSeconds = Math.ceil((rateData.windowStart + 5 * 60 * 1000 - now) / 1000);
      return res.status(429).json({
        error: `Too many OTP requests. For security, please wait ${waitSeconds} seconds before trying again.`
      });
    }

    rateData.count += 1;
    otpRateLimitStore.set(key, rateData);

    // Cryptographically secure 6-digit OTP generation using kernel entropy (CWE-330)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins validity

    otpStore.set(key, { otp, expiresAt, attempts: 0 });
    console.log(`[REAL EMAIL DISPATCH] 📩 Sending 6-digit OTP code to ${email}...`);

    await sendTemplatedEmail({
      to: email,
      templateId: 'otp_verification',
      templateData: {
        otp: otp
      },
      fallbackSubject: `🔑 Your Verification Code: ${otp} - Evalnium Portal`,
      fallbackHeading: 'Confirm Your Candidate Account',
      fallbackBody: `Dear Candidate,\n\nYour one-time security code to verify your Evalnium account is:\n\n{{otp}}\n\nThis code will expire in 5 minutes. If you did not initiate this request, please ignore this email.`
    });

    res.json({
      success: true,
      message: 'Verification OTP code dispatched to candidate email address.',
    });
  } catch (err) {
    console.error('❌ Error sending OTP email via Gmail SMTP:', err);
    res.status(500).json({ error: `Gmail SMTP Error: ${err.message || 'Failed to send OTP'}` });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const key = email.toLowerCase().trim();
    const record = otpStore.get(key);
    if (!record) {
      return res.status(400).json({ error: 'No OTP found or expired. Please request a new code.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
    }

    // Enforce brute-force attempt quota: maximum 5 attempts per OTP code (CWE-307)
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > 5) {
      otpStore.delete(key);
      return res.status(429).json({
        error: 'Too many failed verification attempts. For your security, this verification code has been revoked. Please request a new code.'
      });
    }

    // Constant-time timing-safe comparison preventing timing attacks (CWE-208)
    const isMatch = safeCompareOtp(record.otp, otp);
    if (!isMatch) {
      const remaining = 5 - record.attempts;
      if (remaining <= 0) {
        otpStore.delete(key);
        return res.status(429).json({
          error: 'Too many failed verification attempts. This verification code has been revoked. Please request a new code.'
        });
      }
      return res.status(400).json({
        error: `Incorrect OTP code entered. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    // OTP Verified successfully! Issue short-lived verification token for register / reset-password
    otpStore.delete(key);
    const verificationToken = issueVerifiedEmailToken(key);
    res.json({ success: true, message: 'OTP verified successfully!', verificationToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --- USER AUTHENTICATION ENDPOINTS ---
const userCheckLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many account lookup requests. Please wait a few minutes.'
});

app.get('/api/users/check', userCheckLimiter, async (req, res) => {
  try {
    const email = req.query.email?.toString().toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const [rows] = await pool.query('SELECT uid FROM users WHERE email = ?', [email]);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate Limiter: Maximum 5 account registrations per 15 minutes per IP (CWE-307)
const candidateRegistrationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many account registrations from this network. Please wait 15 minutes before creating another account.'
});

app.post('/api/users/register', candidateRegistrationLimiter, async (req, res) => {
  try {
    const {
      name,
      email,
      uid,
      password,
      verificationToken,
      phone,
      gender,
      occupation_status,
      designation,
      university_institute,
      city,
      address,
      target_exam,
      termsAccepted
    } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required fields.' });
    }

    if (!termsAccepted) {
      return res.status(400).json({ error: 'Please accept the Terms & Conditions and Privacy Policy to create an account.' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Mobile / Phone number is compulsory for registration.' });
    }

    if (!city || !city.trim()) {
      return res.status(400).json({ error: 'City is compulsory for exam center & regional test allocation.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Require cryptographic server-side proof of Email OTP verification before creating or updating any account
    if (!consumeVerifiedEmailToken(verificationToken, normalizedEmail)) {
      recordAuditLog({
        eventType: 'security_alert',
        severity: 'warning',
        actorName: name.trim(),
        actorEmail: normalizedEmail,
        actorRole: 'anonymous',
        actionTitle: `🚨 Unverified Registration Attempt Blocked: ${normalizedEmail}`,
        detailsText: 'Attempted /api/users/register without a valid server-issued Email OTP verification token.',
        ipAddress: req.ip || '127.0.0.1'
      });
      return res.status(403).json({
        error: 'Email verification required. Please verify your Email OTP before creating an account.'
      });
    }

    // Prevent overwriting an already-registered passworded account via /register
    const [existingRows] = await pool.query('SELECT uid, password_hash FROM users WHERE email = ?', [normalizedEmail]);
    if (existingRows.length > 0 && existingRows[0].password_hash) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please sign in or use Forgot Password.'
      });
    }

    const serverUid = existingRows.length > 0
      ? existingRows[0].uid
      : (uid || `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);

    const createdAt = new Date().toISOString();

    // Hash the password securely
    const passwordHash = await bcrypt.hash(password, 10);

    const safeOccupation = occupation_status || 'Student';
    const safeGender = gender || 'Prefer not to say';
    const safeDesignation = designation ? designation.trim() : null;
    const safeInstitute = university_institute ? university_institute.trim() : (req.body.institution ? req.body.institution.trim() : null);
    const safeCity = city.trim();
    const safeAddress = address ? address.trim() : null;
    const safeTargetExam = target_exam ? target_exam.trim() : 'General / LIS';

    if (existingRows.length > 0) {
      await pool.query(
        `UPDATE users SET
          name = ?, phone = ?, institution = ?, gender = ?, occupation_status = ?,
          designation = ?, university_institute = ?, city = ?, address = ?, target_exam = ?,
          is_verified = 1, password_hash = ?, terms_accepted_at = COALESCE(terms_accepted_at, ?)
         WHERE email = ?`,
        [
          name.trim(),
          phone.trim(),
          safeInstitute,
          safeGender,
          safeOccupation,
          safeDesignation,
          safeInstitute,
          safeCity,
          safeAddress,
          safeTargetExam,
          passwordHash,
          createdAt,
          normalizedEmail
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO users (
          uid, name, email, role, phone, institution, gender, occupation_status, designation, university_institute, city, address, target_exam, is_verified, created_at, password_hash, terms_accepted_at
        ) VALUES (?, ?, ?, 'candidate', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          serverUid,
          name.trim(),
          normalizedEmail,
          phone.trim(),
          safeInstitute,
          safeGender,
          safeOccupation,
          safeDesignation,
          safeInstitute,
          safeCity,
          safeAddress,
          safeTargetExam,
          createdAt,
          passwordHash,
          createdAt
        ]
      );
    }

    // Fetch the actual user record to get their real UID (in case it was an existing user)
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    const user = rows[0];

    // Set Cryptographically Signed HTTP-Only session cookie (CWE-565 / CWE-614)
    res.cookie('evalnium_session', JSON.stringify({ uid: user.uid, email: user.email }), {
      httpOnly: true,
      secure: isHttpsRequest(req),
      sameSite: 'lax',
      signed: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    res.clearCookie('evalnium_admin_session');

    recordAuditLog({
      eventType: 'user_register',
      severity: 'success',
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role || 'candidate',
      actionTitle: `👤 Candidate Registration: ${user.name} (${user.email})`,
      detailsText: `New candidate profile created. Category: ${user.occupation_status}, City: ${user.city}, Institute: ${user.university_institute || 'N/A'}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        gender: user.gender,
        occupationStatus: user.occupation_status,
        designation: user.designation,
        universityInstitute: user.university_institute,
        city: user.city,
        address: user.address,
        targetExam: user.target_exam
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate Limiter: Maximum 10 candidate login attempts per 15 minutes per IP (CWE-307)
const candidateLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many candidate login attempts from this network. Please wait 15 minutes before retrying.'
});

app.post('/api/users/login', candidateLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const normalizedEmail = email.toLowerCase().trim();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found. Please create an account first.' });
    }

    const user = rows[0];

    // Handle old users who don't have a password set yet
    if (!user.password_hash) {
      return res.status(403).json({ error: 'Your account does not have a password set yet. Please use the "Create Account" tab to verify your email and create a password. (Your existing exam history will be preserved).' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password entered.' });
    }

    // Set Cryptographically Signed HTTP-Only session cookie (CWE-565 / CWE-614)
    res.cookie('evalnium_session', JSON.stringify({ uid: user.uid, email: user.email }), {
      httpOnly: true,
      secure: isHttpsRequest(req),
      sameSite: 'lax',
      signed: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    res.clearCookie('evalnium_admin_session');

    recordAuditLog({
      eventType: 'user_login',
      severity: 'info',
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role || 'student',
      actionTitle: `🔑 User Login: ${user.name} signed into student portal`,
      detailsText: `Authenticated via secure password verification. Target Exam: ${user.target_exam || 'General'}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      targetExam: user.target_exam,
      phone: user.phone,
      institution: user.institution,
      gender: user.gender,
      occupationStatus: user.occupation_status,
      designation: user.designation,
      universityInstitute: user.university_institute,
      city: user.city,
      address: user.address,
      createdAt: user.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many password reset attempts. Please wait 15 minutes before retrying.'
});

app.post('/api/users/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { email, otp, verificationToken, newPassword } = req.body;
    if (!email || !newPassword || (!otp && !verificationToken)) {
      return res.status(400).json({ error: 'Email, verification proof, and new password are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if account exists
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found. Please create an account.' });
    }

    // Verify either short-lived server verificationToken (already issued by /verify-otp) or raw OTP
    const tokenValid = verificationToken ? consumeVerifiedEmailToken(verificationToken, normalizedEmail) : false;

    if (!tokenValid) {
      if (!otp) {
        return res.status(400).json({ error: 'Verification token expired or missing. Please request a new OTP.' });
      }
      const record = otpStore.get(normalizedEmail);
      if (!record) {
        return res.status(400).json({ error: 'No OTP found or expired. Please request a new code.' });
      }
      if (Date.now() > record.expiresAt) {
        otpStore.delete(normalizedEmail);
        return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
      }

      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts > 5) {
        otpStore.delete(normalizedEmail);
        return res.status(429).json({
          error: 'Too many failed verification attempts. This verification code has been revoked. Please request a new code.'
        });
      }

      const isMatch = safeCompareOtp(record.otp, otp);
      if (!isMatch) {
        const remaining = 5 - record.attempts;
        if (remaining <= 0) {
          otpStore.delete(normalizedEmail);
          return res.status(429).json({
            error: 'Too many failed verification attempts. This verification code has been revoked. Please request a new code.'
          });
        }
        return res.status(400).json({
          error: `Incorrect OTP code entered. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        });
      }
      otpStore.delete(normalizedEmail);
    }

    // Verification succeeded! Hash new password and save
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, normalizedEmail]);

    res.json({ success: true, message: 'Password reset successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SESSION COOKIES CORE ROUTING ---
// Rate Limiter: Maximum 5 login attempts per 15 minutes per IP
const adminLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many administrative login attempts. Please wait 15 minutes before retrying.'
});

// Admin Login passcode verification endpoint (sets 5-day httpOnly cookie)
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  try {
    const { passcode } = req.body;
    if (!passcode) return res.status(400).json({ error: 'Passcode is required' });

    const expectedPasscode = process.env.ADMIN_PASSCODE;
    if (!expectedPasscode) {
      return res.status(503).json({ error: 'Admin passcode is not configured on the server.' });
    }

    if (safeCompareSecret(passcode, expectedPasscode)) {
      res.cookie('evalnium_admin_session', 'true', {
        httpOnly: true,
        secure: isHttpsRequest(req),
        sameSite: 'lax',
        signed: true,
        maxAge: 5 * 24 * 60 * 60 * 1000 // 5 days
      });
      return res.json({ success: true });
    }

    recordAuditLog({
      eventType: 'security_alert',
      severity: 'warning',
      actorName: 'Admin Login Gate',
      actorRole: 'anonymous',
      actionTitle: '🚨 Failed Admin Studio Passcode Attempt',
      detailsText: 'An invalid administrative passcode was submitted to /api/admin/login.',
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(401).json({ error: 'Incorrect passcode entered.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Universal Administrative Route Perimeter Guard
// Protects all subsequent /api/admin/* endpoints while keeping /api/admin/login public
app.use('/api/admin', authenticateAdmin);

// RESTORE session details from browser HTTP cookies
app.get('/api/users/me', async (req, res) => {
  try {
    const sessionCookie = req.signedCookies?.evalnium_session;
    const adminCookie = req.signedCookies?.evalnium_admin_session;

    let currentUser = null;
    let isAdminAuthenticated = false;

    if (adminCookie === 'true') {
      isAdminAuthenticated = true;
    }

    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie);
        const [rows] = await pool.query(
          `SELECT 
            uid, name, email, role, 
            target_exam as targetExam, phone, institution, 
            gender, occupation_status as occupationStatus, designation, university_institute as universityInstitute, city, address, 
            created_at as createdAt 
           FROM users WHERE uid = ?`,
          [session.uid]
        );
        if (rows.length > 0) {
          currentUser = rows[0];
          if (isAdminAuthenticated) {
            currentUser.role = 'admin';
          }
        }
      } catch (parseErr) {
        console.error('Failed to parse session cookie:', parseErr.message);
      }
    }

    res.json({
      currentUser,
      isAdminAuthenticated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CLEAR both candidate & admin sessions on sign out
app.post('/api/users/logout', (req, res) => {
  try {
    const clientId = req.body?.clientId;
    if (clientId) {
      activeVisitors.delete(clientId);
    }
    res.clearCookie('evalnium_session');
    res.clearCookie('evalnium_admin_session');
    res.clearCookie('evalnium_unlocked_quizzes');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all users (for admin only - CWE-200 / CWE-306)
app.get('/api/users', authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        uid, name, email, role, target_exam, phone, institution,
        gender, occupation_status, designation, university_institute, city, address, created_at 
      FROM users ORDER BY created_at DESC
    `);
    res.json(rows.map(u => ({
      uid: u.uid,
      name: u.name,
      email: u.email,
      role: u.role,
      targetExam: u.target_exam,
      phone: u.phone,
      institution: u.institution,
      gender: u.gender,
      occupationStatus: u.occupation_status,
      designation: u.designation,
      universityInstitute: u.university_institute,
      city: u.city,
      address: u.address,
      createdAt: u.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a user and their test results (admin only)
app.delete('/api/users/:uid', authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT uid, name, email FROM users WHERE uid = ?', [req.params.uid]);
    if (rows.length > 0) {
      const { name, email } = rows[0];
      await pool.query('DELETE FROM users WHERE uid = ?', [req.params.uid]);
      if (email) {
        await pool.query('DELETE FROM results WHERE candidate_email = ?', [email]);
      }
      if (name) {
        await pool.query('DELETE FROM results WHERE candidate_name = ?', [name]);
      }
    } else {
      await pool.query('DELETE FROM users WHERE uid = ?', [req.params.uid]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger manual sync of legacy candidates to users table (Admin Only - SEC-01)
app.post('/api/users/sync', authenticateAdmin, async (req, res) => {
  try {
    await syncCandidatesToUsersTable();
    res.json({ success: true, message: 'Candidates synced successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Endpoints

// Simple memory store for live exam sessions
const activeSessions = new Map();
const activeVisitors = new Map();

// Clear stale sessions and visitors
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of activeSessions.entries()) {
    if (now - session.lastSeen > 2 * 60 * 1000) { // 2 minutes timeout
      activeSessions.delete(key);
    }
  }
  for (const [key, visitor] of activeVisitors.entries()) {
    if (now - visitor.lastSeen > 40 * 1000) { // 40 seconds timeout
      activeVisitors.delete(key);
    }
  }
}, 30 * 1000);

function getAuthenticatedCandidate(req) {
  const raw = req.signedCookies?.evalnium_session;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.uid && parsed.email) return parsed;
  } catch { }
  return null;
}

function getUnlockedQuizIds(req) {
  const raw = req.signedCookies?.evalnium_unlocked_quizzes;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 1. Quizzes (with Granular Admin Settings & Rules)
app.get('/api/quizzes', async (req, res) => {
  try {
    const isAdmin = isAdminAuthenticatedRequest(req);
    const authenticatedCandidate = getAuthenticatedCandidate(req);

    // Non-admin candidates can only see published quizzes; admins see drafts and published quizzes
    const quizQuery = isAdmin
      ? 'SELECT * FROM quizzes ORDER BY created_at DESC'
      : 'SELECT * FROM quizzes WHERE is_published = 1 ORDER BY created_at DESC';

    const [quizRows] = await pool.query(quizQuery);

    const quizzes = [];
    for (const q of quizRows) {
      let allowedList = null;
      try {
        allowedList = q.allowed_emails ? JSON.parse(q.allowed_emails) : null;
      } catch {
        allowedList = null;
      }

      // Enforce invite-only allowedEmails server-side so unauthorized callers cannot pull restricted papers
      if (!isAdmin && Array.isArray(allowedList) && allowedList.length > 0) {
        const callerEmail = authenticatedCandidate?.email?.toLowerCase().trim() || '';
        const isAllowed = callerEmail && allowedList.some((e) => String(e).toLowerCase().trim() === callerEmail);
        if (!isAllowed) {
          continue;
        }
      }

      const isPractice = Boolean(q.enable_practice_mode);
      // Determine if questions should expose answer keys and rationale
      // Admin always has access; non-admins only get answers/explanations if practice mode is explicitly active
      const canExposeSolutions = isAdmin || isPractice;

      // Do not leak question banks for locked (accessCode) or not-yet-started scheduled exams
      const unlockedIds = getUnlockedQuizIds(req);
      const isPasscodeUnlocked = !q.access_code || unlockedIds.includes(q.id);
      const isScheduleStarted = !q.scheduled_start_datetime || Date.now() >= new Date(q.scheduled_start_datetime).getTime();
      const canExposeQuestions = isAdmin || (isPasscodeUnlocked && isScheduleStarted);

      const [qRows] = await pool.query('SELECT * FROM questions WHERE quiz_id = ?', [q.id]);
      const questionCount = qRows.length;
      const questions = [];
      if (canExposeQuestions) {
        for (const quest of qRows) {
          const [optRows] = await pool.query('SELECT option_letter as id, option_text as text FROM options WHERE question_id = ? ORDER BY option_letter ASC', [quest.id]);
          questions.push({
            id: quest.id,
            questionText: quest.question_text,
            questionEnglish: quest.question_english,
            questionHindi: quest.question_hindi,
            correctOptionId: canExposeSolutions ? quest.correct_option_id : undefined,
            explanation: canExposeSolutions ? quest.explanation : undefined,
            explanationEnglish: canExposeSolutions ? quest.explanation_english : undefined,
            explanationHindi: canExposeSolutions ? quest.explanation_hindi : undefined,
            topic: quest.topic,
            marks: quest.marks,
            questionType: quest.question_type || 'mcq',
            imageUrl: quest.image_url || undefined,
            listI: JSON.parse(quest.list_i_json || '[]'),
            listII: JSON.parse(quest.list_ii_json || '[]'),
            correctOptionIds: canExposeSolutions ? JSON.parse(quest.correct_option_ids_json || '[]') : undefined,
            options: optRows,
          });
        }
      }

      quizzes.push({
        id: q.id,
        title: q.title,
        description: q.description,
        topic: q.topic,
        category: q.category,
        difficulty: q.difficulty || 'Medium',
        timeLimitMinutes: q.time_limit_minutes,
        passingPercentage: q.passing_percentage,
        negativeMarks: q.negative_marks,
        quizType: q.quiz_type,
        scheduledStartDateTime: q.scheduled_start_datetime,
        scheduledEndDateTime: q.scheduled_end_datetime,
        isPublished: Boolean(q.is_published),
        createdAt: q.created_at,
        updatedAt: q.updated_at,
        author: q.author,
        enableCertificate: Boolean(q.enable_certificate),
        enableAntiCheating: Boolean(q.enable_anti_cheating),
        timingMode: q.timing_mode || 'quiz',
        sectionalConfig: JSON.parse(q.sectional_config_json || '[]'),
        questionTimeLimitSeconds: q.question_time_limit_seconds || 60,
        preventPreviousSectionReturn: Boolean(q.prevent_prev_section),
        preventEarlyNextSection: Boolean(q.prevent_early_next_section),
        preventPreviousQuestionReturn: Boolean(q.prevent_prev_question),
        preventEarlyNextQuestion: Boolean(q.prevent_early_next_question),
        shuffleQuestions: q.shuffle_questions !== undefined ? Boolean(q.shuffle_questions) : true,
        shuffleOptions: q.shuffle_options !== undefined ? Boolean(q.shuffle_options) : true,
        enablePracticeMode: Boolean(q.enable_practice_mode),
        defaultLanguageMode: q.default_language_mode || 'en',
        hasAccessCode: Boolean(q.access_code),
        accessCode: isAdmin ? (q.access_code || undefined) : undefined,
        allowedEmails: isAdmin ? (allowedList || undefined) : undefined,
        questionViewMode: q.question_view_mode || 'both',
        maxAttempts: q.max_attempts || 0,
        allowManualEarlyMove: Boolean(q.allow_manual_early_move),
        maxTabSwitches: q.max_tab_switches || 3,
        resultAnnouncementDateTime: q.result_announcement_datetime || undefined,
        questionCount,
        questions,
      });
    }

    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const quizAccessLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many exam passcode attempts. Please wait 15 minutes before retrying.'
});

app.post('/api/quizzes/:id/verify-access', quizAccessLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { passcode } = req.body || {};
    const [rows] = await pool.query('SELECT id, access_code, is_published FROM quizzes WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found.' });
    }
    const quiz = rows[0];
    if (!quiz.is_published && !isAdminAuthenticatedRequest(req)) {
      return res.status(404).json({ error: 'Exam not found.' });
    }
    if (!quiz.access_code) {
      return res.json({ success: true, verified: true });
    }
    if (!passcode || !safeCompareSecret(String(passcode), String(quiz.access_code))) {
      return res.status(403).json({ error: 'Incorrect Passcode. Please try again.' });
    }

    const existingUnlocked = getUnlockedQuizIds(req).filter((qid) => qid !== id);
    const updatedUnlocked = [...existingUnlocked, id].slice(-50);
    res.cookie('evalnium_unlocked_quizzes', JSON.stringify(updatedUnlocked), {
      httpOnly: true,
      secure: isHttpsRequest(req),
      sameSite: 'lax',
      signed: true,
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });
    return res.json({ success: true, verified: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quizzes', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    const q = req.body;
    const normalizedTopic = String(q.topic || 'General').replace(/\s+/g, ' ').trim();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Insert or update quiz
    await connection.query(
      `INSERT INTO quizzes (
        id, title, description, topic, category, difficulty, time_limit_minutes, passing_percentage, negative_marks, quiz_type, is_published, created_at, updated_at, author,
        enable_certificate, enable_anti_cheating, timing_mode, sectional_config_json, question_time_limit_seconds, prevent_prev_section, prevent_early_next_section, prevent_prev_question, prevent_early_next_question,
        shuffle_questions, shuffle_options, enable_practice_mode, default_language_mode, access_code, allowed_emails, question_view_mode, max_attempts, allow_manual_early_move, result_announcement_datetime, max_tab_switches
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        title=?, description=?, topic=?, category=?, difficulty=?, time_limit_minutes=?, passing_percentage=?, negative_marks=?, quiz_type=?, is_published=?, updated_at=?,
        enable_certificate=?, enable_anti_cheating=?, timing_mode=?, sectional_config_json=?, question_time_limit_seconds=?, prevent_prev_section=?, prevent_early_next_section=?, prevent_prev_question=?, prevent_early_next_question=?,
        shuffle_questions=?, shuffle_options=?, enable_practice_mode=?, default_language_mode=?, access_code=?, allowed_emails=?, question_view_mode=?, max_attempts=?, allow_manual_early_move=?, result_announcement_datetime=?, max_tab_switches=?`,
      [
        q.id, q.title, q.description, normalizedTopic, q.category || 'General', q.difficulty || 'Medium', q.timeLimitMinutes, q.passingPercentage, q.negativeMarks, q.quizType || 'practice', q.isPublished ? 1 : 0, q.createdAt, q.updatedAt, q.author || 'Admin',
        q.enableCertificate !== false ? 1 : 0, q.enableAntiCheating ? 1 : 0, q.timingMode || 'quiz', JSON.stringify(q.sectionalConfig || []), q.questionTimeLimitSeconds || 60, q.preventPreviousSectionReturn ? 1 : 0, q.preventEarlyNextSection ? 1 : 0, q.preventPreviousQuestionReturn ? 1 : 0, q.preventEarlyNextQuestion ? 1 : 0,
        q.shuffleQuestions !== false ? 1 : 0, q.shuffleOptions !== false ? 1 : 0, q.enablePracticeMode ? 1 : 0, q.defaultLanguageMode || 'en', q.accessCode || null, q.allowedEmails ? JSON.stringify(q.allowedEmails) : null, q.questionViewMode || 'both', q.maxAttempts || 0, q.allowManualEarlyMove ? 1 : 0, q.resultAnnouncementDateTime || null, q.maxTabSwitches || 3,

        q.title, q.description, normalizedTopic, q.category || 'General', q.difficulty || 'Medium', q.timeLimitMinutes, q.passingPercentage, q.negativeMarks, q.quizType || 'practice', q.isPublished ? 1 : 0, q.updatedAt,
        q.enableCertificate !== false ? 1 : 0, q.enableAntiCheating ? 1 : 0, q.timingMode || 'quiz', JSON.stringify(q.sectionalConfig || []), q.questionTimeLimitSeconds || 60, q.preventPreviousSectionReturn ? 1 : 0, q.preventEarlyNextSection ? 1 : 0, q.preventPreviousQuestionReturn ? 1 : 0, q.preventEarlyNextQuestion ? 1 : 0,
        q.shuffleQuestions !== false ? 1 : 0, q.shuffleOptions !== false ? 1 : 0, q.enablePracticeMode ? 1 : 0, q.defaultLanguageMode || 'en', q.accessCode || null, q.allowedEmails ? JSON.stringify(q.allowedEmails) : null, q.questionViewMode || 'both', q.maxAttempts || 0, q.allowManualEarlyMove ? 1 : 0, q.resultAnnouncementDateTime || null, q.maxTabSwitches || 3
      ]
    );

    // Keep historical scorecard subjects/titles synced with updated quiz metadata
    await connection.query(
      'UPDATE results SET topic = ?, quiz_title = ? WHERE quiz_id = ?',
      [normalizedTopic, q.title, q.id]
    );

    // Replace questions
    await connection.query('DELETE FROM questions WHERE quiz_id = ?', [q.id]);
    for (const quest of q.questions) {
      await connection.query(
        `INSERT INTO questions (
          id, quiz_id, question_text, question_english, question_hindi, correct_option_id, explanation, explanation_english, explanation_hindi, topic, marks,
          question_type, image_url, list_i_json, list_ii_json, correct_option_ids_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quest.id, q.id, quest.questionText, quest.questionEnglish, quest.questionHindi, quest.correctOptionId, quest.explanation, quest.explanationEnglish, quest.explanationHindi, quest.topic || q.topic, quest.marks || 1,
          quest.questionType || 'mcq', quest.imageUrl || null, JSON.stringify(quest.listI || []), JSON.stringify(quest.listII || []), JSON.stringify(quest.correctOptionIds || [quest.correctOptionId || 'A'])
        ]
      );

      for (const opt of quest.options) {
        await connection.query(
          `INSERT INTO options (question_id, option_letter, option_text) VALUES (?, ?, ?)`,
          [quest.id, opt.id, opt.text]
        );
      }
    }

    await connection.commit();

    recordAuditLog({
      eventType: 'admin_action',
      severity: 'info',
      actorName: 'Admin',
      actorRole: 'admin',
      actionTitle: `🛠️ Quiz Saved: "${q.title}" (${q.questions?.length || 0} questions)`,
      detailsText: `Category: ${q.category}, Time Limit: ${q.timeLimitMinutes}m, Pass: ${q.passingPercentage}%`,
      ipAddress: req.ip || '127.0.0.1'
    });

    // 4. Automatic Email Notification Trigger on New Exam Publish
    if (q.notifyCandidates) {
      (async () => {
        try {
          const [candidateRows] = await pool.query(
            `SELECT DISTINCT email, name 
             FROM users 
             WHERE email IS NOT NULL 
               AND email != '' 
               AND email NOT LIKE '%@evalnium.app'`
          );
          console.log(`[EXAM ALERT] 📢 Notifying ${candidateRows.length} candidates about new assessment: "${q.title}"`);

          for (const cand of candidateRows) {
            try {
              await sendTemplatedEmail({
                to: cand.email,
                templateId: 'new_exam_alert',
                templateData: {
                  candidate_name: cand.name || 'Candidate',
                  quiz_title: q.title,
                  question_count: q.questions?.length || 0,
                  duration_minutes: q.timeLimitMinutes || 15,
                  quiz_id: q.id
                }
              });
              // 50ms cooldown between dispatches to maintain clean SMTP connection health
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (candErr) {
              console.error(`Failed to dispatch new exam alert to ${cand.email}:`, candErr.message);
            }
          }
        } catch (fetchErr) {
          console.error('Failed to query candidate list for new exam alert:', fetchErr.message);
        }
      })();
    }


    res.json({ success: true });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.delete('/api/quizzes/:id', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM quizzes WHERE id = ?', [req.params.id]);

    recordAuditLog({
      eventType: 'admin_action',
      severity: 'warning',
      actorName: 'Admin',
      actorRole: 'admin',
      actionTitle: `🗑️ Quiz Deleted (ID: ${req.params.id})`,
      detailsText: `Quiz ${req.params.id} permanently removed from database.`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Live Sessions Tracking ---
app.post('/api/sessions/heartbeat', (req, res) => {
  const { quizId, quizTitle, candidateName, candidateEmail, timeRemaining, percentageComplete } = req.body;
  if (!quizId || !candidateName) return res.status(400).json({ error: 'Missing required fields' });

  const authenticatedCandidate = getAuthenticatedCandidate(req);
  const verifiedEmail = authenticatedCandidate?.email || candidateEmail;
  const sessionKey = `${quizId}_${verifiedEmail || candidateName}`;
  const isNewSession = !activeSessions.has(sessionKey);

  activeSessions.set(sessionKey, {
    quizId,
    quizTitle: quizTitle || 'CBT Exam',
    candidateName,
    candidateEmail: verifiedEmail,
    timeRemaining,
    percentageComplete,
    lastSeen: Date.now()
  });

  if (isNewSession) {
    recordAuditLog({
      eventType: 'exam_start',
      severity: 'info',
      actorName: candidateName,
      actorEmail: verifiedEmail || null,
      actorRole: 'student',
      actionTitle: `📝 Exam Started: ${candidateName} initiated "${quizTitle || 'CBT Exam'}"`,
      detailsText: `Candidate launched exam session. Initial time remaining: ${timeRemaining || 'standard'}.`,
      ipAddress: req.ip || '127.0.0.1'
    });
  }

  res.json({ success: true });
});

app.get('/api/sessions/live', authenticateAdmin, (req, res) => {
  const sessions = Array.from(activeSessions.values());
  res.json(sessions);
});

// --- Global Page Visits & Online User Heartbeats ---
app.post('/api/site/visit', async (req, res) => {
  try {
    let ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    if (ip.substr(0, 7) === "::ffff:") {
      ip = ip.substr(7);
    }
    const today = new Date().toISOString().slice(0, 10);

    await pool.query(
      `INSERT IGNORE INTO site_visits (ip_address, visited_date) VALUES (?, ?)`,
      [ip, today]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseUserAgent(uaString) {
  if (!uaString) return { browser: 'Chrome', os: 'Windows', deviceType: 'Desktop' };

  let browser = 'Chrome';
  if (uaString.includes('Firefox')) browser = 'Firefox';
  else if (uaString.includes('Edg/')) browser = 'Microsoft Edge';
  else if (uaString.includes('Safari') && !uaString.includes('Chrome')) browser = 'Safari';
  else if (uaString.includes('OPR') || uaString.includes('Opera')) browser = 'Opera';

  let os = 'Windows';
  let deviceType = 'Desktop';
  if (uaString.includes('Windows')) os = 'Windows';
  else if (uaString.includes('Android')) { os = 'Android'; deviceType = 'Mobile'; }
  else if (uaString.includes('iPhone') || uaString.includes('iPad')) { os = 'iOS'; deviceType = uaString.includes('iPad') ? 'Tablet' : 'Mobile'; }
  else if (uaString.includes('Macintosh') || uaString.includes('Mac OS')) os = 'macOS';
  else if (uaString.includes('Linux')) os = 'Linux';

  return { browser, os, deviceType };
}

app.post('/api/site/heartbeat', async (req, res) => {
  try {
    const { clientId, name, email, role, isRegistered, currentPage, clientCountry } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId required' });

    const isPureAdminBrowser =
      role === 'admin' ||
      (req.signedCookies?.evalnium_admin_session === 'true' && !req.signedCookies?.evalnium_session);

    const nowMs = Date.now();

    // Never track an active Administrator session as an online candidate/visitor
    if (isPureAdminBrowser) {
      activeVisitors.delete(clientId);
      const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM site_visits');
      const liveCandidateCount = Array.from(activeVisitors.values()).filter(
        v => v.role !== 'admin' && (nowMs - v.lastSeen < 45000)
      ).length;
      return res.json({
        success: true,
        totalVisitors: total,
        activeVisitorsCount: liveCandidateCount
      });
    }

    const authenticatedCandidate = getAuthenticatedCandidate(req);
    const verifiedEmail = authenticatedCandidate?.email || (isAdminAuthenticatedRequest(req) ? (email || null) : null);
    const verifiedRegistered = Boolean(authenticatedCandidate) || (isAdminAuthenticatedRequest(req) ? Boolean(isRegistered) : false);

    let rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    if (rawIp.substr(0, 7) === "::ffff:") {
      rawIp = rawIp.substr(7);
    }
    if (rawIp === '::1') rawIp = '127.0.0.1';

    const userAgentStr = req.headers['user-agent'] || '';
    const { browser, os, deviceType } = parseUserAgent(userAgentStr);
    const country = clientCountry || (rawIp.startsWith('10.') || rawIp.startsWith('192.168.') || rawIp.startsWith('127.') ? 'Local Network (India)' : 'India');
    const nowIso = new Date().toISOString();

    activeVisitors.set(clientId, {
      name: name || 'Guest Candidate',
      email: verifiedEmail,
      role: role === 'admin' && isAdminAuthenticatedRequest(req) ? 'admin' : (authenticatedCandidate ? 'candidate' : 'guest'),
      isRegistered: verifiedRegistered,
      ip: rawIp,
      country: country,
      browser: browser,
      os: os,
      deviceType: deviceType,
      currentPage: currentPage || 'Exam Portal',
      lastSeen: nowMs
    });

    // Save or Update in visitor_logs table in MySQL
    await pool.query(
      `INSERT INTO visitor_logs (
        session_id, ip_address, country, candidate_name, candidate_email, is_registered,
        browser, os, device_type, current_page, first_seen, last_seen, visit_count, duration_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
      ON DUPLICATE KEY UPDATE
        ip_address = VALUES(ip_address),
        country = VALUES(country),
        candidate_name = IF(VALUES(candidate_name) NOT IN ('Guest Candidate', 'Anonymous Guest', ''), VALUES(candidate_name), visitor_logs.candidate_name),
        candidate_email = IF(VALUES(candidate_email) IS NOT NULL AND VALUES(candidate_email) != '', VALUES(candidate_email), visitor_logs.candidate_email),
        is_registered = IF(VALUES(is_registered) = 1, 1, visitor_logs.is_registered),
        browser = VALUES(browser),
        os = VALUES(os),
        device_type = VALUES(device_type),
        current_page = VALUES(current_page),
        last_seen = VALUES(last_seen),
        visit_count = IFNULL(visitor_logs.visit_count, 0) + 1,
        duration_seconds = GREATEST(0, IFNULL(TIMESTAMPDIFF(SECOND, STR_TO_DATE(SUBSTRING(visitor_logs.first_seen, 1, 19), '%Y-%m-%dT%T'), STR_TO_DATE(SUBSTRING(VALUES(last_seen), 1, 19), '%Y-%m-%dT%T')), 0))`,
      [
        clientId, rawIp, country, name || 'Guest Candidate', verifiedEmail, verifiedRegistered ? 1 : 0,
        browser, os, deviceType, currentPage || 'Exam Portal', nowIso, nowIso
      ]
    );

    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM site_visits');
    const liveCandidateCount = Array.from(activeVisitors.values()).filter(
      v => v.role !== 'admin' && (nowMs - v.lastSeen < 45000)
    ).length;
    res.json({
      success: true,
      totalVisitors: total,
      activeVisitorsCount: liveCandidateCount
    });
  } catch (err) {
    res.json({
      success: true,
      totalVisitors: 0,
      activeVisitorsCount: Array.from(activeVisitors.values()).filter(v => v.role !== 'admin').length
    });
  }
});

// Visitor Intelligence Logs & Real-Time Radar with Comprehensive Historical Analytics
app.get('/api/admin/visitors', async (req, res) => {
  try {
    const range = req.query.range || 'all';
    const now = new Date();

    // Start of today in local/UTC
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const yesterdayEnd = todayStart;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    let whereClause = '';
    let whereParams = [];

    if (range === 'today') {
      whereClause = 'WHERE last_seen >= ?';
      whereParams = [todayStart];
    } else if (range === 'yesterday') {
      whereClause = 'WHERE last_seen >= ? AND last_seen < ?';
      whereParams = [yesterdayStart, yesterdayEnd];
    } else if (range === '7days') {
      whereClause = 'WHERE last_seen >= ?';
      whereParams = [sevenDaysAgo];
    } else if (range === '30days') {
      whereClause = 'WHERE last_seen >= ?';
      whereParams = [thirtyDaysAgo];
    }

    let logWhereClause = '';
    if (range === 'today') {
      logWhereClause = 'WHERE v.last_seen >= ?';
    } else if (range === 'yesterday') {
      logWhereClause = 'WHERE v.last_seen >= ? AND v.last_seen < ?';
    } else if (range === '7days') {
      logWhereClause = 'WHERE v.last_seen >= ?';
    } else if (range === '30days') {
      logWhereClause = 'WHERE v.last_seen >= ?';
    }

    const [rows] = await pool.query(`
      SELECT 
        v.*,
        COALESCE(ip_counts.ip_total_visits, 1) AS ip_total_visits,
        COALESCE(user_counts.user_total_visits, 0) AS user_total_visits
      FROM visitor_logs v
      LEFT JOIN (
        SELECT ip_address, COUNT(*) AS ip_total_visits 
        FROM visitor_logs 
        GROUP BY ip_address
      ) ip_counts ON v.ip_address = ip_counts.ip_address
      LEFT JOIN (
        SELECT candidate_email, COUNT(*) AS user_total_visits 
        FROM visitor_logs 
        WHERE candidate_email IS NOT NULL AND candidate_email != ''
        GROUP BY candidate_email
      ) user_counts ON v.candidate_email = user_counts.candidate_email
      ${logWhereClause}
      ORDER BY v.last_seen DESC 
      LIMIT 500
    `, whereParams);

    // Summary KPIs
    const [[summaryCounts]] = await pool.query(`
      SELECT 
        COUNT(*) as totalStoredSessions,
        SUM(IF(last_seen >= ?, 1, 0)) as todayCount,
        SUM(IF(last_seen >= ? AND last_seen < ?, 1, 0)) as yesterdayCount,
        SUM(IF(last_seen >= ?, 1, 0)) as last7DaysCount,
        SUM(IF(last_seen >= ?, 1, 0)) as last30DaysCount,
        SUM(IF(is_registered = 1, 1, 0)) as registeredTotal,
        SUM(IF(is_registered = 0, 1, 0)) as guestTotal,
        SUM(IF(device_type = 'Desktop', 1, 0)) as desktopTotal,
        SUM(IF(device_type IN ('Mobile', 'Tablet'), 1, 0)) as mobileTotal,
        AVG(duration_seconds) as avgDurationSeconds
      FROM visitor_logs
    `, [todayStart, yesterdayStart, yesterdayEnd, sevenDaysAgo, thirtyDaysAgo]);

    // 14-day daily traffic trend
    const [dailyTrend] = await pool.query(`
      SELECT 
        SUBSTRING(last_seen, 1, 10) as date,
        COUNT(*) as total,
        SUM(IF(is_registered = 1, 1, 0)) as registered,
        SUM(IF(is_registered = 0, 1, 0)) as guests
      FROM visitor_logs
      WHERE last_seen >= ?
      GROUP BY SUBSTRING(last_seen, 1, 10)
      ORDER BY date ASC
    `, [fourteenDaysAgo]);

    // Top Pages visited
    const [topPages] = await pool.query(`
      SELECT current_page as page, COUNT(*) as count 
      FROM visitor_logs 
      ${whereClause}
      GROUP BY current_page 
      ORDER BY count DESC 
      LIMIT 8
    `, whereParams);

    // Top Countries / Geographies
    const [topCountries] = await pool.query(`
      SELECT country, COUNT(*) as count 
      FROM visitor_logs 
      ${whereClause}
      GROUP BY country 
      ORDER BY count DESC 
      LIMIT 8
    `, whereParams);

    const nowMs = Date.now();
    const activeList = Array.from(activeVisitors.entries())
      .filter(([_, v]) => v.role !== 'admin' && nowMs - v.lastSeen < 45000)
      .map(([id, v]) => ({
        sessionId: id,
        ...v
      }));

    res.json({
      activeVisitors: activeList,
      recentVisitorLogs: rows.map(r => ({
        id: r.id,
        sessionId: r.session_id,
        ipAddress: r.ip_address,
        country: r.country,
        candidateName: r.candidate_name,
        candidateEmail: r.candidate_email,
        isRegistered: Boolean(r.is_registered),
        browser: r.browser,
        os: r.os,
        deviceType: r.device_type,
        currentPage: r.current_page,
        firstSeen: r.first_seen,
        lastSeen: r.last_seen,
        visitCount: r.visit_count || 1,
        ipTotalVisits: r.ip_total_visits || 1,
        userTotalVisits: r.user_total_visits || (r.is_registered ? 1 : 0),
        durationSeconds: r.duration_seconds || 0
      })),
      summary: {
        totalStoredSessions: summaryCounts?.totalStoredSessions || 0,
        todayCount: summaryCounts?.todayCount || 0,
        yesterdayCount: summaryCounts?.yesterdayCount || 0,
        last7DaysCount: summaryCounts?.last7DaysCount || 0,
        last30DaysCount: summaryCounts?.last30DaysCount || 0,
        registeredTotal: summaryCounts?.registeredTotal || 0,
        guestTotal: summaryCounts?.guestTotal || 0,
        desktopTotal: summaryCounts?.desktopTotal || 0,
        mobileTotal: summaryCounts?.mobileTotal || 0,
        avgDurationSeconds: Math.round(summaryCounts?.avgDurationSeconds || 0)
      },
      dailyTrend,
      topPages,
      topCountries
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Purge Old Visitor Telemetry Logs
app.delete('/api/admin/visitors/purge', authenticateAdmin, async (req, res) => {
  try {
    const { days } = req.query;
    if (days === 'all') {
      await pool.query('TRUNCATE TABLE visitor_logs');
      return res.json({ success: true, message: 'All visitor telemetry logs have been cleared successfully.' });
    }
    const daysNum = parseInt(days || '30', 10);
    const cutoffDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();
    const [result] = await pool.query('DELETE FROM visitor_logs WHERE last_seen < ?', [cutoffDate]);
    res.json({ success: true, deletedCount: result.affectedRows, message: `Purged logs older than ${daysNum} days.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 1.5 PERMANENT ACTIVITY AUDIT LOGS & ARCHIVE API
// ==========================================
app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '25', 10);
    const offset = Math.max(0, (page - 1) * limit);

    const { eventType, severity, range, year, search } = req.query;

    const whereConditions = [];
    const queryParams = [];

    // Filter by Event Type
    if (eventType && eventType !== 'all') {
      whereConditions.push('event_type = ?');
      queryParams.push(eventType);
    }

    // Filter by Severity
    if (severity && severity !== 'all') {
      whereConditions.push('severity = ?');
      queryParams.push(severity);
    }

    // Filter by Calendar Year (e.g. 2026, 2025, 2024)
    if (year && year !== 'all') {
      whereConditions.push('YEAR(created_at) = ?');
      queryParams.push(parseInt(year, 10));
    }

    // Filter by Date Range Preset
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const yesterdayEnd = todayStart;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    if (range === 'today') {
      whereConditions.push('created_at >= ?');
      queryParams.push(todayStart);
    } else if (range === 'yesterday') {
      whereConditions.push('created_at >= ? AND created_at < ?');
      queryParams.push(yesterdayStart, yesterdayEnd);
    } else if (range === '7days') {
      whereConditions.push('created_at >= ?');
      queryParams.push(sevenDaysAgo);
    } else if (range === '30days') {
      whereConditions.push('created_at >= ?');
      queryParams.push(thirtyDaysAgo);
    }

    // Keyword Search
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      whereConditions.push('(LOWER(actor_name) LIKE ? OR LOWER(actor_email) LIKE ? OR LOWER(action_title) LIKE ? OR LOWER(details_text) LIKE ? OR ip_address LIKE ?)');
      queryParams.push(q, q, q, q, q);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Total Count matching filters
    const [[{ totalCount }]] = await pool.query(
      `SELECT COUNT(*) as totalCount FROM activity_audit_logs ${whereClause}`,
      queryParams
    );

    // Fetch Paginated Logs
    const [rows] = await pool.query(
      `SELECT * FROM activity_audit_logs ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // Available Distinct Years in Vault
    const [yearRows] = await pool.query(`
      SELECT DISTINCT YEAR(created_at) as yr 
      FROM activity_audit_logs 
      WHERE created_at IS NOT NULL 
      ORDER BY yr DESC
    `);
    const availableYears = yearRows.map(r => r.yr).filter(Boolean);

    // Global Summary Counts across all logs
    const [[summaryCounts]] = await pool.query(`
      SELECT 
        COUNT(*) as totalStored,
        SUM(IF(severity = 'info', 1, 0)) as infoCount,
        SUM(IF(severity = 'success', 1, 0)) as successCount,
        SUM(IF(severity = 'warning', 1, 0)) as warningCount,
        SUM(IF(severity = 'danger', 1, 0)) as dangerCount,
        SUM(IF(event_type = 'exam_submit', 1, 0)) as examSubmitCount,
        SUM(IF(event_type = 'exam_start', 1, 0)) as examStartCount,
        SUM(IF(event_type = 'proctoring_alert', 1, 0)) as proctoringCount,
        SUM(IF(event_type IN ('user_login', 'user_register'), 1, 0)) as authCount
      FROM activity_audit_logs
    `);

    res.json({
      logs: rows.map(r => ({
        id: r.id,
        eventType: r.event_type,
        severity: r.severity,
        actorName: r.actor_name,
        actorEmail: r.actor_email,
        actorRole: r.actor_role,
        actionTitle: r.action_title,
        detailsText: r.details_text,
        ipAddress: r.ip_address,
        createdAt: r.created_at
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1
      },
      summary: {
        totalStored: summaryCounts?.totalStored || 0,
        infoCount: summaryCounts?.infoCount || 0,
        successCount: summaryCounts?.successCount || 0,
        warningCount: summaryCounts?.warningCount || 0,
        dangerCount: summaryCounts?.dangerCount || 0,
        examSubmitCount: summaryCounts?.examSubmitCount || 0,
        examStartCount: summaryCounts?.examStartCount || 0,
        proctoringCount: summaryCounts?.proctoringCount || 0,
        authCount: summaryCounts?.authCount || 0
      },
      availableYears
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Purge Old Activity Audit Logs
app.delete('/api/admin/audit-logs/purge', authenticateAdmin, async (req, res) => {
  try {
    const { days } = req.query;
    if (days === 'all') {
      await pool.query('TRUNCATE TABLE activity_audit_logs');
      return res.json({ success: true, message: 'All activity audit logs have been permanently cleared.' });
    }
    const daysNum = parseInt(days || '30', 10);
    const cutoffDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();
    const [result] = await pool.query('DELETE FROM activity_audit_logs WHERE created_at < ?', [cutoffDate]);
    res.json({ success: true, deletedCount: result.affectedRows, message: `Purged activity audit logs older than ${daysNum} days.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Results / Leaderboard (with Pagination support)
app.get('/api/results', async (req, res) => {
  try {
    const isAdmin = isAdminAuthenticatedRequest(req);
    const authenticatedCandidate = getAuthenticatedCandidate(req);

    if (!isAdmin && !authenticatedCandidate) {
      return res.status(401).json({ error: 'Authentication required to access candidate results.' });
    }

    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || '100', 10)));
    const offset = Math.max(0, (page - 1) * limit);

    const [rows] = await pool.query(
      `SELECT r.*, COALESCE(q.title, r.quiz_title) AS current_quiz_title 
       FROM results r 
       LEFT JOIN quizzes q ON r.quiz_id = q.id 
       ORDER BY r.percentage DESC, r.time_spent_seconds ASC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const callerEmail = authenticatedCandidate?.email?.toLowerCase().trim() || '';

    const results = rows.map(r => {
      const isRowOwner = Boolean(callerEmail && r.candidate_email && r.candidate_email.toLowerCase().trim() === callerEmail);
      return {
        id: r.id,
        quizId: r.quiz_id,
        quizTitle: r.current_quiz_title || r.quiz_title,
        candidateName: r.candidate_name,
        candidateEmail: (isAdmin || isRowOwner) ? r.candidate_email : (r.candidate_email ? r.candidate_email.replace(/(.{2})(.*)(?=@)/, '$1***') : null),
        topic: r.topic,
        score: r.score,
        maxScore: r.max_score,
        percentage: r.percentage,
        passed: Boolean(r.passed),
        timeSpentSeconds: r.time_spent_seconds,
        correctAnswers: r.correct_answers,
        wrongAnswers: r.wrong_answers,
        skippedQuestions: r.skipped_questions,
        userAnswers: (isAdmin || isRowOwner) ? (r.user_answers_json ? JSON.parse(r.user_answers_json) : {}) : undefined,
        attemptedAt: r.attempted_at,
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/results', async (req, res) => {
  try {
    const isAdmin = isAdminAuthenticatedRequest(req);
    const authenticatedCandidate = getAuthenticatedCandidate(req);

    if (!isAdmin && !authenticatedCandidate) {
      return res.status(401).json({ error: 'Authentication required to submit examination results.' });
    }

    const r = req.body;
    let effectiveCandidateName = r.candidateName || 'Candidate';
    let effectiveCandidateEmail = r.candidateEmail || null;

    // Bind candidate identity strictly to the signed session cookie + users table for non-admins
    if (!isAdmin && authenticatedCandidate) {
      const [userRows] = await pool.query('SELECT name, email FROM users WHERE uid = ? LIMIT 1', [authenticatedCandidate.uid]);
      if (userRows.length === 0) {
        return res.status(401).json({ error: 'Candidate session account no longer exists.' });
      }
      effectiveCandidateEmail = userRows[0].email;
      effectiveCandidateName = userRows[0].name || effectiveCandidateName;
    }

    let finalScore = Number(r.score || 0);
    let finalMaxScore = Number(r.maxScore || 0);
    let finalPercentage = Number(r.percentage || 0);
    let finalPassed = Boolean(r.passed);
    let finalCorrectAnswers = Number(r.correctAnswers || 0);
    let finalWrongAnswers = Number(r.wrongAnswers || 0);
    let finalSkippedQuestions = Number(r.skippedQuestions || 0);
    let isTampered = false;

    // --- AUTHORITATIVE SERVER-SIDE GRADING & ACCESS POLICY ENGINE ---
    if (!r.quizId) {
      return res.status(400).json({ error: 'Valid quizId is required to submit results.' });
    }

    const [quizRows] = await pool.query('SELECT * FROM quizzes WHERE id = ?', [r.quizId]);
    if (quizRows.length === 0) {
      if (!isAdmin) {
        return res.status(404).json({ error: 'Examination not found on server.' });
      }
    } else {
      const quiz = quizRows[0];

      if (!isAdmin) {
        // 1. Ensure exam is published
        if (!quiz.is_published) {
          return res.status(403).json({ error: 'This examination is not currently published.' });
        }

        // 2. Enforce invite-only email restriction
        let allowedList = null;
        try {
          allowedList = quiz.allowed_emails ? JSON.parse(quiz.allowed_emails) : null;
        } catch { }
        if (Array.isArray(allowedList) && allowedList.length > 0) {
          const emailLower = String(effectiveCandidateEmail || '').toLowerCase().trim();
          const isInvited = emailLower && allowedList.some((e) => String(e).toLowerCase().trim() === emailLower);
          if (!isInvited) {
            return res.status(403).json({ error: 'Your account is not authorized to submit this restricted exam.' });
          }
        }

        // 3. Enforce exam access passcode verification
        if (quiz.access_code) {
          const unlockedIds = getUnlockedQuizIds(req);
          if (!unlockedIds.includes(quiz.id)) {
            return res.status(403).json({ error: 'Protected exam passcode verification required before submission.' });
          }
        }

        // 4. Enforce scheduled window (allow 2-minute grace window after end for timer auto-submit)
        const nowMs = Date.now();
        if (quiz.scheduled_start_datetime && nowMs < new Date(quiz.scheduled_start_datetime).getTime()) {
          return res.status(403).json({ error: 'This scheduled examination has not started yet.' });
        }
        if (quiz.scheduled_end_datetime && nowMs > new Date(quiz.scheduled_end_datetime).getTime() + 2 * 60 * 1000) {
          return res.status(403).json({ error: 'The submission window for this scheduled examination has closed.' });
        }

        // 5. Enforce live_contest single-attempt & max_attempts limits
        const effectiveLimit = quiz.quiz_type === 'live_contest'
          ? 1
          : (Number(quiz.max_attempts || 0) > 0 ? Number(quiz.max_attempts) : 0);

        if (effectiveLimit > 0 && effectiveCandidateEmail) {
          const [attemptRows] = await pool.query(
            'SELECT COUNT(*) AS cnt FROM results WHERE quiz_id = ? AND LOWER(candidate_email) = LOWER(?)',
            [quiz.id, effectiveCandidateEmail]
          );
          const previousCount = Number(attemptRows[0]?.cnt || 0);
          if (previousCount >= effectiveLimit) {
            return res.status(403).json({
              error: quiz.quiz_type === 'live_contest'
                ? 'Live Contest exams allow strictly 1 attempt.'
                : `Maximum attempt limit (${effectiveLimit}) reached for this exam.`
            });
          }
        }
      }

      const [questionRows] = await pool.query('SELECT * FROM questions WHERE quiz_id = ?', [r.quizId]);

      if (questionRows.length === 0 && !isAdmin) {
        return res.status(400).json({ error: 'Cannot score an examination with no questions.' });
      }

      if (questionRows.length > 0) {
        let calculatedScore = 0;
        let calculatedCorrect = 0;
        let calculatedWrong = 0;
        let calculatedSkipped = 0;
        const negativeMarks = Number(quiz.negative_marks || 0);

        for (const q of questionRows) {
          const uAns = r.userAnswers ? r.userAnswers[q.id] : null;
          const isMSQ = q.question_type === 'multiple_select';
          let isCorrect = false;
          let isSkipped = false;

          if (isMSQ) {
            const selected = Array.isArray(uAns?.selectedOptionIds) ? uAns.selectedOptionIds : [];
            let correct = [];
            try { correct = JSON.parse(q.correct_option_ids_json || '[]'); } catch { }
            if (correct.length === 0 && q.correct_option_id) correct = [q.correct_option_id];

            isSkipped = selected.length === 0;
            if (!isSkipped) {
              isCorrect = selected.length === correct.length && selected.every(val => correct.includes(val));
            }
          } else {
            const selected = uAns?.selectedOptionId || null;
            isSkipped = selected === null || selected === undefined || selected === '';
            if (!isSkipped) {
              isCorrect = String(selected).trim().toUpperCase() === String(q.correct_option_id).trim().toUpperCase();
            }
          }

          if (isSkipped) {
            calculatedSkipped++;
          } else if (isCorrect) {
            calculatedCorrect++;
            calculatedScore += Number(q.marks || 1);
          } else {
            calculatedWrong++;
            if (negativeMarks > 0) {
              calculatedScore -= negativeMarks;
            }
          }
        }

        const calculatedMaxScore = questionRows.reduce((acc, q) => acc + Number(q.marks || 1), 0);
        const computedScore = Math.max(0, Math.round(calculatedScore * 100) / 100);
        const computedPercentage = calculatedMaxScore > 0 ? Math.round((computedScore / calculatedMaxScore) * 100) : 0;
        const computedPassed = computedPercentage >= Number(quiz.passing_percentage || 60);

        // Detect client-side score forgery or tampering attempt
        const scoreDelta = Math.abs(finalScore - computedScore);
        const percentageDelta = Math.abs(finalPercentage - computedPercentage);
        if (scoreDelta > 0.05 || percentageDelta > 1) {
          isTampered = true;
          recordAuditLog({
            eventType: 'security_alert',
            severity: 'danger',
            actorName: effectiveCandidateName || 'Unknown Candidate',
            actorEmail: effectiveCandidateEmail || null,
            actorRole: 'student',
            actionTitle: `🚨 Client Score Tampering Detected: "${r.quizTitle}"`,
            detailsText: `Candidate submitted forged score: ${finalScore}/${finalMaxScore} (${finalPercentage}%). Authoritative server recalculation yielded: ${computedScore}/${calculatedMaxScore} (${computedPercentage}%). Tampered score was rejected and overridden with authoritative grade.`,
            ipAddress: req.ip || '127.0.0.1'
          });
        }

        // Enforce authoritative values
        finalScore = computedScore;
        finalMaxScore = calculatedMaxScore;
        finalPercentage = computedPercentage;
        finalPassed = computedPassed;
        finalCorrectAnswers = calculatedCorrect;
        finalWrongAnswers = calculatedWrong;
        finalSkippedQuestions = calculatedSkipped;
      }
    }

    // Prevent overwriting existing finalized result rows for non-admins
    let safeResultId = (typeof r.id === 'string' && r.id.trim())
      ? r.id.trim().slice(0, 120)
      : `res_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const [existingResult] = await pool.query('SELECT candidate_email FROM results WHERE id = ? LIMIT 1', [safeResultId]);
    if (existingResult.length > 0 && !isAdmin) {
      const existingEmail = String(existingResult[0].candidate_email || '').toLowerCase().trim();
      const callerEmail = String(effectiveCandidateEmail || '').toLowerCase().trim();
      if (!callerEmail || existingEmail !== callerEmail) {
        return res.status(403).json({ error: 'Cannot overwrite another candidate’s examination record.' });
      }
      return res.status(409).json({ error: 'This examination attempt has already been finalized.' });
    }

    await pool.query(
      `INSERT INTO results (
        id, quiz_id, quiz_title, candidate_name, candidate_email, topic, score, max_score, percentage,
        passed, time_spent_seconds, correct_answers, wrong_answers, skipped_questions, user_answers_json, attempted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        score=?, percentage=?, passed=?, time_spent_seconds=?, correct_answers=?, wrong_answers=?, skipped_questions=?, user_answers_json=?`,
      [
        safeResultId, r.quizId, r.quizTitle, effectiveCandidateName, effectiveCandidateEmail || null, r.topic, finalScore, finalMaxScore, finalPercentage,
        finalPassed ? 1 : 0, r.timeSpentSeconds, finalCorrectAnswers, finalWrongAnswers, finalSkippedQuestions, JSON.stringify(r.userAnswers || {}), r.attemptedAt,
        finalScore, finalPercentage, finalPassed ? 1 : 0, r.timeSpentSeconds, finalCorrectAnswers, finalWrongAnswers, finalSkippedQuestions, JSON.stringify(r.userAnswers || {})
      ]
    );

    recordAuditLog({
      eventType: 'exam_submit',
      severity: finalPassed ? 'success' : 'warning',
      actorName: effectiveCandidateName,
      actorEmail: effectiveCandidateEmail || null,
      actorRole: 'student',
      actionTitle: `🎯 Exam Completed: ${effectiveCandidateName} completed "${r.quizTitle}" (${finalPercentage}%)`,
      detailsText: `Result: ${finalScore}/${finalMaxScore} (${finalPercentage}%), Verdict: ${finalPassed ? 'PASSED ✓' : 'FAILED ✗'}, Time Spent: ${r.timeSpentSeconds}s, Correct: ${finalCorrectAnswers}, Wrong: ${finalWrongAnswers}, Skipped: ${finalSkippedQuestions}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      authoritative: true,
      tamperDetected: isTampered,
      result: {
        score: finalScore,
        maxScore: finalMaxScore,
        percentage: finalPercentage,
        passed: finalPassed,
        correctAnswers: finalCorrectAnswers,
        wrongAnswers: finalWrongAnswers,
        skippedQuestions: finalSkippedQuestions
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Admin Executive Stats Endpoint
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
    const [[{ totalQuizzes }]] = await pool.query('SELECT COUNT(*) as totalQuizzes FROM quizzes');
    const [[{ totalAttempts }]] = await pool.query('SELECT COUNT(*) as totalAttempts FROM results');
    const [[{ avgScore }]] = await pool.query('SELECT IFNULL(AVG(percentage), 0) as avgScore FROM results');
    const [[{ passedAttempts }]] = await pool.query('SELECT COUNT(*) as passedAttempts FROM results WHERE passed = 1');
    const [recentResults] = await pool.query('SELECT * FROM results ORDER BY attempted_at DESC LIMIT 10');

    // 1. Visitor Counts
    const [[{ totalVisitors }]] = await pool.query('SELECT COUNT(*) as totalVisitors FROM site_visits');
    const nowMs = Date.now();
    const activeVisitorsCount = Array.from(activeVisitors.values()).filter(
      v => v.role !== 'admin' && (nowMs - v.lastSeen < 45000)
    ).length;
    const activeExamsCount = activeSessions.size;

    // 2. Top Performers (Top 5 average scores)
    const [topPerformers] = await pool.query(`
      SELECT candidate_name as candidateName, candidate_email as candidateEmail, COUNT(*) as attemptsCount, AVG(percentage) as avgScore 
      FROM results 
      GROUP BY candidate_name, candidate_email 
      ORDER BY avgScore DESC, attemptsCount DESC 
      LIMIT 5
    `);

    // 3. Weekly Trends Comparison (using UTC_TIMESTAMP to align with client ISO strings)
    const [[{ attemptsThisWeek }]] = await pool.query(`
      SELECT COUNT(*) as attemptsThisWeek 
      FROM results 
      WHERE attempted_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
    `);
    const [[{ attemptsLastWeek }]] = await pool.query(`
      SELECT COUNT(*) as attemptsLastWeek 
      FROM results 
      WHERE attempted_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 DAY) AND attempted_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
    `);

    // 4. Live Activity Feed (Merges In-Memory Event Stream + Active Exam Sessions + Recent Database Submissions)
    const liveSessionsList = Array.from(activeSessions.values()).map(s => ({
      id: `live_${s.quizId}_${s.candidateEmail || s.candidateName}`,
      type: 'live',
      message: `⚡ ${s.candidateName} is taking "${s.quizTitle || 'Exam'}" (${s.percentageComplete}% complete)`,
      timestamp: new Date(s.lastSeen).toISOString()
    }));

    const completedList = recentResults.map(r => ({
      id: `comp_${r.id}`,
      type: 'completed',
      message: `🎯 ${r.candidate_name} completed "${r.quiz_title}" with ${r.percentage}% (${r.passed ? 'Passed ✓' : 'Failed ✗'})`,
      timestamp: r.attempted_at
    }));

    // Deduplicate any overlapping messages by unique signature
    const seenSignatures = new Set();
    const rawFeed = [...globalActivityLog, ...liveSessionsList, ...completedList];
    const liveActivityFeed = rawFeed
      .filter(item => {
        const signature = `${item.type}_${item.message}`;
        if (seenSignatures.has(signature)) return false;
        seenSignatures.add(signature);
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);



    res.json({
      totalUsers,
      totalQuizzes,
      totalAttempts,
      avgScore: Math.round(avgScore * 10) / 10,
      passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
      totalVisitors,
      activeVisitorsCount,
      activeExamsCount,
      topPerformers: topPerformers.map(t => ({
        ...t,
        avgScore: Math.round(t.avgScore * 10) / 10
      })),
      attemptsThisWeek,
      attemptsLastWeek,
      liveActivityFeed,
      recentResults: recentResults.map(r => ({
        id: r.id,
        quizTitle: r.quiz_title,
        candidateName: r.candidate_name,
        score: r.score,
        maxScore: r.max_score,
        percentage: r.percentage,
        passed: Boolean(r.passed),
        attemptedAt: r.attempted_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Announcements
app.get('/api/announcements', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(rows.map(a => ({
      id: a.id,
      title: a.title,
      message: a.message,
      scheduledDateTime: a.scheduled_datetime,
      targetQuizId: a.target_quiz_id,
      isActive: Boolean(a.is_active),
      createdAt: a.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements', authenticateAdmin, async (req, res) => {
  try {
    const a = req.body;
    await pool.query(
      `INSERT INTO announcements (id, title, message, scheduled_datetime, target_quiz_id, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.title, a.message, a.scheduledDateTime, a.targetQuizId, a.isActive ? 1 : 0, a.createdAt]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/announcements/:id', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Bookmarks (per-user Revision Hub) ---
app.delete('/api/results/:id', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM results WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate Limiter: Maximum 60 bookmark operations per minute per IP (CWE-770)
const bookmarksLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Excessive bookmark operations. Throttled to prevent service degradation.'
});

// Helper function to resolve and authenticate caller UID for bookmarks
function resolveAuthenticatedUid(req) {
  const isAdmin = isAdminAuthenticatedRequest(req);
  const authenticatedCandidate = getAuthenticatedCandidate(req);

  return { isAdmin, authenticatedCandidate };
}

app.get('/api/bookmarks', async (req, res) => {
  const { isAdmin, authenticatedCandidate } = resolveAuthenticatedUid(req);
  const targetUid = req.query.uid;

  if (!isAdmin && !authenticatedCandidate) {
    return res.status(401).json({ error: 'Access Denied: Authentication required to access bookmarks.' });
  }

  // Non-admins can strictly only fetch their own bookmarks (CWE-639 IDOR Defense)
  const effectiveUid = isAdmin ? (targetUid || authenticatedCandidate?.uid) : authenticatedCandidate.uid;
  if (!effectiveUid) {
    return res.status(400).json({ error: 'Valid user identifier required.' });
  }

  try {
    const [rows] = await pool.query('SELECT question_json FROM bookmarks WHERE uid = ? ORDER BY bookmarked_at DESC', [effectiveUid]);
    res.json(rows.map(r => JSON.parse(r.question_json)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookmarks', bookmarksLimiter, async (req, res) => {
  const { isAdmin, authenticatedCandidate } = resolveAuthenticatedUid(req);
  const { uid, questionId, question } = req.body;

  if (!isAdmin && !authenticatedCandidate) {
    return res.status(401).json({ error: 'Access Denied: Authentication required to save bookmarks.' });
  }

  if (!questionId || !question) {
    return res.status(400).json({ error: 'questionId and question payload required' });
  }

  // Enforce caller ownership (CWE-639)
  const effectiveUid = isAdmin ? (uid || authenticatedCandidate?.uid) : authenticatedCandidate.uid;
  if (!effectiveUid) {
    return res.status(400).json({ error: 'Valid user identifier required.' });
  }

  // Input validation
  const safeQuestionId = String(questionId).slice(0, 100);
  let safeQuestionJson;
  try {
    safeQuestionJson = typeof question === 'string' ? question : JSON.stringify(question);
    if (safeQuestionJson.length > 50000) {
      return res.status(400).json({ error: 'Question data payload too large.' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid question payload.' });
  }

  try {
    const id = `bm_${effectiveUid}_${safeQuestionId}`.slice(0, 150);
    await pool.query(
      `INSERT INTO bookmarks (id, uid, question_id, question_json, bookmarked_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE question_json = VALUES(question_json), bookmarked_at = VALUES(bookmarked_at)`,
      [id, effectiveUid, safeQuestionId, safeQuestionJson, new Date().toISOString()]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bookmarks/:questionId', bookmarksLimiter, async (req, res) => {
  const { isAdmin, authenticatedCandidate } = resolveAuthenticatedUid(req);
  const { uid } = req.query;

  if (!isAdmin && !authenticatedCandidate) {
    return res.status(401).json({ error: 'Access Denied: Authentication required to delete bookmarks.' });
  }

  // Enforce caller ownership (CWE-639)
  const effectiveUid = isAdmin ? (uid || authenticatedCandidate?.uid) : authenticatedCandidate.uid;
  if (!effectiveUid) {
    return res.status(400).json({ error: 'Valid user identifier required.' });
  }

  const safeQuestionId = String(req.params.questionId).slice(0, 100);

  try {
    await pool.query('DELETE FROM bookmarks WHERE uid = ? AND question_id = ?', [effectiveUid, safeQuestionId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 1. PROMOTIONAL BANNERS & SPOTLIGHT API
// ==========================================
app.get('/api/banners', async (req, res) => {
  try {
    const showAll = req.query.all === 'true' && isAdminAuthenticatedRequest(req);
    const slot = req.query.slot; // 'hero' | 'header_ad' | 'catalog_ad' | 'header_ad,catalog_ad'

    let query = 'SELECT * FROM banners WHERE 1=1';
    const params = [];

    if (!showAll) {
      query += ' AND is_active = 1';
    }
    if (slot) {
      const slots = slot.split(',').map(s => s.trim());
      if (slots.length === 1) {
        query += ' AND slot_type = ?';
        params.push(slots[0]);
      } else {
        query += ` AND slot_type IN (${slots.map(() => '?').join(',')})`;
        params.push(...slots);
      }
    }

    query += ' ORDER BY display_order ASC, id DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows.map(r => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle,
      imageUrl: r.image_url,
      badgeText: r.badge_text,
      ctaText: r.cta_text,
      ctaLink: r.cta_link,
      quizId: r.quiz_id,
      slotType: r.slot_type || 'hero',
      isActive: Boolean(r.is_active),
      displayOrder: r.display_order,
      allowDismiss: r.allow_dismiss === null || r.allow_dismiss === undefined ? true : Boolean(r.allow_dismiss),
      imageOnly: Boolean(r.image_only),
      createdAt: r.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function isSafeNavUrl(url) {
  if (!url) return true;
  const trimmed = String(url).trim();
  return trimmed.startsWith('https://') || trimmed.startsWith('http://') || (trimmed.startsWith('/') && !trimmed.startsWith('//'));
}

function isSafeImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) {
    return true;
  }
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(trimmed);
}

app.post('/api/banners', authenticateAdmin, async (req, res) => {
  const { title, subtitle, imageUrl, badgeText, ctaText, ctaLink, quizId, slotType = 'hero', isActive = true, displayOrder = 0, allowDismiss = true, imageOnly = false } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }
  if (!isSafeImageUrl(imageUrl)) {
    return res.status(400).json({ error: 'Invalid imageUrl scheme. Use PNG/JPG/WebP/GIF upload or HTTP/HTTPS image URL.' });
  }
  if (ctaLink && !isSafeNavUrl(ctaLink)) {
    return res.status(400).json({ error: 'Invalid ctaLink protocol. Only https://, http://, or relative paths starting with / are allowed.' });
  }
  try {
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanSubtitle = typeof subtitle === 'string' ? subtitle.trim() : '';
    const cleanBadge = typeof badgeText === 'string' ? badgeText.trim() : '';
    const cleanCta = typeof ctaText === 'string' ? ctaText.trim() : '';
    const safeCtaLink = ctaLink && isSafeNavUrl(ctaLink) ? String(ctaLink).trim() : '/';

    const [result] = await pool.query(
      `INSERT INTO banners (title, subtitle, image_url, badge_text, cta_text, cta_link, quiz_id, slot_type, is_active, display_order, allow_dismiss, image_only)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanTitle,
        cleanSubtitle,
        imageUrl,
        cleanBadge,
        cleanCta,
        safeCtaLink,
        quizId || null,
        slotType || 'hero',
        isActive ? 1 : 0,
        parseInt(displayOrder || 0, 10),
        allowDismiss !== false ? 1 : 0,
        imageOnly ? 1 : 0,
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/banners/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, imageUrl, badgeText, ctaText, ctaLink, quizId, slotType, isActive, displayOrder, allowDismiss, imageOnly } = req.body;
  if (imageUrl && !isSafeImageUrl(imageUrl)) {
    return res.status(400).json({ error: 'Invalid imageUrl scheme.' });
  }
  if (ctaLink && !isSafeNavUrl(ctaLink)) {
    return res.status(400).json({ error: 'Invalid ctaLink protocol.' });
  }
  try {
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanSubtitle = typeof subtitle === 'string' ? subtitle.trim() : '';
    const cleanBadge = typeof badgeText === 'string' ? badgeText.trim() : '';
    const cleanCta = typeof ctaText === 'string' ? ctaText.trim() : '';
    const safeCtaLink = ctaLink && isSafeNavUrl(ctaLink) ? String(ctaLink).trim() : '/';

    await pool.query(
      `UPDATE banners 
       SET title = ?,
           subtitle = ?,
           image_url = ?,
           badge_text = ?,
           cta_text = ?,
           cta_link = ?,
           quiz_id = ?,
           slot_type = ?,
           is_active = ?,
           display_order = ?,
           allow_dismiss = ?,
           image_only = ?
       WHERE id = ?`,
      [
        cleanTitle,
        cleanSubtitle,
        imageUrl || '',
        cleanBadge,
        cleanCta,
        safeCtaLink,
        quizId ? quizId : null,
        slotType || 'hero',
        isActive ? 1 : 0,
        parseInt(displayOrder || 0, 10),
        allowDismiss !== false ? 1 : 0,
        imageOnly ? 1 : 0,
        id,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/banners/:id/toggle', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE banners SET is_active = NOT is_active WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/banners/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM banners WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. QUESTION DISCUSSIONS & DOUBTS FORUM API
// ==========================================
app.get('/api/discussions/:quizId/:questionId', async (req, res) => {
  const { quizId, questionId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM question_discussions 
       WHERE quiz_id = ? AND question_id = ? 
       ORDER BY is_pinned DESC, id ASC`,
      [quizId, questionId]
    );
    res.json(rows.map(r => ({
      id: r.id,
      quizId: r.quiz_id,
      questionId: r.question_id,
      userName: r.user_name,
      userEmail: r.user_email,
      role: r.role,
      comment: r.comment,
      likesCount: r.likes_count,
      isPinned: Boolean(r.is_pinned),
      createdAt: r.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate Limiter: Maximum 30 like clicks per minute per IP (CWE-770)
const discussionLikeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many reactions submitted. Please wait a moment.'
});

app.post('/api/discussions/:id/like', discussionLikeLimiter, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE question_discussions SET likes_count = likes_count + 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/discussions/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM question_discussions WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate Limiter: Maximum 10 discussion comments per 5 minutes per IP (CWE-770)
const discussionCommentLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 10,
  message: 'Comment submission rate limit exceeded. Please wait a few minutes before posting again.'
});

app.post('/api/discussions/:quizId/:questionId', discussionCommentLimiter, async (req, res) => {
  const { quizId, questionId } = req.params;
  const { userName, userEmail, role = 'candidate', comment } = req.body;

  if (!userName || !comment) {
    return res.status(400).json({ error: 'userName and comment are required' });
  }

  // Type and length validation
  if (typeof comment !== 'string' || comment.trim().length === 0 || comment.length > 2000) {
    return res.status(400).json({ error: 'Comment must be between 1 and 2000 characters.' });
  }
  if (typeof userName !== 'string' || userName.trim().length === 0 || userName.length > 100) {
    return res.status(400).json({ error: 'User name must be between 1 and 100 characters.' });
  }

  // Verify administrative privileges to prevent role impersonation (CWE-269)
  const isAdmin = isAdminAuthenticatedRequest(req);

  // If user requests a privileged role (admin, faculty, staff) but lacks credentials, forcefully demote to 'candidate'
  let verifiedRole = 'candidate';
  const requestedRole = String(role).toLowerCase().trim();
  if (requestedRole === 'admin' || requestedRole === 'faculty' || requestedRole === 'moderator' || requestedRole === 'staff') {
    if (isAdmin) {
      verifiedRole = requestedRole;
    } else {
      console.warn(`[SECURITY ALERT] Unauthenticated actor attempted role impersonation: ${requestedRole} by ${userName}`);
      verifiedRole = 'candidate';
    }
  } else {
    verifiedRole = 'candidate';
  }

  // Bind candidate email from signed session if present
  let verifiedEmail = userEmail ? String(userEmail).slice(0, 255).trim() : null;
  if (req.signedCookies?.evalnium_session) {
    try {
      const session = JSON.parse(req.signedCookies.evalnium_session);
      if (session.email) verifiedEmail = session.email;
    } catch { }
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO question_discussions (quiz_id, question_id, user_name, user_email, role, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        String(quizId).slice(0, 100),
        String(questionId).slice(0, 100),
        userName.trim().slice(0, 100),
        verifiedEmail,
        verifiedRole,
        comment.trim().slice(0, 2000)
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate Limiter: Maximum 30 proctoring telemetry submissions per minute per IP to prevent flood DoS (CWE-400)
const proctoringLogLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Excessive proctoring telemetry events submitted. Throttled to prevent service degradation.'
});

// ==========================================
// 3. LIVE PROCTORING & ANTI-CHEATING API
// ==========================================
app.post('/api/proctoring/log', proctoringLogLimiter, async (req, res) => {
  const { sessionId, quizId, candidateName, candidateEmail, violationType, details, snapshotBase64 } = req.body;
  if (!quizId || !violationType) {
    return res.status(400).json({ error: 'quizId and violationType are required' });
  }

  // Type and length validation to defend against memory exhaustion and buffer overflows (CWE-20)
  if (typeof quizId !== 'string' || quizId.length > 100 || typeof violationType !== 'string' || violationType.length > 100) {
    return res.status(400).json({ error: 'Invalid quizId or violationType format.' });
  }

  // Bind candidate identity to signed session cookie if authenticated to prevent identity spoofing (CWE-639)
  let effectiveEmail = candidateEmail ? String(candidateEmail).slice(0, 255) : null;
  let effectiveName = candidateName ? String(candidateName).slice(0, 255) : 'Anonymous Candidate';

  if (req.signedCookies?.evalnium_session) {
    try {
      const session = JSON.parse(req.signedCookies.evalnium_session);
      if (session.email) effectiveEmail = session.email;
    } catch { }
  }

  // Validate snapshotBase64 format and length (max 10MB)
  let validatedSnapshot = null;
  if (snapshotBase64) {
    if (typeof snapshotBase64 === 'string' && snapshotBase64.length <= 10 * 1024 * 1024 && snapshotBase64.startsWith('data:image/')) {
      validatedSnapshot = snapshotBase64;
    } else {
      console.warn('[PROCTORING SECURITY] Rejected invalid or oversized webcam snapshot.');
    }
  }

  try {
    await pool.query(
      `INSERT INTO proctoring_logs (session_id, quiz_id, candidate_name, candidate_email, violation_type, details, snapshot_base64)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        (sessionId && typeof sessionId === 'string') ? sessionId.slice(0, 100) : 'session_' + Date.now(),
        quizId,
        effectiveName,
        effectiveEmail,
        violationType,
        (details && typeof details === 'string') ? details.slice(0, 1000) : '',
        validatedSnapshot,
      ]
    );

    recordAuditLog({
      eventType: 'proctoring_alert',
      severity: 'danger',
      actorName: effectiveName,
      actorEmail: effectiveEmail,
      actorRole: 'student',
      actionTitle: `🚨 Anti-Cheating Alert: ${violationType} by ${effectiveName}`,
      detailsText: details ? String(details).slice(0, 500) : `Proctoring violation event logged for quiz ID: ${quizId}. Snapshot: ${Boolean(validatedSnapshot)}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Authoritative Proctoring Telemetry & Biometric Audit Log Guard (CWE-200 / CWE-306)
app.get('/api/proctoring/logs/:quizId', async (req, res) => {
  const { quizId } = req.params;
  const { candidateEmail, sessionId } = req.query;

  // Verify administrative privileges via signed session cookie or security headers
  const isAdmin = isAdminAuthenticatedRequest(req);

  // Inspect authenticated candidate session
  const authenticatedCandidate = getAuthenticatedCandidate(req);

  // Deny anonymous exfiltration of candidate webcam captures and violation records
  if (!isAdmin && !authenticatedCandidate) {
    return res.status(401).json({
      success: false,
      error: 'Access Denied: Authentication required to inspect proctoring telemetry.'
    });
  }

  try {
    let query = 'SELECT * FROM proctoring_logs WHERE quiz_id = ?';
    const params = [quizId];

    if (isAdmin) {
      // Administrators have granular filter capabilities
      if (candidateEmail) {
        query += ' AND candidate_email = ?';
        params.push(candidateEmail);
      } else if (sessionId) {
        query += ' AND session_id = ?';
        params.push(sessionId);
      }
    } else {
      // Non-administrative candidates are strictly restricted to their own session telemetry (CWE-639 IDOR protection)
      query += ' AND candidate_email = ?';
      params.push(authenticatedCandidate.email);
    }

    query += ' ORDER BY id DESC LIMIT 100';

    const [rows] = await pool.query(query, params);
    res.json(rows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      quizId: r.quiz_id,
      candidateName: r.candidate_name,
      candidateEmail: r.candidate_email,
      violationType: r.violation_type,
      details: r.details,
      snapshotBase64: r.snapshot_base64,
      createdAt: r.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. CERTIFICATE VERIFICATION API
// ==========================================
// Rate Limiter: Maximum 30 certificate verifications per minute per IP to prevent automated scraping (CWE-799)
const certificateVerificationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Certificate verification rate limit reached. Please wait a moment before trying again.'
});

app.get('/api/certificates/verify/:certId', certificateVerificationLimiter, async (req, res) => {
  const { certId } = req.params;

  // Validate certId format
  if (!certId || typeof certId !== 'string' || certId.length > 100) {
    return res.status(400).json({ valid: false, message: 'Invalid certificate identifier format.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT r.*, COALESCE(q.title, r.quiz_title) AS current_quiz_title 
       FROM results r 
       LEFT JOIN quizzes q ON r.quiz_id = q.id 
       WHERE r.id = ? LIMIT 1`,
      [certId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ valid: false, message: 'Certificate record not found in National Registry.' });
    }

    const r = rows[0];

    // Determine administrative access
    const isAdmin = isAdminAuthenticatedRequest(req);

    // Check if caller is the certificate owner (via signed candidate session)
    let isOwner = false;
    if (req.signedCookies?.evalnium_session) {
      try {
        const session = JSON.parse(req.signedCookies.evalnium_session);
        if (session.email && r.candidate_email && session.email.toLowerCase() === r.candidate_email.toLowerCase()) {
          isOwner = true;
        }
      } catch { }
    }

    // PII Protection: Mask email address for general public verifiers (CWE-200)
    const maskedEmail = (isAdmin || isOwner)
      ? r.candidate_email
      : (r.candidate_email ? r.candidate_email.replace(/(.{2})(.*)(?=@)/, '$1***') : null);

    res.json({
      valid: true,
      certificateId: r.id,
      candidateName: r.candidate_name,
      candidateEmail: maskedEmail,
      quizTitle: r.current_quiz_title || r.quiz_title,
      score: r.score,
      maxScore: r.max_score,
      percentage: r.percentage,
      passed: Boolean(r.passed),
      attemptedAt: r.attempted_at,
      issuedBy: 'Evalnium National Testing & Assessment Authority',
      verificationUrl: `https://evalnium.app/verify/${r.id}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. ADMIN OUTGOING EMAIL TEMPLATES API
// ==========================================

// Endpoint A: Fetch all email templates for Admin Studio
app.get('/api/admin/email/templates', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM email_templates ORDER BY id ASC');
    res.json({
      success: true,
      templates: rows
    });
  } catch (err) {
    console.error('Error fetching email templates:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint B: Update an existing email template
app.put('/api/admin/email/templates/:id', async (req, res) => {
  const { id } = req.params;
  const { template_name, subject, heading, body_text, cta_text, cta_url } = req.body;

  if (!subject || !heading || !body_text) {
    return res.status(400).json({
      success: false,
      error: 'Subject, heading, and body_text are required fields.'
    });
  }

  // Enforce string lengths to prevent buffer bloat and database errors
  const safeSubject = String(subject).trim().slice(0, 255);
  const safeHeading = String(heading).trim().slice(0, 255);
  const safeBodyText = String(body_text).trim().slice(0, 10000);
  const safeCtaText = String(cta_text || 'Open Evalnium Portal').trim().slice(0, 100);
  const safeTemplateName = String(template_name || id).trim().slice(0, 100);

  // Protocol Whitelist & Phishing / XSS Link Sanitization (CWE-79 / CWE-601)
  const rawUrl = String(cta_url || '/').trim();
  if (!rawUrl.startsWith('https://') && !rawUrl.startsWith('http://') && !(rawUrl.startsWith('/') && !rawUrl.startsWith('//'))) {
    return res.status(400).json({
      success: false,
      error: 'Security Violation: CTA URL must use HTTPS, HTTP, or a relative root-scoped path (e.g., "/login"). Pseudo-protocols like javascript: or protocol-relative // links are prohibited.'
    });
  }
  const safeCtaUrl = rawUrl.slice(0, 500);

  try {
    const [result] = await pool.query(
      `UPDATE email_templates 
       SET template_name = ?, subject = ?, heading = ?, body_text = ?, cta_text = ?, cta_url = ? 
       WHERE id = ?`,
      [
        safeTemplateName,
        safeSubject,
        safeHeading,
        safeBodyText,
        safeCtaText,
        safeCtaUrl,
        String(id).slice(0, 50)
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Email template not found.' });
    }

    // Record an audit log for the administrator's activity trail
    await recordAuditLog({
      eventType: 'admin_action',
      severity: 'info',
      actorName: 'Admin System',
      actionTitle: `📝 Email Template Updated: ${safeTemplateName}`,
      detailsText: `Subject updated to: "${safeSubject}". CTA: "${safeCtaText}" -> "${safeCtaUrl}"`
    });

    res.json({
      success: true,
      message: `Template "${id}" successfully updated.`,
      template: {
        id,
        template_name: safeTemplateName,
        subject: safeSubject,
        heading: safeHeading,
        body_text: safeBodyText,
        cta_text: safeCtaText,
        cta_url: safeCtaUrl
      }
    });
  } catch (err) {
    console.error(`Error updating email template "${id}":`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. ADMIN BROADCAST & TEST PREVIEW APIs
// ==========================================

// Endpoint C: Fetch Broadcast History
app.get('/api/admin/email/broadcasts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM email_broadcasts ORDER BY id DESC LIMIT 50');
    res.json({
      success: true,
      broadcasts: rows
    });
  } catch (err) {
    console.error('Error fetching broadcast logs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint D: Send or Schedule Broadcast Announcement to Candidates
app.post('/api/admin/email/broadcast', authenticateAdmin, async (req, res) => {
  const { title, subject, message_body, target_audience = 'all', scheduled_for = null } = req.body;

  if (!title || !subject || !message_body) {
    return res.status(400).json({
      success: false,
      error: 'Title, subject, and message_body are required for broadcasting.'
    });
  }

  try {
    // 1. Gather distinct candidate recipients
    let querySql = `
      SELECT DISTINCT email, name 
      FROM users 
      WHERE email IS NOT NULL 
        AND email != '' 
        AND email NOT LIKE '%@evalnium.app'
    `;
    const queryParams = [];

    if (target_audience && target_audience !== 'all') {
      // If targeting candidates of a specific quiz
      querySql = `
        SELECT DISTINCT candidate_email AS email, candidate_name AS name 
        FROM results 
        WHERE quiz_id = ? 
          AND candidate_email IS NOT NULL 
          AND candidate_email != '' 
          AND candidate_email NOT LIKE '%@evalnium.app'
      `;
      queryParams.push(target_audience);
    }

    const [recipients] = await pool.query(querySql, queryParams);
    const count = recipients.length;
    const nowIso = new Date().toISOString();

    // 2. Persist broadcast record in MySQL
    const [insertResult] = await pool.query(
      `INSERT INTO email_broadcasts 
       (title, subject, message_body, target_audience, recipients_count, status, scheduled_for, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        subject,
        message_body,
        target_audience,
        count,
        scheduled_for ? 'scheduled' : 'sent',
        scheduled_for || null,
        nowIso
      ]
    );

    // 3. Asynchronous Batch Dispatch (Non-blocking background loop)
    if (!scheduled_for && count > 0) {
      (async () => {
        console.log(`[BROADCAST START] 📢 Dispatching "${title}" to ${count} candidate(s)...`);
        let successCount = 0;
        for (const recipient of recipients) {
          try {
            await sendTemplatedEmail({
              to: recipient.email,
              templateId: 'candidate_notice',
              templateData: {
                candidate_name: recipient.name || 'Candidate',
                custom_message: message_body
              },
              fallbackSubject: subject,
              fallbackHeading: title,
              fallbackBody: message_body
            });
            successCount++;
            // 50ms cooldown between emails to respect SMTP throughput
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (sendErr) {
            console.error(`Failed sending broadcast email to ${recipient.email}:`, sendErr.message);
          }
        }
        console.log(`[BROADCAST FINISHED] 🏁 Dispatched ${successCount}/${count} emails for "${title}".`);
      })();
    }

    // 4. Record admin audit log
    await recordAuditLog({
      eventType: 'admin_action',
      severity: 'success',
      actorName: 'Admin System',
      actionTitle: `📢 Broadcast Email Dispatched: "${title}"`,
      detailsText: `Sent to ${count} candidate recipient(s). Subject: "${subject}". Target: ${target_audience}.`
    });

    res.json({
      success: true,
      message: scheduled_for
        ? `Broadcast scheduled for ${count} candidate(s).`
        : `Broadcast initiated for ${count} candidate(s) in background.`,
      broadcastId: insertResult.insertId,
      recipientsCount: count
    });
  } catch (err) {
    console.error('Error initiating broadcast email:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint E: Send Test Preview Email (For Admin verification)
app.post('/api/admin/email/test', authenticateAdmin, async (req, res) => {
  const { templateId, toEmail, sampleData = {} } = req.body;

  if (!templateId || !toEmail) {
    return res.status(400).json({
      success: false,
      error: 'templateId and toEmail are required to send a test preview.'
    });
  }

  try {
    const defaultSample = {
      candidate_name: 'Arshad (Preview Mode)',
      quiz_title: 'NTA UGC NET Paper 1 - All-India Mock 2026',
      question_count: 50,
      duration_minutes: 60,
      quiz_id: 'test_preview_quiz',
      custom_message: 'This is a test broadcast preview sent from the Admin Studio.',
      otp: '749201',
      ...sampleData
    };

    const result = await sendTemplatedEmail({
      to: toEmail,
      templateId: templateId,
      templateData: defaultSample
    });

    res.json({
      success: true,
      message: `Test preview email successfully dispatched to ${toEmail}!`,
      messageId: result.messageId
    });
  } catch (err) {
    console.error('Failed to send test email preview:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7. ADMIN EMAIL TELEMETRY & AUDIT LOGS API
// ==========================================

// Endpoint F: Fetch Paginated Email Telemetry Audit Logs with Filters & KPI Stats
app.get('/api/admin/email/logs', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status, type, search, startDate, endDate, exportAll } = req.query;

    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (type && type !== 'all') {
      conditions.push('email_type = ?');
      params.push(type);
    }

    if (search && search.trim()) {
      conditions.push('(recipient_email LIKE ? OR recipient_name LIKE ? OR subject LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (startDate) {
      conditions.push('sent_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('sent_at <= ?');
      params.push(`${endDate} 23:59:59`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Fetch Global KPI Statistics for Telemetry Banner
    const [statsRows] = await pool.query(`
      SELECT 
        COUNT(*) AS total_dispatched,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS total_sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS total_failed
      FROM email_logs;
    `);

    const totalDispatched = parseInt(statsRows[0].total_dispatched) || 0;
    const totalSent = parseInt(statsRows[0].total_sent) || 0;
    const totalFailed = parseInt(statsRows[0].total_failed) || 0;
    const deliveryRate = totalDispatched > 0 ? ((totalSent / totalDispatched) * 100).toFixed(1) : '100.0';

    // 2. Count total rows matching the current filter
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total_matching FROM email_logs ${whereClause}`,
      params
    );
    const totalMatching = parseInt(countRows[0].total_matching) || 0;

    // 3. Fetch Paginated Records or Full Export Records
    let querySql = '';
    let queryParams = [...params];

    if (exportAll === 'true') {
      querySql = `SELECT * FROM email_logs ${whereClause} ORDER BY id DESC LIMIT 5000`;
    } else {
      querySql = `SELECT * FROM email_logs ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
    }

    const [logs] = await pool.query(querySql, queryParams);

    // 4. Return unified JSON response
    res.json({
      success: true,
      stats: {
        totalDispatched,
        totalSent,
        totalFailed,
        deliveryRate
      },
      pagination: {
        page,
        limit,
        totalMatching,
        totalPages: Math.ceil(totalMatching / limit) || 1
      },
      logs
    });
  } catch (err) {
    console.error('Error fetching email telemetry logs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Global Zero-Trust Error Sanitization Middleware (CWE-209)
app.use((err, req, res, next) => {
  console.error('[UNHANDLED RUNTIME EXCEPTION]', err);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    success: false,
    error: isDev ? err.message : 'An internal processing error occurred. Telemetry has been logged.'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Evalnium MySQL Express Backend Server running on http://0.0.0.0:${PORT}`);
});

// Backward-compatibility redirector: Automatically forward any legacy port 5173 requests to port 5175
try {
  const legacyPortServer = http.createServer((req, res) => {
    const hostHeader = req.headers.host || '';
    const hostWithoutPort = hostHeader.split(':')[0] || 'localhost';
    res.writeHead(302, {
      'Location': `http://${hostWithoutPort}:5175${req.url}`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    });
    res.end();
  });
  legacyPortServer.listen(5173, '0.0.0.0', () => {
    console.log('🔄 Port 5173 Legacy Forwarder active -> automatically redirecting to http://0.0.0.0:5175');
  });
  legacyPortServer.on('error', (err) => {
    console.log('ℹ️ Port 5173 forwarder status:', err.message);
  });
} catch (e) {
  // Silent fallback
}

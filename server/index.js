import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

const app = express();
app.use(cors({
  origin: function (origin, callback) {
    // Dynamically allow any origin that makes the request to support credentials sharing
    callback(null, true);
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'evalnium@2026',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

const DB_NAME = process.env.DB_NAME || 'evalnium_db';
const PORT = parseInt(process.env.PORT || '5050', 10);

let pool;

// In-Memory OTP Store: email -> { otp, expiresAt }
const otpStore = new Map();
// Rate Limiter Store: email -> { count, windowStart }
const otpRateLimitStore = new Map();

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
  const user = process.env.SMTP_USER || 'arsnaz1234@gmail.com';
  const pass = (process.env.SMTP_PASS || 'uzviogcsymqzxbar').replace(/\s+/g, '');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });
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

    // Seed initial banners if table is empty
    const [bannerRows] = await pool.query('SELECT COUNT(*) as count FROM banners');
    if (bannerRows[0].count === 0) {
      await pool.query(`
        INSERT INTO banners (title, subtitle, image_url, badge_text, cta_text, cta_link, quiz_id, slot_type, is_active, display_order)
        VALUES 
        (
          'NTA UGC NET / JRF 2026 Paper 1 Live Mock Series',
          'Comprehensive Bilingual Assessment covering Teaching & Research Aptitude, Logical Reasoning, and Higher Education with Instant NTA-Standard Diagnostics.',
          'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80',
          'ALL-INDIA LIVE CBT',
          'Start Paper 1 Mock',
          '/',
          NULL,
          'hero',
          1,
          1
        ),
        (
          'Library & Information Science (LIS) Mega Assessment 2026',
          'Full-length examination testing Digital Libraries, Cataloguing & Metadata Standards, Knowledge Organization, and Information Retrieval.',
          'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200&auto=format&fit=crop&q=80',
          'LIS SPECIAL SERIES',
          'Explore LIS Catalog',
          '/',
          NULL,
          'hero',
          1,
          2
        ),
        (
          'Precision Computer-Based Testing Simulation with Official Transcripts',
          'Experience the exact NTA 5-button question palette, non-jittering timers, section switching restrictions, and QR-verifiable performance transcripts.',
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80',
          'OFFICIAL CBT RADAR',
          'View Leaderboards',
          '/',
          NULL,
          'hero',
          1,
          3
        );
      `);
      console.log(`✅ Default showcase promotional banners seeded.`);
    }

    // Seed default header ad / announcement banner if none exists for slot_type = 'header_ad'
    try {
      const [headerAdRows] = await pool.query("SELECT COUNT(*) as count FROM banners WHERE slot_type = 'header_ad'");
      if (headerAdRows[0].count === 0) {
        await pool.query(`
          INSERT INTO banners (title, subtitle, image_url, badge_text, cta_text, cta_link, quiz_id, slot_type, is_active, display_order)
          VALUES 
          (
            'Special Edition NTA UGC NET 2026 Test Series & Master Solved Papers Available Now',
            'Get instant access to 10,000+ LIS Solved MCQs, Bilingual Explanations & National All-India Live Mock Simulations.',
            'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&auto=format&fit=crop&q=80',
            'LIMITED ENROLLMENT',
            'Explore Series',
            '/',
            NULL,
            'header_ad',
            1,
            1
          );
        `);
        console.log(`✅ Default header ad banner seeded.`);
      }
    } catch (e) {
      console.warn('Header ad seed check skipped:', e.message);
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
    console.log(`✅ Candidates auto-synced to users table.`);
  } catch (err) {
    console.error('Failed to sync candidates to users table:', err.message);
  }
}

initDatabase();

// --- OTP AUTH ENDPOINTS WITH RATE LIMITING ---
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required' });

    const key = email.toLowerCase();
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins validity

    otpStore.set(key, { otp, expiresAt });
    console.log(`[REAL EMAIL DISPATCH] 📩 Sending 6-digit OTP code to ${email}...`);

    const transporter = createMailTransporter();
    const senderEmail = process.env.SMTP_USER || 'arsnaz1234@gmail.com';

    const info = await transporter.sendMail({
      from: `"Evalnium Assessment Portal" <${senderEmail}>`,
      to: email,
      subject: `🔑 Your Verification Code: ${otp} - Evalnium Portal`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #0f172a; font-size: 22px; margin: 0;">Evalnium Official Examination Portal</h1>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Student Login Email Verification</p>
          </div>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Your 6-digit security code for authenticating your candidate profile on Evalnium is:</p>
          <div style="font-size: 36px; font-weight: 800; font-family: monospace; letter-spacing: 10px; color: #2563eb; background: #f8fafc; padding: 20px; text-align: center; border-radius: 12px; border: 1px solid #cbd5e1; margin: 24px 0;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 20px;">This code is valid for 5 minutes. If you did not request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center;">Copyright © 2026 Arshad Abdul. All Rights Reserved.</p>
        </div>
      `,
    });

    console.log(`[SMTP DISPATCH SUCCESS] ✅ Real Email delivered to ${email}! MessageID: ${info.messageId}`);

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

    const record = otpStore.get(email.toLowerCase());
    if (!record) {
      return res.status(400).json({ error: 'No OTP found or expired. Please request a new code.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Incorrect OTP code entered.' });
    }

    // OTP Verified successfully!
    otpStore.delete(email.toLowerCase());
    res.json({ success: true, message: 'OTP verified successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --- USER AUTHENTICATION ENDPOINTS ---
app.get('/api/users/check', async (req, res) => {
  try {
    const email = req.query.email?.toString().toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const [rows] = await pool.query('SELECT uid FROM users WHERE email = ?', [email]);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, uid, password } = req.body;
    if (!email || !name || !uid || !password) return res.status(400).json({ error: 'Missing required fields' });

    const normalizedEmail = email.toLowerCase().trim();
    const createdAt = new Date().toISOString();

    // Hash the password securely
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (uid, name, email, role, is_verified, created_at, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = ?, is_verified = 1, password_hash = ?`,
      [uid, name.trim(), normalizedEmail, 'candidate', 1, createdAt, passwordHash, name.trim(), passwordHash]
    );

    // Fetch the actual user record to get their real UID (in case it was an existing user)
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    const user = rows[0];

    // Set HTTP-Only session cookie
    res.cookie('evalnium_session', JSON.stringify({ uid: user.uid, email: user.email }), {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    recordAuditLog({
      eventType: 'user_register',
      severity: 'success',
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role || 'student',
      actionTitle: `👤 Candidate Registration: ${user.name} (${user.email})`,
      detailsText: `New candidate profile created with UID: ${user.uid}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/login', async (req, res) => {
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

    // Set HTTP-Only session cookie
    res.cookie('evalnium_session', JSON.stringify({ uid: user.uid, email: user.email }), {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

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
      createdAt: user.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Email, OTP, and new password are required' });

    const normalizedEmail = email.toLowerCase().trim();

    // Check if account exists
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found. Please create an account.' });
    }

    // Verify OTP
    const record = otpStore.get(normalizedEmail);
    if (!record) {
      return res.status(400).json({ error: 'No OTP found or expired. Please request a new code.' });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
    }
    if (record.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Incorrect OTP code entered.' });
    }

    // OTP Verified! Hash new password and save
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, normalizedEmail]);

    // Clear OTP
    otpStore.delete(normalizedEmail);

    res.json({ success: true, message: 'Password reset successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SESSION COOKIES CORE ROUTING ---

// Admin Login passcode verification endpoint (sets 5-day httpOnly cookie)
app.post('/api/admin/login', (req, res) => {
  try {
    const { passcode } = req.body;
    if (!passcode) return res.status(400).json({ error: 'Passcode is required' });

    if (passcode.trim() === 'evalnium_admin_2026' || passcode.trim() === 'admin123') {
      res.cookie('evalnium_admin_session', 'true', {
        httpOnly: true,
        secure: false, // Set to true in HTTPS environments
        sameSite: 'lax',
        maxAge: 5 * 24 * 60 * 60 * 1000 // 5 days
      });
      return res.json({ success: true });
    }

    res.status(401).json({ error: 'Incorrect passcode entered.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESTORE session details from browser HTTP cookies
app.get('/api/users/me', async (req, res) => {
  try {
    const sessionCookie = req.cookies.evalnium_session;
    const adminCookie = req.cookies.evalnium_admin_session;

    let currentUser = null;
    let isAdminAuthenticated = false;

    if (adminCookie === 'true') {
      isAdminAuthenticated = true;
    }

    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie);
        const [rows] = await pool.query(
          'SELECT uid, name, email, role, target_exam as targetExam, phone, institution, created_at as createdAt FROM users WHERE uid = ?',
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
    res.clearCookie('evalnium_session');
    res.clearCookie('evalnium_admin_session');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all users (for admin)
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT uid, name, email, role, target_exam, phone, institution, created_at FROM users ORDER BY created_at DESC');
    res.json(rows.map(u => ({
      uid: u.uid,
      name: u.name,
      email: u.email,
      role: u.role,
      targetExam: u.target_exam,
      phone: u.phone,
      institution: u.institution,
      createdAt: u.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a user and their test results (admin only)
app.delete('/api/users/:uid', async (req, res) => {
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

// Trigger manual sync of legacy candidates to users table
app.post('/api/users/sync', async (req, res) => {
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

// 1. Quizzes (with Granular Admin Settings & Rules)
app.get('/api/quizzes', async (req, res) => {
  try {
    const [quizRows] = await pool.query('SELECT * FROM quizzes ORDER BY created_at DESC');

    const quizzes = [];
    for (const q of quizRows) {
      const [qRows] = await pool.query('SELECT * FROM questions WHERE quiz_id = ?', [q.id]);
      const questions = [];
      for (const quest of qRows) {
        const [optRows] = await pool.query('SELECT option_letter as id, option_text as text FROM options WHERE question_id = ? ORDER BY option_letter ASC', [quest.id]);
        questions.push({
          id: quest.id,
          questionText: quest.question_text,
          questionEnglish: quest.question_english,
          questionHindi: quest.question_hindi,
          correctOptionId: quest.correct_option_id,
          explanation: quest.explanation,
          explanationEnglish: quest.explanation_english,
          explanationHindi: quest.explanation_hindi,
          topic: quest.topic,
          marks: quest.marks,
          questionType: quest.question_type || 'mcq',
          imageUrl: quest.image_url || undefined,
          listI: JSON.parse(quest.list_i_json || '[]'),
          listII: JSON.parse(quest.list_ii_json || '[]'),
          correctOptionIds: JSON.parse(quest.correct_option_ids_json || '[]'),
          options: optRows,
        });
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
        accessCode: q.access_code || undefined,
        allowedEmails: q.allowed_emails ? JSON.parse(q.allowed_emails) : undefined,
        questionViewMode: q.question_view_mode || 'both',
        maxAttempts: q.max_attempts || 0,
        allowManualEarlyMove: Boolean(q.allow_manual_early_move),
        maxTabSwitches: q.max_tab_switches || 3,
        resultAnnouncementDateTime: q.result_announcement_datetime || undefined,
        questions,
      });
    }

    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quizzes', async (req, res) => {
  let connection;
  try {
    const q = req.body;

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
        q.id, q.title, q.description, q.topic, q.category || 'General', q.difficulty || 'Medium', q.timeLimitMinutes, q.passingPercentage, q.negativeMarks, q.quizType || 'practice', q.isPublished ? 1 : 0, q.createdAt, q.updatedAt, q.author || 'Admin',
        q.enableCertificate !== false ? 1 : 0, q.enableAntiCheating ? 1 : 0, q.timingMode || 'quiz', JSON.stringify(q.sectionalConfig || []), q.questionTimeLimitSeconds || 60, q.preventPreviousSectionReturn ? 1 : 0, q.preventEarlyNextSection ? 1 : 0, q.preventPreviousQuestionReturn ? 1 : 0, q.preventEarlyNextQuestion ? 1 : 0,
        q.shuffleQuestions !== false ? 1 : 0, q.shuffleOptions !== false ? 1 : 0, q.enablePracticeMode ? 1 : 0, q.defaultLanguageMode || 'en', q.accessCode || null, q.allowedEmails ? JSON.stringify(q.allowedEmails) : null, q.questionViewMode || 'both', q.maxAttempts || 0, q.allowManualEarlyMove ? 1 : 0, q.resultAnnouncementDateTime || null, q.maxTabSwitches || 3,

        q.title, q.description, q.topic, q.category || 'General', q.difficulty || 'Medium', q.timeLimitMinutes, q.passingPercentage, q.negativeMarks, q.quizType || 'practice', q.isPublished ? 1 : 0, q.updatedAt,
        q.enableCertificate !== false ? 1 : 0, q.enableAntiCheating ? 1 : 0, q.timingMode || 'quiz', JSON.stringify(q.sectionalConfig || []), q.questionTimeLimitSeconds || 60, q.preventPreviousSectionReturn ? 1 : 0, q.preventEarlyNextSection ? 1 : 0, q.preventPreviousQuestionReturn ? 1 : 0, q.preventEarlyNextQuestion ? 1 : 0,
        q.shuffleQuestions !== false ? 1 : 0, q.shuffleOptions !== false ? 1 : 0, q.enablePracticeMode ? 1 : 0, q.defaultLanguageMode || 'en', q.accessCode || null, q.allowedEmails ? JSON.stringify(q.allowedEmails) : null, q.questionViewMode || 'both', q.maxAttempts || 0, q.allowManualEarlyMove ? 1 : 0, q.resultAnnouncementDateTime || null, q.maxTabSwitches || 3
      ]
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

app.delete('/api/quizzes/:id', async (req, res) => {
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

  const sessionKey = `${quizId}_${candidateEmail || candidateName}`;
  const isNewSession = !activeSessions.has(sessionKey);

  activeSessions.set(sessionKey, {
    quizId,
    quizTitle: quizTitle || 'CBT Exam',
    candidateName,
    candidateEmail,
    timeRemaining,
    percentageComplete,
    lastSeen: Date.now()
  });

  if (isNewSession) {
    recordAuditLog({
      eventType: 'exam_start',
      severity: 'info',
      actorName: candidateName,
      actorEmail: candidateEmail || null,
      actorRole: 'student',
      actionTitle: `📝 Exam Started: ${candidateName} initiated "${quizTitle || 'CBT Exam'}"`,
      detailsText: `Candidate launched exam session. Initial time remaining: ${timeRemaining || 'standard'}.`,
      ipAddress: req.ip || '127.0.0.1'
    });
  }

  res.json({ success: true });
});

app.get('/api/sessions/live', (req, res) => {
  const sessions = Array.from(activeSessions.values());
  res.json(sessions);
});

// --- Global Page Visits & Online User Heartbeats ---
app.post('/api/site/visit', async (req, res) => {
  try {
    let ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
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

    let rawIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
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
      email: email || null,
      role: role || 'guest',
      isRegistered: Boolean(isRegistered),
      ip: rawIp,
      country: country,
      browser: browser,
      os: os,
      deviceType: deviceType,
      currentPage: currentPage || 'Exam Portal',
      lastSeen: Date.now()
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
        clientId, rawIp, country, name || 'Guest Candidate', email || null, isRegistered ? 1 : 0,
        browser, os, deviceType, currentPage || 'Exam Portal', nowIso, nowIso
      ]
    );

    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM site_visits');
    res.json({
      success: true,
      totalVisitors: total,
      activeVisitorsCount: activeVisitors.size
    });
  } catch (err) {
    res.json({
      success: true,
      totalVisitors: 0,
      activeVisitorsCount: activeVisitors.size
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
      .filter(([_, v]) => nowMs - v.lastSeen < 60000)
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
app.delete('/api/admin/visitors/purge', async (req, res) => {
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

    const { eventType, severity, range, search } = req.query;

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

    // Filter by Date Range
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
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Purge Old Activity Audit Logs
app.delete('/api/admin/audit-logs/purge', async (req, res) => {
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
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '100', 10);
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT r.*, COALESCE(q.title, r.quiz_title) AS current_quiz_title 
       FROM results r 
       LEFT JOIN quizzes q ON r.quiz_id = q.id 
       ORDER BY r.percentage DESC, r.time_spent_seconds ASC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const results = rows.map(r => ({
      id: r.id,
      quizId: r.quiz_id,
      quizTitle: r.current_quiz_title || r.quiz_title,
      candidateName: r.candidate_name,
      candidateEmail: r.candidate_email,
      topic: r.topic,
      score: r.score,
      maxScore: r.max_score,
      percentage: r.percentage,
      passed: Boolean(r.passed),
      timeSpentSeconds: r.time_spent_seconds,
      correctAnswers: r.correct_answers,
      wrongAnswers: r.wrong_answers,
      skippedQuestions: r.skipped_questions,
      userAnswers: r.user_answers_json ? JSON.parse(r.user_answers_json) : {},
      attemptedAt: r.attempted_at,
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/results', async (req, res) => {
  try {
    const r = req.body;
    await pool.query(
      `INSERT INTO results (
        id, quiz_id, quiz_title, candidate_name, candidate_email, topic, score, max_score, percentage,
        passed, time_spent_seconds, correct_answers, wrong_answers, skipped_questions, user_answers_json, attempted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        score=?, percentage=?, passed=?, time_spent_seconds=?, correct_answers=?, wrong_answers=?, skipped_questions=?, user_answers_json=?`,
      [
        r.id, r.quizId, r.quizTitle, r.candidateName, r.candidateEmail || null, r.topic, r.score, r.maxScore, r.percentage,
        r.passed ? 1 : 0, r.timeSpentSeconds, r.correctAnswers, r.wrongAnswers, r.skippedQuestions, JSON.stringify(r.userAnswers || {}), r.attemptedAt,
        r.score, r.percentage, r.passed ? 1 : 0, r.timeSpentSeconds, r.correctAnswers, r.wrongAnswers, r.skippedQuestions, JSON.stringify(r.userAnswers || {})
      ]
    );

    recordAuditLog({
      eventType: 'exam_submit',
      severity: r.passed ? 'success' : 'warning',
      actorName: r.candidateName,
      actorEmail: r.candidateEmail || null,
      actorRole: 'student',
      actionTitle: `🎯 Exam Completed: ${r.candidateName} completed "${r.quizTitle}" (${r.percentage}%)`,
      detailsText: `Result: ${r.score}/${r.maxScore} (${r.percentage}%), Verdict: ${r.passed ? 'PASSED ✓' : 'FAILED ✗'}, Time Spent: ${r.timeSpentSeconds}s, Correct: ${r.correctAnswers}, Wrong: ${r.wrongAnswers}, Skipped: ${r.skippedQuestions}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true });
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
    const [[{ totalVisitors }]] = await pool.query('SELECT COUNT(*) as total FROM site_visits');
    const activeVisitorsCount = Array.from(activeVisitors.values()).filter(v => v.role !== 'admin').length;
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

app.post('/api/announcements', async (req, res) => {
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

app.delete('/api/announcements/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Bookmarks (per-user Revision Hub) ---
app.delete('/api/results/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM results WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookmarks', async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: 'uid required' });
  try {
    const [rows] = await pool.query('SELECT question_json FROM bookmarks WHERE uid = ? ORDER BY bookmarked_at DESC', [uid]);
    res.json(rows.map(r => JSON.parse(r.question_json)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookmarks', async (req, res) => {
  const { uid, questionId, question } = req.body;
  if (!uid || !questionId || !question) return res.status(400).json({ error: 'uid, questionId, and question required' });
  try {
    const id = `bm_${uid}_${questionId}`.slice(0, 150);
    await pool.query(
      `INSERT INTO bookmarks (id, uid, question_id, question_json, bookmarked_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE question_json = VALUES(question_json), bookmarked_at = VALUES(bookmarked_at)`,
      [id, uid, questionId, JSON.stringify(question), new Date().toISOString()]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bookmarks/:questionId', async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: 'uid required' });
  try {
    await pool.query('DELETE FROM bookmarks WHERE uid = ? AND question_id = ?', [uid, req.params.questionId]);
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
    const showAll = req.query.all === 'true';
    const slot = req.query.slot; // 'hero' | 'header_ad' | undefined

    let query = 'SELECT * FROM banners WHERE 1=1';
    const params = [];

    if (!showAll) {
      query += ' AND is_active = 1';
    }
    if (slot) {
      query += ' AND slot_type = ?';
      params.push(slot);
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
      createdAt: r.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/banners', async (req, res) => {
  const { title, subtitle, imageUrl, badgeText, ctaText, ctaLink, quizId, slotType = 'hero', isActive = true, displayOrder = 0 } = req.body;
  if (!title || !imageUrl) {
    return res.status(400).json({ error: 'title and imageUrl are required' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO banners (title, subtitle, image_url, badge_text, cta_text, cta_link, quiz_id, slot_type, is_active, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        subtitle || '',
        imageUrl,
        badgeText || 'ANNOUNCEMENT',
        ctaText || 'Take Test Now',
        ctaLink || '/',
        quizId || null,
        slotType || 'hero',
        isActive ? 1 : 0,
        parseInt(displayOrder || 0, 10),
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/banners/:id', async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, imageUrl, badgeText, ctaText, ctaLink, quizId, slotType, isActive, displayOrder } = req.body;
  try {
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
           display_order = ?
       WHERE id = ?`,
      [
        title || '',
        subtitle || '',
        imageUrl || '',
        badgeText || 'ANNOUNCEMENT',
        ctaText || 'Take Test Now',
        ctaLink || '/',
        quizId ? quizId : null,
        slotType || 'hero',
        isActive ? 1 : 0,
        parseInt(displayOrder || 0, 10),
        id,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/banners/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE banners SET is_active = NOT is_active WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/banners/:id', async (req, res) => {
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

app.post('/api/discussions/:quizId/:questionId', async (req, res) => {
  const { quizId, questionId } = req.params;
  const { userName, userEmail, role = 'candidate', comment } = req.body;
  if (!userName || !comment) {
    return res.status(400).json({ error: 'userName and comment are required' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO question_discussions (quiz_id, question_id, user_name, user_email, role, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [quizId, questionId, userName.trim(), userEmail ? userEmail.trim() : null, role, comment.trim()]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/discussions/:id/like', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE question_discussions SET likes_count = likes_count + 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/discussions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM question_discussions WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. LIVE PROCTORING & ANTI-CHEATING API
// ==========================================
app.post('/api/proctoring/log', async (req, res) => {
  const { sessionId, quizId, candidateName, candidateEmail, violationType, details, snapshotBase64 } = req.body;
  if (!quizId || !violationType) {
    return res.status(400).json({ error: 'quizId and violationType are required' });
  }
  try {
    await pool.query(
      `INSERT INTO proctoring_logs (session_id, quiz_id, candidate_name, candidate_email, violation_type, details, snapshot_base64)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId || 'session_' + Date.now(),
        quizId,
        candidateName || 'Anonymous Candidate',
        candidateEmail || null,
        violationType,
        details || '',
        snapshotBase64 || null,
      ]
    );

    recordAuditLog({
      eventType: 'proctoring_alert',
      severity: 'danger',
      actorName: candidateName || 'Candidate',
      actorEmail: candidateEmail || null,
      actorRole: 'student',
      actionTitle: `🚨 Anti-Cheating Alert: ${violationType} by ${candidateName || 'Candidate'}`,
      detailsText: details || `Proctoring violation event logged for quiz ID: ${quizId}. Snapshot: ${Boolean(snapshotBase64)}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/proctoring/logs/:quizId', async (req, res) => {
  const { quizId } = req.params;
  const { candidateEmail, sessionId } = req.query;
  try {
    let query = 'SELECT * FROM proctoring_logs WHERE quiz_id = ?';
    const params = [quizId];
    if (candidateEmail) {
      query += ' AND candidate_email = ?';
      params.push(candidateEmail);
    } else if (sessionId) {
      query += ' AND session_id = ?';
      params.push(sessionId);
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
app.get('/api/certificates/verify/:certId', async (req, res) => {
  const { certId } = req.params;
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
    res.json({
      valid: true,
      certificateId: r.id,
      candidateName: r.candidate_name,
      candidateEmail: r.candidate_email,
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Evalnium MySQL Express Backend Server running on http://0.0.0.0:${PORT}`);
});

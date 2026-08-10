import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'evalnium@2026',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

const DB_NAME = process.env.DB_NAME || 'evalnium_db';

let pool;

// In-Memory OTP Store: email -> { otp, expiresAt }
const otpStore = new Map();
// Rate Limiter Store: email -> { count, windowStart }
const otpRateLimitStore = new Map();

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
        question_view_mode VARCHAR(50) DEFAULT 'both'
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

    // Performance Indexing
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

    await syncCandidatesToUsersTable();

    console.log(`✅ All MySQL Database Tables & Indexes Verified & Ready!`);
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
    const { name, email, uid } = req.body;
    if (!email || !name || !uid) return res.status(400).json({ error: 'Missing required fields' });

    const normalizedEmail = email.toLowerCase().trim();
    const createdAt = new Date().toISOString();

    await pool.query(
      `INSERT INTO users (uid, name, email, role, is_verified, created_at) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = ?, is_verified = 1`,
      [uid, name.trim(), normalizedEmail, 'candidate', 1, createdAt, name.trim()]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const user = rows[0];
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

// Clear stale sessions every 1 minute
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of activeSessions.entries()) {
    if (now - session.lastSeen > 2 * 60 * 1000) { // 2 minutes timeout
      activeSessions.delete(key);
    }
  }
}, 60 * 1000);

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
        difficulty: q.difficulty,
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
        id, title, description, topic, time_limit_minutes, passing_percentage, negative_marks, quiz_type, is_published, created_at, updated_at, author,
        enable_certificate, enable_anti_cheating, timing_mode, sectional_config_json, question_time_limit_seconds, prevent_prev_section, prevent_early_next_section, prevent_prev_question, prevent_early_next_question,
        shuffle_questions, shuffle_options, enable_practice_mode, default_language_mode, access_code, allowed_emails, question_view_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        title=?, description=?, topic=?, time_limit_minutes=?, passing_percentage=?, negative_marks=?, quiz_type=?, is_published=?, updated_at=?,
        enable_certificate=?, enable_anti_cheating=?, timing_mode=?, sectional_config_json=?, question_time_limit_seconds=?, prevent_prev_section=?, prevent_early_next_section=?, prevent_prev_question=?, prevent_early_next_question=?,
        shuffle_questions=?, shuffle_options=?, enable_practice_mode=?, default_language_mode=?, access_code=?, allowed_emails=?, question_view_mode=?`,
      [
        q.id, q.title, q.description, q.topic, q.timeLimitMinutes, q.passingPercentage, q.negativeMarks, q.quizType || 'practice', q.isPublished ? 1 : 0, q.createdAt, q.updatedAt, q.author || 'Admin',
        q.enableCertificate !== false ? 1 : 0, q.enableAntiCheating ? 1 : 0, q.timingMode || 'quiz', JSON.stringify(q.sectionalConfig || []), q.questionTimeLimitSeconds || 60, q.preventPreviousSectionReturn ? 1 : 0, q.preventEarlyNextSection ? 1 : 0, q.preventPreviousQuestionReturn ? 1 : 0, q.preventEarlyNextQuestion ? 1 : 0,
        q.shuffleQuestions !== false ? 1 : 0, q.shuffleOptions !== false ? 1 : 0, q.enablePracticeMode ? 1 : 0, q.defaultLanguageMode || 'en', q.accessCode || null, q.allowedEmails ? JSON.stringify(q.allowedEmails) : null, q.questionViewMode || 'both',
        
        q.title, q.description, q.topic, q.timeLimitMinutes, q.passingPercentage, q.negativeMarks, q.quizType || 'practice', q.isPublished ? 1 : 0, q.updatedAt,
        q.enableCertificate !== false ? 1 : 0, q.enableAntiCheating ? 1 : 0, q.timingMode || 'quiz', JSON.stringify(q.sectionalConfig || []), q.questionTimeLimitSeconds || 60, q.preventPreviousSectionReturn ? 1 : 0, q.preventEarlyNextSection ? 1 : 0, q.preventPreviousQuestionReturn ? 1 : 0, q.preventEarlyNextQuestion ? 1 : 0,
        q.shuffleQuestions !== false ? 1 : 0, q.shuffleOptions !== false ? 1 : 0, q.enablePracticeMode ? 1 : 0, q.defaultLanguageMode || 'en', q.accessCode || null, q.allowedEmails ? JSON.stringify(q.allowedEmails) : null, q.questionViewMode || 'both'
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Live Sessions Tracking ---
app.post('/api/sessions/heartbeat', (req, res) => {
  const { quizId, candidateName, candidateEmail, timeRemaining, percentageComplete } = req.body;
  if (!quizId || !candidateName) return res.status(400).json({ error: 'Missing required fields' });
  
  const sessionKey = `${quizId}_${candidateEmail || candidateName}`;
  activeSessions.set(sessionKey, {
    quizId,
    candidateName,
    candidateEmail,
    timeRemaining,
    percentageComplete,
    lastSeen: Date.now()
  });
  
  res.json({ success: true });
});

app.get('/api/sessions/live', (req, res) => {
  const sessions = Array.from(activeSessions.values());
  res.json(sessions);
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

    res.json({
      totalUsers,
      totalQuizzes,
      totalAttempts,
      avgScore: Math.round(avgScore * 10) / 10,
      passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
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



const PORT = process.env.PORT || 5050;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Evalnium MySQL Express Backend Server running on http://0.0.0.0:${PORT}`);
});

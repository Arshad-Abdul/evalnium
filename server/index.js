import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'evalnium@2026',
  port: 3306,
};

const DB_NAME = 'evalnium_db';

let pool;

// In-Memory OTP Store: email -> { otp, expiresAt }
const otpStore = new Map();

// Transporter configuration: Uses SMTP env or fallback
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

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
        author VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

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
        created_at VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log(`✅ All MySQL Database Tables Verified & Ready!`);
  } catch (err) {
    console.error('❌ Failed to initialize MySQL Database:', err);
  }
}

initDatabase();

// --- OTP AUTH ENDPOINTS ---
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins validity

    otpStore.set(email.toLowerCase(), { otp, expiresAt });
    console.log(`[EMAIL DISPATCH] 📩 OTP generated for ${email}: ${otp}`);

    // If SMTP credentials provided, send actual email
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `"Evalnium Assessment Portal" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `🔑 Your Verification Code: ${otp} - Evalnium`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2 style="color: #0f172a; margin-top: 0;">Evalnium Student Verification</h2>
            <p style="color: #475569; font-size: 14px;">Your 6-digit login verification code is:</p>
            <div style="font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: 8px; color: #2563eb; background: #f8fafc; padding: 16px; text-align: center; border-radius: 12px; border: 1px solid #cbd5e1; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 12px;">This code will expire in 5 minutes. Do not share this OTP with anyone.</p>
          </div>
        `,
      });
    }

    res.json({ success: true, message: 'OTP sent to candidate email inbox successfully.', devOtp: process.env.NODE_ENV === 'development' ? otp : undefined });
  } catch (err) {
    console.error('Error sending OTP email:', err);
    res.status(500).json({ error: 'Failed to send OTP email' });
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

// API Endpoints

// 1. Quizzes
app.get('/api/quizzes', async (req, res) => {
  try {
    const [quizRows] = await pool.query('SELECT * FROM quizzes ORDER BY created_at DESC');
    
    const quizzes = [];
    for (const q of quizRows) {
      const [qRows] = await pool.query('SELECT * FROM questions WHERE quiz_id = ?', [q.id]);
      const questions = [];
      for (const quest of qRows) {
        const [optRows] = await pool.query('SELECT option_letter as id, option_text as text FROM options WHERE question_id = ?', [quest.id]);
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
        questions,
      });
    }

    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quizzes', async (req, res) => {
  try {
    const q = req.body;
    await pool.query(
      `INSERT INTO quizzes (id, title, description, topic, category, difficulty, time_limit_minutes, passing_percentage, negative_marks, quiz_type, scheduled_start_datetime, scheduled_end_datetime, is_published, created_at, updated_at, author)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=?, description=?, topic=?, time_limit_minutes=?, passing_percentage=?, negative_marks=?, quiz_type=?, is_published=?, updated_at=?`,
      [
        q.id, q.title, q.description, q.topic, q.category, q.difficulty, q.timeLimitMinutes, q.passingPercentage, q.negativeMarks, q.quizType || 'practice', q.scheduledStartDateTime, q.scheduledEndDateTime, q.isPublished ? 1 : 0, q.createdAt, q.updatedAt, q.author,
        q.title, q.description, q.topic, q.timeLimitMinutes, q.passingPercentage, q.negativeMarks, q.quizType || 'practice', q.isPublished ? 1 : 0, q.updatedAt
      ]
    );

    // Replace questions
    await pool.query('DELETE FROM questions WHERE quiz_id = ?', [q.id]);
    for (const quest of q.questions) {
      await pool.query(
        `INSERT INTO questions (id, quiz_id, question_text, question_english, question_hindi, correct_option_id, explanation, explanation_english, explanation_hindi, topic, marks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [quest.id, q.id, quest.questionText, quest.questionEnglish, quest.questionHindi, quest.correctOptionId, quest.explanation, quest.explanationEnglish, quest.explanationHindi, quest.topic || q.topic, quest.marks || 1]
      );

      for (const opt of quest.options) {
        await pool.query(
          `INSERT INTO options (question_id, option_letter, option_text) VALUES (?, ?, ?)`,
          [quest.id, opt.id, opt.text]
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// 2. Results / Leaderboard
app.get('/api/results', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM results ORDER BY percentage DESC, time_spent_seconds ASC');
    const results = rows.map(r => ({
      id: r.id,
      quizId: r.quiz_id,
      quizTitle: r.quiz_title,
      candidateName: r.candidate_name,
      topic: r.topic,
      score: r.score,
      maxScore: r.max_score,
      percentage: r.percentage,
      passed: Boolean(r.passed),
      timeSpentSeconds: r.time_spent_seconds,
      correctAnswers: r.correct_answers,
      wrongAnswers: r.wrong_answers,
      skippedQuestions: r.skipped_questions,
      attemptedAt: r.attempted_at,
      userAnswers: JSON.parse(r.user_answers_json || '{}'),
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
      `INSERT INTO results (id, quiz_id, quiz_title, candidate_name, topic, score, max_score, percentage, passed, time_spent_seconds, correct_answers, wrong_answers, skipped_questions, user_answers_json, attempted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id, r.quizId, r.quizTitle, r.candidateName, r.topic, r.score, r.maxScore, r.percentage, r.passed ? 1 : 0, r.timeSpentSeconds, r.correctAnswers, r.wrongAnswers, r.skippedQuestions, JSON.stringify(r.userAnswers || {}), r.attemptedAt
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Announcements
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Evalnium MySQL Express Backend Server running on http://0.0.0.0:${PORT}`);
});

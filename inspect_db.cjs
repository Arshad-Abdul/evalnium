const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'evalnium@2026',
  database: process.env.DB_NAME || 'evalnium_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

async function inspect() {
  const connection = await mysql.createConnection(DB_CONFIG);
  try {
    const [topPerformers] = await connection.query(`
      SELECT candidate_name as candidateName, candidate_email as candidateEmail, COUNT(*) as attemptsCount, AVG(percentage) as avgScore 
      FROM results 
      GROUP BY candidate_name, candidate_email 
      ORDER BY avgScore DESC, attemptsCount DESC 
      LIMIT 5
    `);
    console.log('--- TOP PERFORMERS ---');
    console.log(JSON.stringify(topPerformers, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

inspect();

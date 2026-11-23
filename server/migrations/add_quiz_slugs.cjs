const mysql = require('mysql2/promise');
require('dotenv').config();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')           // Remove quotes
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'evalnium_db'
  });

  const [cols] = await pool.query("SHOW COLUMNS FROM quizzes LIKE 'slug'");
  if (cols.length === 0) {
    console.log('Adding slug column to quizzes table...');
    await pool.query('ALTER TABLE quizzes ADD COLUMN slug VARCHAR(255) NULL UNIQUE AFTER title');
    console.log('Column added successfully.');
  } else {
    console.log('slug column already exists.');
  }

  const [quizzes] = await pool.query('SELECT id, title, slug FROM quizzes');
  console.log(`Found ${quizzes.length} quizzes in database.`);

  const usedSlugs = new Set();
  for (const q of quizzes) {
    let baseSlug = slugify(q.title || 'exam');
    if (!baseSlug) baseSlug = `exam-${q.id.slice(-6)}`;
    
    let candidateSlug = baseSlug;
    let counter = 1;
    while (usedSlugs.has(candidateSlug)) {
      candidateSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    usedSlugs.add(candidateSlug);

    await pool.query('UPDATE quizzes SET slug = ? WHERE id = ?', [candidateSlug, q.id]);
    console.log(`✅ [${q.id}] "${q.title}" -> "${candidateSlug}"`);
  }

  console.log('Migration completed successfully.');
  process.exit(0);
})().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});


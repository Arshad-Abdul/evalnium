const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'evalnium_db'
  });

  const [quizzes] = await pool.query('SELECT id, slug, updated_at FROM quizzes WHERE is_published = 1');
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { loc: 'https://evalnium.com/', changefreq: 'daily', priority: '1.0' },
    { loc: 'https://evalnium.com/exams', changefreq: 'daily', priority: '0.9' },
    { loc: 'https://evalnium.com/rankings', changefreq: 'hourly', priority: '0.9' },
    { loc: 'https://evalnium.com/doubts', changefreq: 'daily', priority: '0.8' },
    { loc: 'https://evalnium.com/about', changefreq: 'monthly', priority: '0.7' },
    { loc: 'https://evalnium.com/saved', changefreq: 'weekly', priority: '0.6' },
    { loc: 'https://evalnium.com/dashboard', changefreq: 'daily', priority: '0.7' }
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const p of staticPages) {
    xml += `  <url>\n    <loc>${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  }

  for (const q of quizzes) {
    const slug = q.slug || q.id;
    const mod = q.updated_at ? new Date(q.updated_at).toISOString().split('T')[0] : today;
    xml += `  <url>\n    <loc>https://evalnium.com/exam/${slug}</loc>\n    <lastmod>${mod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
  }

  xml += '</urlset>\n';
  fs.writeFileSync('public/sitemap.xml', xml, 'utf8');
  console.log('✅ Updated public/sitemap.xml with ' + quizzes.length + ' published exams.');
  process.exit(0);
})().catch(err => {
  console.error('Error updating sitemap:', err);
  process.exit(1);
});


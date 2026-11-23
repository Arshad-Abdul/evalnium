const https = require('https');

https.get('https://evalnium.com/exam/ugc-net-pyq-q1-25-2023', {
  headers: {
    'User-Agent': 'WhatsApp/2.21.12.21 A'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Headers:', res.headers);
    const titleMatch = data.match(/<title>([^<]*)<\/title>/i);
    const ogTitle = data.match(/<meta property="og:title" content="([^"]*)"/i);
    const ogDesc = data.match(/<meta property="og:description" content="([^"]*)"/i);
    console.log('Title:', titleMatch ? titleMatch[1] : 'NONE');
    console.log('og:title:', ogTitle ? ogTitle[1] : 'NONE');
    console.log('og:description:', ogDesc ? ogDesc[1] : 'NONE');
    process.exit(0);
  });
}).on('error', err => {
  console.error(err);
  process.exit(1);
});

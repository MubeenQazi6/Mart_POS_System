const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { generateSignedLicense } = require('./generator');

const PORT = process.env.PORT || 4899;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/generate') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const input = JSON.parse(body);
        const result = generateSignedLicense(input);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: result }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message || 'Generation failed' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n=============================================================`);
  console.log(`  🔑 MARTPOS Offline License Generator (Developer Web GUI)`);
  console.log(`  Access the GUI at: ${url}`);
  console.log(`=============================================================\n`);

  // Auto-open browser on launch if supported
  const openCommand = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
  require('node:child_process').exec(openCommand, () => {});
});

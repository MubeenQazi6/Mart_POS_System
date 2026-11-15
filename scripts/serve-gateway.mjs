import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '..', 'dist-gateway');
const PORT = 5000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let cleanUrl = req.url?.split('?')[0] || '/';
  if (cleanUrl.endsWith('/')) {
    cleanUrl += 'index.html';
  }

  let filePath = path.join(baseDir, cleanUrl);

  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  } else if (!fs.existsSync(filePath) && fs.existsSync(path.join(filePath, 'index.html'))) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🌐 Zenthropic Gateway Live on: http://localhost:${PORT}`);
  console.log(`   🛒 MartPOS Live:          http://localhost:${PORT}/martpos/`);
  console.log(`   🧪 MartPOS UAT:           http://localhost:${PORT}/martpos-uat/`);
  console.log(`   📦 WarehouseOS Live:      http://localhost:${PORT}/warehouse/`);
  console.log(`   🧪 WarehouseOS UAT:       http://localhost:${PORT}/warehouse-uat/`);
});

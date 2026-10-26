import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  scanWorkspace,
  doctorGame,
  generateKitBundle,
  installKitToGame,
  DEFAULT_WORKSPACE
} from './bin/vgdk.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 4175;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = decodeURIComponent(urlObj.pathname);

    // API Endpoints for the Interactive Game-Dev Command Center
    if (pathname === '/api/workspace-games' && req.method === 'GET') {
      const games = scanWorkspace(DEFAULT_WORKSPACE);
      return sendJson(res, 200, { workspace: DEFAULT_WORKSPACE, count: games.length, games });
    }

    if (pathname === '/api/doctor' && (req.method === 'GET' || req.method === 'POST')) {
      const body = req.method === 'POST' ? await readJsonBody(req) : {};
      const targetPath = body.gamePath || urlObj.searchParams.get('gamePath') || DEFAULT_WORKSPACE;
      const report = doctorGame(targetPath);
      return sendJson(res, 200, report);
    }

    if (pathname === '/api/preview-install' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const targetPath = body.gamePath || DEFAULT_WORKSPACE;
      const bundle = generateKitBundle(targetPath, body.config || {});
      return sendJson(res, 200, bundle);
    }

    if (pathname === '/api/install-kit' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const targetPath = body.gamePath || DEFAULT_WORKSPACE;
      const dryRun = Boolean(body.dryRun);
      const result = installKitToGame(targetPath, { dryRun, customConfig: body.config || {} });
      return sendJson(res, 200, result);
    }

    // Static file serving from public/
    let relPath = pathname === '/' || pathname === '/guide' || pathname === '/changelog' ? '/index.html' : pathname;
    const filePath = path.normalize(path.join(PUBLIC_DIR, relPath));
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Not found: ${pathname}`);
    }
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Vibe Game-Dev Kit & Island Command Center running at http://127.0.0.1:${PORT}`);
});

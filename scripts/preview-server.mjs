// Local production preview, including Vercel's rewrites. No separate deployed server.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { loadEnv } from 'vite';
import { handle } from '../server-dist/handler.js';

const root = resolve('dist');
const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/clanci' || path.startsWith('/clanci/') || path === '/admin' || path.startsWith('/admin/') || path === '/sitemap.xml' || path === '/api/cms') { await handle(req, res, { env }); return; }
  try {
    const file = resolve(root, `.${decodeURIComponent(path === '/' ? '/index.html' : path)}`);
    if (!file.startsWith(root + sep)) { res.statusCode = 403; res.end(); return; }
    const content = await readFile(file);
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.end(content);
  } catch { res.statusCode = 404; res.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Production preview: http://127.0.0.1:4173'));

// Serves the repo for the test harness with caching off, so edits show on reload.
// Usage: npm run harness  ->  http://127.0.0.1:8765/test/harness/index.html?page=home
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const PORT = Number(process.env.PORT) || 8765;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

// The newest modification time of the extension's files; dev/reload.js polls it
// and reloads the unpacked extension when it changes.
const WATCHED = ['manifest.json', 'src', 'popup', 'faq', 'icons', 'dev'];
async function version() {
  let newest = 0;
  const walk = async (p) => {
    const s = await stat(p);
    if (s.isDirectory()) for (const e of await readdir(p)) await walk(join(p, e));
    else newest = Math.max(newest, s.mtimeMs);
  };
  for (const w of WATCHED) await walk(join(ROOT, w)).catch(() => {});
  return String(Math.round(newest));
}

createServer(async (req, res) => {
  if (req.url === '/__dev/version') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
    res.end(await version());
    return;
  }
  const path =normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(ROOT, path);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, '127.0.0.1', () => console.log('Harness: http://127.0.0.1:' + PORT + '/test/harness/index.html?page=home'));

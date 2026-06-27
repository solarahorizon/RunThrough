/**
 * Tiny zero-dependency static file server. Serves a directory over HTTP so
 * Playwright can drive the built artifact exactly as a browser would.
 *
 *   node Scripts/serve.mjs <dir> [port]
 *
 * Importable too: `import { serve } from './serve.mjs'` → returns the http
 * server so a runner can start it, run specs, then server.close().
 *
 * Deliberately dumb: GET/HEAD of files only. Anything else returns 501 — which
 * is intentional. Your API calls should be mocked in-test (see Mode A); a 501
 * from this server means a spec forgot to mock a backend call.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

export function serve(root, port = 8765) {
  const server = createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(501, { 'content-type': 'text/plain' });
      return res.end('501 — static server only serves GET/HEAD. Mock your API in-test.');
    }
    try {
      // strip query, prevent path traversal, default to index.html
      let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let filePath = normalize(join(root, pathname)).replace(/\0/g, '');
      if (!filePath.startsWith(normalize(root))) { res.writeHead(403); return res.end('403'); }
      let info = await stat(filePath).catch(() => null);
      if (info && info.isDirectory()) { filePath = join(filePath, 'index.html'); info = await stat(filePath).catch(() => null); }
      if (!info) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('404'); }
      const body = await readFile(filePath);
      res.writeHead(200, { 'content-type': TYPES[extname(filePath)] || 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('500 ' + e.message);
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

// CLI: node Scripts/serve.mjs <dir> [port]
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] || '.';
  const port = Number(process.argv[3] || 8765);
  await serve(dir, port);
  console.log(`serving ${dir} on http://localhost:${port}`);
}

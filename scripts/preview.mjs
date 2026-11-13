import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.STEPIK_PREVIEW_PORT || 8766);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp' };
http.createServer(async (req,res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const relative = pathname === '/' ? 'go-mini-module-01-lesson-01-preview.html' : /^\/information\/?$/.test(pathname) ? 'go-mini-module-02-lesson-01-preview.html' : pathname.replace(/^\/+/,'');
    const file = path.resolve(root,relative);
    const ext = path.extname(file);
    if (!file.startsWith(root+path.sep) || relative.split('/').some(p=>p.startsWith('.')) || !types[ext] || !(relative.startsWith('assets/') || /^go-mini-module-01-lesson-01-(step-0[1-6]|preview)\.html$/.test(relative) || /^go-mini-module-02-lesson-01-(step-(0[1-9]|10)|preview)\.html$/.test(relative))) {
      res.writeHead(404);res.end('Not found');return;
    }
    if (!(await stat(file)).isFile()) throw new Error('not_file');
    res.writeHead(200,{'Content-Type':types[ext],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:await readFile(file));
  } catch {
    res.writeHead(404);res.end('Not found');
  }
}).listen(port,'127.0.0.1',()=>console.log('Local: http://localhost:'+port+'/'));

// Read-only loopback server. Explicit public assets only, no credentials or API writes.
import http from 'node:http';
import path from 'node:path';
import {readFile, realpath, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {pages} from '../../courses/305734-go-pro-max/introduction/content.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const folder = 'courses/305734-go-pro-max/introduction/';
const port = Number(process.env.GO_MAX_INTRO_PORT || 8796);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid port');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const allowed = new Set([...pages.map(page => folder + page.file), ...['preview.html','preview.css','preview.js','introduction.css','introduction.js','course-map-catalog.js'].map(file => folder + file)]);
const server = http.createServer(async (request, response) => {
  const send = (status, type, body) => { response.writeHead(status, {'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); response.end(request.method === 'HEAD' ? undefined : body); };
  try {
    if (![ '127.0.0.1:' + port, 'localhost:' + port].includes(request.headers.host)) return send(403,'text/plain','Forbidden');
    if (!['GET','HEAD'].includes(request.method)) return send(405,'text/plain','Read only');
    const url = new URL(request.url, 'http://' + request.headers.host);
    if (url.pathname === '/api/go-pro-max-intro') return send(200,'application/json; charset=utf-8',JSON.stringify({pages,localOnly:true}));
    const relative = ['/', '/go-pro-max'].includes(url.pathname) ? folder + 'preview.html' : decodeURIComponent(url.pathname).replace(/^\//,'');
    if (!allowed.has(relative) && !/^shared\/course-introductions\/(?:base\.css|embedded\.(?:js|css)|interactions\.js)$/.test(relative) && !/^assets\/(?:go-mini-course-catalog\.js|course-covers\/\d+\.png)$/.test(relative)) return send(404,'text/plain','Not found');
    const absolute = path.resolve(root, relative);
    if (!absolute.startsWith(root + path.sep) || await realpath(absolute) !== absolute || !(await stat(absolute)).isFile()) return send(404,'text/plain','Not found');
    return send(200,types[path.extname(relative)] || 'text/plain',await readFile(absolute));
  } catch { send(404,'text/plain','Not found'); }
});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { server.close(); server.closeAllConnections(); });
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Порт занят. Задайте GO_MAX_INTRO_PORT.' : error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log('Local: http://localhost:' + port + '/\nGo Pro MAX · 6 шагов. Stepik без изменений.'));

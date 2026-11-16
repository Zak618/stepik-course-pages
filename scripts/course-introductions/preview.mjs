// Loopback-only preview. No Stepik token, API writes, deployment, or file writes.
import http from 'node:http';
import path from 'node:path';
import {readFile,realpath,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parts,loadPreview,renderPart,renderInteractions} from './render.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(root);
const port = Number(process.env.STEPIK_UNIFIED_PORT || 8795);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid port');
const {profiles} = await loadPreview();
const legacy=JSON.parse(await readFile('courses/305666-go-mini/legacy-paths.json','utf8'));
const files = new Set(['previews/course-introductions/index.html','shared/course-introductions/preview.css','shared/course-introductions/preview.js','shared/course-introductions/study.css','assets/go-mini-intro.css','assets/go-mini-intro.js','assets/go-mini-embed.css','assets/go-mini-embed.js','assets/go-mini-course-catalog.js','shared/course-introductions/base.css','shared/course-introductions/embedded.css','shared/course-introductions/embedded.js','shared/course-introductions/interactions.js']);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server = http.createServer(async(req,res) => {
  const send = (status,type,body) => {res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method === 'HEAD' ? undefined : body);};
  try {
    if (![`localhost:${port}`,`127.0.0.1:${port}`].includes(req.headers.host)) return send(403,'text/plain','Forbidden');
    if (!['GET','HEAD'].includes(req.method)) return send(405,'text/plain','Read only');
    const url = new URL(req.url, 'http://' + req.headers.host);
    if (url.pathname === '/api/intro-preview') return send(200,'application/json; charset=utf-8',JSON.stringify({courses:profiles,parts:parts.map(p=>p.slice(0,2)),excluded:[300562,305734],publication:false}));
    if (['/intro-page','/preview-interactions.js'].includes(url.pathname)) {
      const course = profiles.find(c => c.id === Number(url.searchParams.get('course')));
      if (!course) return send(404,'text/plain','Курс не входит в локальный просмотр');
      if (url.pathname.endsWith('.js')) return send(200,types['.js'],await renderInteractions(course));
      const part = url.searchParams.get('part') || 'welcome';
      if (!parts.some(p=>p[0]===part)) return send(404,'text/plain','Unknown part');
      return send(200,types['.html'],await renderPart(course,part));
    }
    const relative = url.pathname === '/' ? 'previews/course-introductions/index.html' : decodeURIComponent(url.pathname).replace(/^\//,'');
    if(legacy[relative]){
      let html=await readFile('compat/go-mini/'+relative,'utf8');
      html=html.replace(/^---\n[\s\S]*?\n---\n/,'').replace(/\{\{ '([^']+)' \| relative_url \}\}/g,'$1');
      return send(200,types['.html'],html);
    }
    const cover = /^assets\/course-covers\/(\d+)\.png$/.exec(relative);
    const mini=/^courses\/305666-go-mini\/(?:promo\.html|modules\/0[1-6]-[a-z-]+\/[a-z0-9-]+\.html)$/.test(relative)||/^assets\/go-mini-[a-z0-9-]+\.(?:js|css|svg)$/.test(relative);
    if (!files.has(relative) && !mini && !/^courses\/\d+-[a-z0-9-]+\/introduction\/(?:0[1-7]-[a-z-]+\.html|profile\.js)$/.test(relative) && !(cover && (Number(cover[1])===300562 || profiles.some(c=>c.id===Number(cover[1]))))) return send(404,'text/plain','Not found');
    const absolute = path.resolve(root,relative);
    if (!absolute.startsWith(root+path.sep) || await realpath(absolute)!==absolute || !(await stat(absolute)).isFile()) return send(404,'text/plain','Not found');
    return send(200,types[path.extname(relative)],await readFile(absolute));
  } catch { if (!res.headersSent) send(500,'text/plain','Не удалось открыть страницу'); else res.end(); }
});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{server.close();server.closeAllConnections();});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Порт занят. Задайте STEPIK_UNIFIED_PORT.':'Не удалось открыть локальный просмотр');process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}/\n${profiles.length-1} курсов + mini как образец. Stepik без изменений.`));

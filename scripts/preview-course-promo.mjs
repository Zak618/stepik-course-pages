// Static, loopback-only preview of the course description demo. No credentials.
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {realpath,open} from 'node:fs/promises';
import {constants} from 'node:fs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.STEPIK_COURSE_PROMO_PORT||8788);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid preview port');
const routes=new Map([['/','go-mini-course-promo.html'],['/promo','go-mini-course-promo.html']]);
const allowed=new Set([...routes.values(),'assets/go-mini-course-promo.css','assets/go-mini-course-promo.js']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const server=http.createServer({maxHeaderSize:8192},async(req,res)=>{
  const end=(status,text)=>{res.writeHead(status,{...headers,'Content-Type':'text/plain; charset=utf-8'});res.end(text);};
  try{
    if(![`localhost:${port}`,`127.0.0.1:${port}`].includes(req.headers.host))return end(403,'Forbidden');
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return end(403,'Forbidden');
    if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return end(405,'Method not allowed');}
    if(!req.url.startsWith('/')||req.url.startsWith('//'))return end(400,'Bad URL');
    const url=new URL(req.url,`http://${req.headers.host}`),relative=routes.get(url.pathname)||decodeURIComponent(url.pathname).replace(/^\//,'');
    if(!allowed.has(relative))return end(404,'Not found');
    const absolute=path.join(root,relative);if(await realpath(absolute)!==absolute)return end(404,'Not found');
    const handle=await open(absolute,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);let body;
    try{const stat=await handle.stat();if(!stat.isFile()||stat.size>1024*1024)return end(404,'Not found');if(req.method==='GET'){const buffer=Buffer.alloc(stat.size+1);let bytes=0;while(bytes<buffer.length){const part=await handle.read(buffer,bytes,buffer.length-bytes,bytes);if(!part.bytesRead)break;bytes+=part.bytesRead;}if(bytes>stat.size)return end(413,'Too large');body=buffer.subarray(0,bytes);}}finally{await handle.close();}
    res.writeHead(200,{...headers,'Content-Type':mime[path.extname(relative)],'Content-Security-Policy':`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; font-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'`});res.end(body);
  }catch{if(!res.headersSent)end(404,'Not found');else res.end();}
});
server.maxConnections=32;server.requestTimeout=10000;server.headersTimeout=10000;server.keepAliveTimeout=3000;
for(const signal of['SIGINT','SIGTERM'])process.on(signal,()=>{server.close();server.closeAllConnections();});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Порт занят. Задайте STEPIK_COURSE_PROMO_PORT.':'Не удалось запустить просмотр.');process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}/promo`));

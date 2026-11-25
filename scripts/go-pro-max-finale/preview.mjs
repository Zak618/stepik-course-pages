import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),folder='courses/305734-go-pro-max/modules/29-finale/',port=8810;
const allowed=new Set(['index.html','01-summary.html','02-feedback.html','03-telegram.html','04-next.html','finale.css','finale.js','content.mjs','embeds/project.html','embeds/telegram.html','embeds/courses.html','embeds/courses.css']);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'};
createServer(async(req,res)=>{
 const send=(status,type,body)=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src 'self'; base-uri 'none'; form-action 'none'"});res.end(req.method==='HEAD'?undefined:body);};
 try{
  if(!['localhost:'+port,'127.0.0.1:'+port].includes(req.headers.host))return send(403,'text/plain','Forbidden');
  if(!['GET','HEAD'].includes(req.method))return send(405,'text/plain','Read only');
  const path=new URL(req.url,'http://'+req.headers.host).pathname,name=path==='/'?'index.html':path.slice(1),asset=/^assets\/course-covers\/(200517|183142)\.png$/.test(name);
  if(!asset&&!allowed.has(name))return send(404,'text/plain','Not found');
  const file=resolve(root,asset?name:folder+name);if(!file.startsWith(root)||await realpath(file)!==file)return send(404,'text/plain','Not found');
  send(200,types[extname(file)],await readFile(file));
 }catch{send(404,'text/plain','Not found');}
}).listen(port,'127.0.0.1',()=>console.log('Go Pro MAX finale draft http://localhost:'+port+'/ · Stepik unchanged'));

// Local, read-only and allowlisted. No account files or Stepik API access.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=new URL('../../',import.meta.url);
const port=Number(process.env.COURSE_PROMO_PORT||8814);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
const sandbox={window:{}};
vm.runInNewContext(await readFile(new URL('assets/go-mini-course-catalog.js',root),'utf8'),sandbox);
const courses=sandbox.window.INTRO_CATALOG.courses.filter(course=>course.id!==305734).map(({id,title})=>({id,title}));
const files=new Set(['previews/course-promotions/index.html','previews/course-promotions/preview.css','previews/course-promotions/preview.js','shared/course-promotions/go-pro-max/card.html','shared/course-promotions/go-pro-max/card.css','shared/course-promotions/go-pro-max/card.js','shared/course-promotions/go-pro-max/offer.mjs','assets/course-covers/305734.png']);
for(const name of ['offer-10.html','offer-20.html'])files.add('shared/course-promotions/go-pro-max/'+name);
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',png:'image/png'};
const server=createServer(async(req,res)=>{
  const send=(status,type,body)=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);};
  try{
    if(!['localhost:'+port,'127.0.0.1:'+port].includes(req.headers.host))return send(403,'text/plain','Forbidden');
    if(!['GET','HEAD'].includes(req.method))return send(405,'text/plain','Read only');
    const path=new URL(req.url,'http://'+req.headers.host).pathname;
    if(path==='/api/preview-courses')return send(200,'application/json',JSON.stringify({courses,stepikWrites:0}));
    const file=path==='/'?'previews/course-promotions/index.html':path.slice(1);
    if(!files.has(file))return send(404,'text/plain','Not found');
    return send(200,types[file.split('.').pop()],await readFile(new URL(file,root)));
  }catch{send(500,'text/plain','Preview error');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port occupied. Set COURSE_PROMO_PORT.':error.message);process.exitCode=1;});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close();server.closeAllConnections();});
server.listen(port,'127.0.0.1',()=>console.log('Local preview: http://localhost:'+port+'/\n'+courses.length+' курсов. Stepik без изменений.\nRoot: '+fileURLToPath(root)));

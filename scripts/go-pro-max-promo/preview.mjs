// Loopback-only preview. Serve only this draft, never local secrets or snapshots.
import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../courses/305734-go-pro-max/promo');
const port=Number(process.env.GO_MAX_PROMO_PORT||8797);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
const types={'index.html':'text/html; charset=utf-8','embed.html':'text/html; charset=utf-8','fields.html':'text/html; charset=utf-8','styles.css':'text/css; charset=utf-8','interactions.js':'text/javascript; charset=utf-8','course-fields.json':'application/json; charset=utf-8'};
const server=http.createServer(async(request,response)=>{
  const send=(status,type,body)=>{response.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(request.method==='HEAD'?undefined:body);};
  if(!['localhost:'+port,'127.0.0.1:'+port].includes(request.headers.host))return send(403,'text/plain','Forbidden');
  if(!['GET','HEAD'].includes(request.method))return send(405,'text/plain','Read only');
  try{
    const pathname=new URL(request.url,'http://'+request.headers.host).pathname;
    const file=pathname==='/'?'index.html':pathname.slice(1);
    if(!Object.hasOwn(types,file))return send(404,'text/plain','Not found');
    send(200,types[file],await readFile(path.join(folder,file)));
  }catch{send(404,'text/plain','Not found');}
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close();server.closeAllConnections();});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Порт занят. Задайте GO_MAX_PROMO_PORT.':error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('Local: http://localhost:'+port+'/\nGo Pro MAX description. Preview only.'));

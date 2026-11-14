import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { readFile, mkdtemp, rm, realpath } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.STEPIK_FIRST_PROGRAM_PORT||8769);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid preview port');
const temporary=await mkdtemp(path.join(os.tmpdir(),'go-mini-preview-'));
const env={PATH:'/usr/bin:/bin',GOCACHE:path.join(temporary,'cache'),GOPATH:path.join(temporary,'gopath'),GOPROXY:'off',GOSUMDB:'off',GOTOOLCHAIN:'local',GO111MODULE:'off',CGO_ENABLED:'0',GOMAXPROCS:'2',TMPDIR:temporary};
const runner=path.join(temporary,'runner');
const children=new Set();
function execute(command,args,input,timeout=25000){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd:root,env,stdio:['pipe','pipe','pipe']});children.add(child);
    let output='',error='',size=0,ended=false;
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Локальный запуск превысил время ожидания.'));},timeout);
    child.stdout.on('data',chunk=>{size+=chunk.length;if(size>70000)child.kill('SIGKILL');else output+=chunk;});
    child.stderr.on('data',chunk=>{size+=chunk.length;if(size>70000)child.kill('SIGKILL');else error+=chunk;});
    child.on('error',e=>{clearTimeout(timer);children.delete(child);reject(e);});
    child.on('close',code=>{if(ended)return;ended=true;clearTimeout(timer);children.delete(child);code===0?resolve(output):reject(Error(error||'Локальный Go недоступен.'));});
    child.stdin.on('error',()=>{});child.stdin.end(input||'');
  });
}
let shuttingDown=false;
async function cleanup(){if(shuttingDown)return;shuttingDown=true;for(const c of children)c.kill('SIGKILL');await rm(temporary,{recursive:true,force:true});}
try{
  console.log('Подготавливаю локальный Go. Первый запуск может занять около минуты.');
  await execute('/usr/bin/go',['build','-o',runner,'scripts/lib/first-program-runner.go'],'',90000);
  await execute(runner,[],JSON.stringify({code:'package main\nimport "fmt"\nfunc main(){ fmt.Println("Готово") }'}),60000);
}catch(e){await cleanup();throw e;}
let active=false;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
const server=http.createServer(async(req,res)=>{
  try{
    if(!new Set([`localhost:${port}`,`127.0.0.1:${port}`]).has(req.headers.host)){res.writeHead(403);res.end();return;}
    const url=new URL(req.url,`http://${req.headers.host}`);
    if(url.pathname==='/api/first-program/run'){
      if(req.method!=='POST'){json(res,405,{ok:false,diagnostic:'Используйте POST.'});return;}
      if(req.headers.origin!==url.origin||req.headers['content-type']!=='application/json'||req.headers['x-go-mini-preview']!=='1'){json(res,403,{ok:false,diagnostic:'Запуск доступен только из локальной страницы урока.'});return;}
      if(active){json(res,429,{ok:false,diagnostic:'Дождитесь завершения предыдущего запуска.'});return;}
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>20000){json(res,413,{ok:false,diagnostic:'Слишком большой запрос.'});return;}}
      let data;try{data=JSON.parse(body);}catch{json(res,400,{ok:false,diagnostic:'Некорректный запрос.'});return;}
      if(typeof data.code!=='string'){json(res,400,{ok:false,diagnostic:'Нужен текст программы.'});return;}
      active=true;try{const answer=JSON.parse(await execute(runner,[],JSON.stringify({code:data.code})));json(res,200,answer);}finally{active=false;}return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const relative=['/','/first-program','/first-program/'].includes(url.pathname)?'go-mini-module-03-lesson-01-preview.html':decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if(!/^(go-mini-module-03-lesson-01-(preview|step-(0[1-9]|10))\.html|assets\/go-mini-first-program(-content|-model|-embed)?\.(css|js))$/.test(relative)){res.writeHead(404);res.end('Not found');return;}
    const file=path.resolve(root,relative),resolved=await realpath(file);
    if(!resolved.startsWith(root+path.sep)){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'self' http://localhost:${port} http://127.0.0.1:${port}`});
    res.end(req.method==='HEAD'?undefined:await readFile(file));
  }catch(e){if(!res.headersSent)json(res,500,{ok:false,phase:'server',diagnostic:'Локальный запуск не завершился. Попробуйте ещё раз.'});else res.end();}
});
server.on('error',async e=>{await cleanup();console.error(e.code==='EADDRINUSE'?'Порт занят. Задайте STEPIK_FIRST_PROGRAM_PORT.':'Не удалось запустить просмотр.');process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{server.close();await cleanup();process.exit(0);});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}/first-program`));

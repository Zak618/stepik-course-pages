/* Authenticate the course owner; never replace another account's saved session. */
import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const raw=await readFile('.env.stepik','utf8');
const env=Object.fromEntries(raw.split('\n').filter(line=>/^\w+=/.test(line)).map(line=>[line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1).trim().replace(/^['"]|['"]$/g,'')]));
let busy=false;
async function authenticate(parameters){
  const r=await fetch('https://stepik.org/oauth2/token/',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(env.STEPIK_CLIENT_ID+':'+env.STEPIK_CLIENT_SECRET).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(parameters)});
  if(!r.ok){let reason='OAuth failed';try{reason=(await r.json()).error||reason;}catch{}throw new Error(`OAuth HTTP ${r.status}: ${reason}. Проверьте grant type приложения; повторять ту же ссылку не нужно.`);}
  const session=await r.json();
  const api=async path=>{const response=await fetch('https://stepik.org/api/'+path,{headers:{Authorization:'Bearer '+session.access_token}});if(!response.ok)throw new Error(`Stepik ${path}: HTTP ${response.status}`);return response.json();};
  const id=(await api('stepics/1')).stepics[0].user;
  if(id!==647088271)throw new Error(`Вход выполнен в другой аккаунт (${id}). Нужен аккаунт WEB HACKER — владелец курса 305666.`);
  assert.equal((await api('courses/305666')).courses[0].owner,id);
  await writeFile('.env.stepik-webhacker-session',JSON.stringify({...session,expires_at:Date.now()+session.expires_in*1000},null,2),{mode:0o600});
  console.log('Authorized WEB HACKER (647088271); session saved separately.');
}
const exchange=code=>authenticate({grant_type:'authorization_code',code,redirect_uri:'http://localhost:8765/callback'});
if(process.argv.includes('--client-credentials'))await authenticate({grant_type:'client_credentials'});
else if(process.argv.includes('--stdin')){
  let input='';for await(const chunk of process.stdin)input+=chunk;
  const code=input.trim().startsWith('http')?new URL(input.trim()).searchParams.get('code'):input.trim();
  assert.match(code||'',/^[A-Za-z0-9_-]{10,200}$/);await exchange(code);
}else{
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost:8765');
    const code=url.searchParams.get('code');
    if(req.method!=='GET'||url.pathname!=='/callback'||!code||!/^[A-Za-z0-9_-]{10,200}$/.test(code)){res.writeHead(404);res.end();return;}
    if(busy){res.writeHead(409);res.end('Authorization is being checked.');return;}busy=true;
    try{await exchange(code);res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('Готово. Аккаунт WEB HACKER подключён. Можно вернуться в чат.');server.close();}
    catch(error){console.error(error.message);res.writeHead(400,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(error.message);busy=false;}
  });
  server.listen(8765,'127.0.0.1',()=>console.log('Waiting for the WEB HACKER authorization callback on localhost:8765.'));
}

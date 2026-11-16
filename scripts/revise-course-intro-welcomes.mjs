// Replace the opening text only. No new steps, deletions, task or score changes.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {welcomes,greeting,renderWelcome} from './course-intro-welcome-copy.mjs';
const directory='.local-publication/intro-welcomes-20261116';
const original=JSON.parse(await readFile('.local-publication/intros-20261116/snapshot.json','utf8'));
const protectedKeys=['title','sections','owner','authors','cover','summary','description','requirements','learning_format','target_audience','workload','acquired_skills','acquired_assets','is_public','is_enabled','is_paid','price','currency_code','is_certificate_issued','certificate_regular_threshold','certificate_distinction_threshold'];
const excluded=[305666,305734,300562];
const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
async function api(path,method='GET',body){const response=await fetch('https://stepik.org/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(40000)});assert.ok(response.ok,'Stepik '+method+' '+path.split('?')[0]+' HTTP '+response.status);return response.json();}
async function sources(lesson){const result=[];for(let page=1;page<20;page++){const d=await api('step-sources?lesson='+lesson+'&page='+page);result.push(...d['step-sources']);if(!d.meta.has_next)return result.sort((a,b)=>a.position-b.position);}throw Error('Unexpected pagination');}
async function courses(){const out=[];for(let i=0;i<original.courses.length;i+=12){const ids=original.courses.slice(i,i+12).map(c=>c.id);out.push(...(await api('courses?'+ids.map(id=>'ids[]='+id).join('&'))).courses);}return out.map(c=>Object.fromEntries(['id',...protectedKeys].map(k=>[k,c[k]])));}
const decode=s=>s.replace(/&(?:amp|lt|gt|nbsp|quot);/g,c=>({'&amp;':'&','&lt;':'<','&gt;':'>','&nbsp;':' ','&quot;':'"'}[c]));
const plain=s=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const embeds=s=>[...s.matchAll(/<iframe\b[^>]*src="([^"]+)"/g)].map(m=>decode(m[1]));
const sameText=(a,b)=>plain(a)===plain(b)&&hash(embeds(a))===hash(embeds(b))&&(a.match(/<details\b/g)||[]).length===(b.match(/<details\b/g)||[]).length;
assert.equal((await api('stepics/1')).stepics[0].user,647088271);
await mkdir(directory,{recursive:true});
if(process.argv.includes('--prepare')){
 try{await readFile(directory+'/plan.json');throw Error('Revision already prepared; do not overwrite its baseline.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const before={at:new Date().toISOString(),courses:await courses(),intros:[]},updates=[],index=[];
 for(let i=0;i<original.intros.length;i+=4)await Promise.all(original.intros.slice(i,i+4).map(async intro=>{
   const steps=await sources(intro.lesson);before.intros.push({...intro,steps});
 }));
 for(const intro of original.intros){
  const course=before.courses.find(c=>c.id===intro.course),record=before.intros.find(i=>i.course===intro.course),first=record.steps.find(s=>s.position===1);
  if([305666,305734].includes(course.id))continue;
  let text=first.block.text;
  if(!excluded.includes(course.id)){
   assert.equal(first.block.name,'text');assert.equal(first.cost,0);
   if(welcomes[course.id])text=renderWelcome(course.id);
   else {assert.ok([187192,187189,187191].includes(course.id));text=greeting+'<p>Мы команда WEB HACKER.</p>'+first.block.text;}
   if(course.id===289356){const poster=first.block.text.match(/<details><summary>Знакомство с Милой и Тегом<\/summary>[\s\S]*?<\/details>/);if(poster)text+=poster[0];}
   if(course.id===300361){
    const start=first.block.text.search(/<div\b/);assert.ok(start>=0,'Existing Ural theory');
    const tail=first.block.text.slice(start).replace(/^(<div\b[^>]*>)\s*<h2\b[^>]*>[\s\S]*?<\/h2>\s*<p>[\s\S]*?<\/p>/,'$1');
    text=greeting+'<p>Мы команда WEB HACKER.</p><p>'+welcomes[course.id][0]+'</p>'+tail;
    assert.equal(hash(text.match(/<pre\b[\s\S]*?<\/pre>/g)),hash(first.block.text.match(/<pre\b[\s\S]*?<\/pre>/g)),'Preserved Ural code examples');
   }
   assert.ok(!embeds(text).some(u=>u.includes('course-intro.html')),'No game iframe');
   assert.ok(plain(text).startsWith('👋 Привет!'));
   updates.push({course:course.id,lesson:intro.lesson,id:first.id,text});
  }
  index.push({id:course.id,title:course.title.trim(),url:`https://stepik.org/lesson/${intro.lesson}/step/1?unit=${intro.unit}`,html:text});
 }
 assert.equal(updates.length,37);assert.equal(index.length,38);
 await writeFile(directory+'/before.json',JSON.stringify(before,null,2),{mode:0o600});
 await writeFile(directory+'/plan.json',JSON.stringify({at:new Date().toISOString(),excluded,updates},null,2),{mode:0o600});
 await writeFile('assets/course-intro-index.js','/* Public course openings. Greetings and text only; no game scenes. */\nwindow.COURSE_INTRO_INDEX = '+JSON.stringify(index,null,2)+';\n');
 console.log('Prepared 37 native welcome updates and 38 public previews. No new steps.');process.exit(0);
}
const before=JSON.parse(await readFile(directory+'/before.json','utf8')),plan=JSON.parse(await readFile(directory+'/plan.json','utf8'));
const apply=process.argv.includes('--apply'),verify=process.argv.includes('--verify');
let journal={planHash:hash(plan),saved:[]};try{journal=JSON.parse(await readFile(directory+'/journal.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}assert.equal(journal.planHash,hash(plan));
function inspect(record,now,complete=false){
 assert.equal(now.length,record.steps.length,'Unchanged step count '+record.course);
 for(const old of record.steps){const s=now.find(s=>s.id===old.id);assert.ok(s);for(const k of['id','position','lesson','cost','is_enabled'])assert.equal(s[k],old[k],'Native '+k+' '+s.id);const {text:a,...blockA}=s.block,{text:b,...blockB}=old.block;assert.equal(hash(blockA),hash(blockB),'Native task '+s.id);const update=plan.updates.find(u=>u.id===s.id);assert.ok(update?(sameText(a,update.text)||(!complete&&hash(a)===hash(b))):hash(a)===hash(b),'Concurrent edit '+s.id);assert.equal(s.status,'ready');assert.ok(!s.error?.text&&!s.error?.code);}
}
for(let i=0;i<before.intros.length;i+=4)await Promise.all(before.intros.slice(i,i+4).map(async record=>inspect(record,await sources(record.lesson),verify)));
assert.equal(hash(await courses()),hash(before.courses),'Course settings preserved');
if(!apply&&!verify){console.log('Preflight passed: update 37 openings only.');process.exit(0);}
if(apply){
 for(const file of['course-intro.html','course-intros.html','assets/course-intro-index.js','assets/course-intro-welcome.js']){const r=await fetch('https://zak618.github.io/stepik-course-pages/'+file+'?v=20261116-welcome',{signal:AbortSignal.timeout(30000)});assert.ok(r.ok);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(await readFile(file)),'Pages ready '+file);}
 let queue=Promise.resolve();
 async function save(update){
  const record=before.intros.find(i=>i.course===update.course),old=record.steps.find(s=>s.id===update.id),current=await sources(record.lesson);inspect(record,current);let s=current.find(s=>s.id===old.id);
  if(!sameText(s.block.text,update.text)){
   try{s=(await api('step-sources/'+s.id,'PUT',{stepSource:{lesson:s.lesson,position:s.position,cost:s.cost,block:{...s.block,text:update.text}}}))['step-sources'][0];}
   catch{s=(await api('step-sources/'+old.id))['step-sources'][0];assert.ok(sameText(s.block.text,update.text),'Save not confirmed; no mutation retry '+old.id);}
   assert.ok(sameText(s.block.text,update.text));
  }
  inspect(record,await sources(record.lesson),true);
  if(!journal.saved.includes(update.id))journal.saved.push(update.id);const content=JSON.stringify(journal,null,2);queue=queue.then(()=>writeFile(directory+'/journal.json',content,{mode:0o600}));await queue;
  console.log('Saved '+journal.saved.length+'/37: '+update.course);
 }
 for(let i=0;i<plan.updates.length;i+=4)await Promise.all(plan.updates.slice(i,i+4).map(save));
}
for(let i=0;i<before.intros.length;i+=4)await Promise.all(before.intros.slice(i,i+4).map(async record=>inspect(record,await sources(record.lesson),true)));
assert.equal(hash(await courses()),hash(before.courses),'Final course settings preserved');
await writeFile(directory+'/verified.json',JSON.stringify({at:new Date().toISOString(),updated:37,noGameEmbeds:true,greetings:true,allOtherStepsIdsPositionsTasksAndPointsPreserved:true,excluded},null,2),{mode:0o600});
console.log('Verified: 37 greetings, no game inserts; all other steps, answers, points and course settings preserved.');

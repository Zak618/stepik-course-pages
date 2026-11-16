// Content-only bulk publication. Never changes prices, access, course fields,
// existing task types/sources/points, existing positions or student answers.
import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='.local-publication/intros-20261116';
const baseline=JSON.parse(await readFile(dir+'/snapshot.json','utf8'));
const plan=JSON.parse(await readFile(dir+'/plan.json','utf8'));
const apply=process.argv.includes('--apply'),verify=process.argv.includes('--verify');
const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const protectedCourse=['title','owner','cover','authors','instructors','sections','summary','workload','acquired_skills','description','target_audience','requirements','learning_format','acquired_assets','is_public','is_enabled','is_paid','price','currency_code','language','difficulty','is_certificate_issued','is_certificate_auto_issued','certificate_regular_threshold','certificate_distinction_threshold'];
async function api(path,method='GET',body){const r=await fetch('https://stepik.org/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('Stepik '+method+' '+path.split('?')[0]+' HTTP '+r.status);return r.json();}
async function batch(type,ids){const result=[];for(let i=0;i<ids.length;i+=12)result.push(...(await api(type+'?'+ids.slice(i,i+12).map(id=>'ids[]='+id).join('&')))[type]);return result;}
async function sources(lesson){const result=[];for(let page=1;page<=20;page++){const d=await api('step-sources?lesson='+lesson+'&page='+page);result.push(...d['step-sources']);if(!d.meta.has_next)return result.sort((a,b)=>a.position-b.position);}throw Error('Unexpected pagination');}
const decode=s=>s.replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g,c=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[c]));
const plain=s=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const urls=s=>[...s.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>decode(m[1]));
function sameText(actual,expected){return plain(actual)===plain(expected)&&hash(urls(actual))===hash(urls(expected))&&['iframe','details','summary'].every(tag=>(actual.match(new RegExp('<'+tag+'\\b','g'))||[]).length===(expected.match(new RegExp('<'+tag+'\\b','g'))||[]).length)&&hash([...actual.matchAll(/<iframe\b[^>]*height="(\d+)"/g)].map(m=>m[1]))===hash([...expected.matchAll(/<iframe\b[^>]*height="(\d+)"/g)].map(m=>m[1]));}
const blockExceptText=b=>{const {text,...rest}=b;return rest;};
function nativeInvariant(now,old){for(const k of['id','lesson','position','cost','is_enabled'])assert.equal(now[k],old[k],'Preserved native '+k+' '+old.id);assert.equal(hash(blockExceptText(now.block)),hash(blockExceptText(old.block)),'Native task definition '+old.id);}
let journal={at:new Date().toISOString(),planHash:hash(plan),updated:[],added:[],done:[]};
try{journal=JSON.parse(await readFile(dir+'/journal.json','utf8'));assert.equal(journal.planHash,hash(plan),'Plan changed after publication started');}catch(e){if(e.code!=='ENOENT')throw e;}
let saveQueue=Promise.resolve();
function persist(){const contents=JSON.stringify(journal,null,2);saveQueue=saveQueue.then(()=>writeFile(dir+'/journal.json',contents,{mode:0o600}));return saveQueue;}
assert.equal((await api('stepics/1')).stepics[0].user,647088271);
assert.deepEqual(plan.excluded,[305666,305734]);assert.equal(plan.plans.length,38);
assert.ok(plan.plans.every(p=>!plan.excluded.includes(p.course)));
const beforeByLesson=new Map(baseline.intros.map(i=>[i.lesson,baseline.sources.filter(s=>s.lesson===i.lesson).sort((a,b)=>a.position-b.position)]));
const actualCourses=await batch('courses',baseline.courses.map(c=>c.id));
function checkCourses(courses){for(const c of courses){const old=baseline.courses.find(x=>x.id===c.id);for(const key of protectedCourse)assert.equal(hash(c[key]),hash(old[key]),'Protected course '+c.id+' '+key);}}
checkCourses(actualCourses);
const actualSections=await batch('sections',baseline.sections.map(s=>s.id));
for(const s of actualSections){const old=baseline.sections.find(o=>o.id===s.id);for(const k of['id','course','title','position','units'])assert.equal(hash(s[k]),hash(old[k]),'Section preserved '+s.id+' '+k);}
const planned=p=>[...p.updates,...p.additions];
function inspect(p,current,complete=false){
 const old=beforeByLesson.get(p.lesson);
 for(const s of old){const now=current.find(t=>t.id===s.id);assert.ok(now,'Existing step missing '+s.id);nativeInvariant(now,s);const update=p.updates.find(u=>u.id===s.id);assert.ok(update?(sameText(now.block.text,update.text)||(!complete&&hash(now.block.text)===hash(s.block.text))):hash(now.block.text)===hash(s.block.text),'Concurrent edit or unsaved content '+s.id);}
 for(const now of current.filter(s=>!old.some(o=>o.id===s.id))){const addition=p.additions.find(a=>a.position===now.position);assert.ok(addition,'Foreign appended step '+now.id);assert.equal(now.block.name,addition.type);assert.equal(now.cost,0);assert.ok(sameText(now.block.text,addition.text),'Foreign content at appended position '+now.position);const saved=journal.added.find(a=>a.id===now.id);if(!saved){assert.ok(apply&&!verify,'Unjournaled addition; use --apply to recover by matching content');journal.added.push({course:p.course,lesson:p.lesson,id:now.id,position:now.position,role:addition.role,recovered:true});}}
 if(complete){assert.equal(current.length,old.length+p.additions.length,'Final step count '+p.course);for(const a of p.additions)assert.ok(current.some(s=>s.position===a.position&&sameText(s.block.text,a.text)),'Missing addition '+p.course);}
 assert.equal(current.reduce((n,s)=>n+s.cost,0),old.reduce((n,s)=>n+s.cost,0),'Points preserved '+p.course);
}
const originals=new Map();
// Complete read-only preflight before making the first write.
for(let i=0;i<baseline.intros.length;i+=4){await Promise.all(baseline.intros.slice(i,i+4).map(async intro=>{const current=await sources(intro.lesson);originals.set(intro.lesson,current);const p=plan.plans.find(p=>p.course===intro.course);if(p)inspect(p,current,verify);else{const old=beforeByLesson.get(intro.lesson);assert.equal(hash(current.map(s=>({id:s.id,position:s.position,cost:s.cost,block:s.block}))),hash(old.map(s=>({id:s.id,position:s.position,cost:s.cost,block:s.block}))),'Excluded introduction preserved '+intro.course);}}));}
console.log(JSON.stringify({mode:apply?'apply':verify?'verify':'preflight',courses:plan.plans.length,updates:plan.plans.reduce((n,p)=>n+p.updates.length,0),append:plan.plans.reduce((n,p)=>n+p.additions.length,0),excluded:plan.excluded,allOriginalIdsAndPointsPreserved:true}));
if(!apply&&!verify)process.exit(0);
if(apply){
 // Hosting must contain the exact reviewed files before Stepik can reference them.
 for(const file of['course-intro.html','assets/course-intro.js','assets/course-intro.css','assets/course-intro-profiles.js','go-mini-module-01-lesson-01-step-05.html']){const r=await fetch('https://zak618.github.io/stepik-course-pages/'+file+'?v='+plan.version,{signal:AbortSignal.timeout(30000)});assert.ok(r.ok,'Pages status '+file);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(await readFile(file)),'Pages not deployed '+file);}
 await persist();
 async function publish(p){
  let current=await sources(p.lesson);inspect(p,current);
  for(const a of p.updates){
   let s=current.find(s=>s.id===a.id),old=beforeByLesson.get(p.lesson).find(s=>s.id===a.id);nativeInvariant(s,old);
   if(!sameText(s.block.text,a.text)){
    // Re-read immediately before saving; never overwrite edits made during the run.
    s=(await api('step-sources/'+a.id))['step-sources'][0];nativeInvariant(s,old);assert.equal(hash(s.block.text),hash(old.block.text),'Concurrent edit before PUT '+s.id);
    let saved;
    try{saved=(await api('step-sources/'+s.id,'PUT',{stepSource:{lesson:s.lesson,position:s.position,cost:s.cost,block:{...s.block,text:a.text}}}))['step-sources'][0];}
    catch{saved=(await api('step-sources/'+s.id))['step-sources'][0];assert.ok(sameText(saved.block.text,a.text),'PUT outcome not confirmed; no mutation retry '+s.id);}
    nativeInvariant(saved,old);assert.ok(sameText(saved.block.text,a.text),'Stepik changed content '+s.id);current=current.map(t=>t.id===s.id?saved:t);
   }
   if(!journal.updated.some(t=>t.id===a.id)){journal.updated.push({course:p.course,id:a.id,position:a.position,role:a.role});await persist();}
  }
  for(const a of p.additions){
   current=await sources(p.lesson);inspect(p,current);let saved=current.find(s=>s.position===a.position);
   if(!saved){
    assert.equal(current.length,a.position-1,'Append only '+p.course);
    const source=a.type==='free-answer'?{is_attachments_enabled:false,is_html_enabled:true,manual_scoring:false}:{};
    try{saved=(await api('step-sources','POST',{stepSource:{lesson:p.lesson,position:a.position,cost:0,block:{name:a.type,text:a.text,source}}}))['step-sources'][0];}
    catch{saved=(await sources(p.lesson)).find(s=>s.position===a.position);assert.ok(saved&&sameText(saved.block.text,a.text),'POST outcome not confirmed; no mutation retry '+p.course);}
    assert.ok(sameText(saved.block.text,a.text),'Appended content '+p.course);assert.equal(saved.cost,0);assert.equal(saved.block.name,a.type);
    journal.added.push({course:p.course,lesson:p.lesson,id:saved.id,position:a.position,role:a.role});await persist();
   }
  }
  inspect(p,await sources(p.lesson),true);
  if(!journal.done.includes(p.course)){journal.done.push(p.course);await persist();}
  console.log('Ready '+journal.done.length+'/'+plan.plans.length+': '+p.course+' '+p.title);
 }
 // Four independent courses at a time; each course is saved strictly in order.
 for(let i=0;i<plan.plans.length;i+=4)await Promise.all(plan.plans.slice(i,i+4).map(publish));
}
for(let i=0;i<plan.plans.length;i+=4)await Promise.all(plan.plans.slice(i,i+4).map(async p=>inspect(p,await sources(p.lesson),true)));
checkCourses(await batch('courses',baseline.courses.map(c=>c.id)));
for(const s of await batch('sections',baseline.sections.map(s=>s.id))){const old=baseline.sections.find(o=>o.id===s.id);for(const k of['id','course','title','position','units'])assert.equal(hash(s[k]),hash(old[k]),'Section preserved after writes '+s.id+' '+k);}
const lessons=await batch('lessons',baseline.intros.map(i=>i.lesson));
for(const lesson of lessons){const old=baseline.lessons.find(l=>l.id===lesson.id);for(const k of['title','owner','units','courses','is_draft'])assert.equal(hash(lesson[k]),hash(old[k]),'Lesson metadata preserved '+lesson.id+' '+k);}
for(const id of plan.excluded){const i=baseline.intros.find(i=>i.course===id),current=await sources(i.lesson);const old=beforeByLesson.get(i.lesson);assert.equal(hash(current.map(s=>({id:s.id,position:s.position,cost:s.cost,block:s.block}))),hash(old.map(s=>({id:s.id,position:s.position,cost:s.cost,block:s.block}))),'Excluded introduction preserved '+id);}
await writeFile(dir+'/verified.json',JSON.stringify({at:new Date().toISOString(),version:plan.version,courses:plan.plans.map(p=>({id:p.course,title:p.title,url:`https://stepik.org/lesson/${p.lesson}/step/1?unit=${p.unit}`,updates:p.updates.length,appended:p.additions.length})),allOriginalIdsPositionsTypesSourcesAndPointsPreserved:true,courseSettingsPreserved:true,excludedIntrosPreserved:plan.excluded},null,2),{mode:0o600});
console.log('Verified 38 introductions, original native tasks, points, course settings and both excluded introductions.');

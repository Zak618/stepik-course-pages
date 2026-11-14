/* Explicit publication restricted to the approved algorithms lesson.
   Re-runs resume only steps recorded by this publisher; no deletions. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const apply=process.argv.includes('--apply'),plan=JSON.parse(await readFile('.local-publication/algorithms.json','utf8'));
assert.equal(plan.course,305666);assert.equal(plan.lesson,2706556);assert.equal(plan.unit,2746571);assert.equal(plan.articles.length,9);assert.equal(plan.articles.reduce((sum,a)=>sum+a.cost,0),30);
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const base='https://zak618.github.io/stepik-course-pages/';
const hash=value=>createHash('sha256').update(value).digest('hex');
const sourceHash=sources=>hash(JSON.stringify(sources.map(({id,position,cost,block,update_date,is_enabled})=>({id,position,cost,block,update_date,is_enabled}))));
async function api(path,method='GET',body){
  const response=await fetch('https://stepik.org/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`${method} ${path}: HTTP ${response.status}: ${(await response.text()).slice(0,1200)}`);return response.json();
}
async function sources(lesson){const all=[];for(let page=1;page<=10;page++){const result=await api(`step-sources?lesson=${lesson}&page=${page}`);all.push(...result['step-sources']);if(!result.meta.has_next)return all.sort((a,b)=>a.position-b.position);}throw Error('Unexpected pagination');}
const account=(await api('stepics/1')).stepics[0].user;assert.equal(account,647088271,'Wrong account: no changes made');
const course=(await api('courses/305666')).courses[0],lesson=(await api('lessons/2706556')).lessons[0],unit=(await api('units/2746571')).units[0];
assert.equal(course.owner,account);assert.equal(lesson.owner,account);assert.ok(lesson.courses.includes(305666));assert.ok(lesson.units.includes(2746571));assert.equal(unit.lesson,2706556);assert.equal(lesson.title,'Алгоритмы: от идеи к инструкции');
const existing=await sources(2706556),untouched=await sources(2706555),untouchedHash=sourceHash(untouched);
let journal={lesson:2706556,uploaded:[]};try{journal=JSON.parse(await readFile('.local-publication/algorithms-upload.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
assert.equal(journal.lesson,2706556);assert.equal(new Set(existing.map(s=>s.position)).size,existing.length);assert.ok(existing.length<=9);
for(const old of existing){const entry=journal.uploaded.find(s=>s.id===old.id&&s.position===old.position),expected=plan.articles.find(a=>a.position===old.position);assert.ok(entry&&expected,'Unrelated or concurrent content in lesson: refusing to change it');assert.equal(old.block.name,expected.block.name);assert.ok(old.block.text.includes(old.cost?'go-mini-algorithms-quiz-':'go-mini-module-02-lesson-02-'));}
console.log(JSON.stringify({account,lesson:lesson.id,unit:unit.id,currentSteps:existing.length,plannedSteps:9,graded:3,points:30,mode:apply?'apply':'read-only preflight'},null,2));
if(!apply)process.exit(0);
const files=['go-mini-module-02-lesson-02-preview.html',...Array.from({length:9},(_,i)=>`go-mini-module-02-lesson-02-step-${String(i+1).padStart(2,'0')}.html`),'assets/go-mini-information-v2.css','assets/go-mini-algorithms.css','assets/go-mini-algorithms-embed.css','assets/go-mini-algorithms.js','assets/go-mini-algorithms-content.js',...[3,6,9].map(n=>`assets/go-mini-algorithms-quiz-${String(n).padStart(2,'0')}.svg`)];
for(const file of files){const response=await fetch(base+file+'?v='+plan.version,{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200,`Page not live: ${file}`);assert.equal(hash(await response.text()),hash(await readFile(file)),`Stale GitHub Pages file: ${file}`);}
await mkdir('.local-publication',{recursive:true});await writeFile(`.local-publication/algorithms-before-${Date.now()}.json`,JSON.stringify({course,lesson,unit,sources:existing,untouchedLesson:untouched},null,2));
for(const article of plan.articles){
  const fresh=await sources(2706556),old=fresh.find(s=>s.position===article.position);
  assert.ok(fresh.every(s=>existing.some(e=>e.id===s.id)||journal.uploaded.some(e=>e.id===s.id)),'Concurrent lesson edits detected');
  if(old){const prior=journal.uploaded.find(s=>s.id===old.id);assert.ok(prior);if(prior.update_date)assert.equal(prior.update_date,old.update_date,'Concurrent step edit detected');}
  // Never retry a POST blindly. If transport fails, re-run read-only preflight
  // and reconcile the specific position with the saved publication journal.
  const result=await api(old?`step-sources/${old.id}`:'step-sources',old?'PUT':'POST',{stepSource:{lesson:2706556,position:article.position,cost:article.cost,block:article.block}});
  const id=result['step-sources'][0].id;
  const recorded={id,position:article.position,type:article.block.name,cost:article.cost,update_date:result['step-sources'][0].update_date};journal.uploaded=journal.uploaded.filter(s=>s.position!==article.position).concat(recorded).sort((a,b)=>a.position-b.position);await writeFile('.local-publication/algorithms-upload.json',JSON.stringify(journal,null,2));
  let source;for(let attempt=0;attempt<25;attempt++){source=(await api(`step-sources/${id}`))['step-sources'][0];if(source.status!=='preparing'&&source.status!==10)break;await new Promise(resolve=>setTimeout(resolve,800));}
  assert.equal(source.lesson,2706556);assert.equal(source.position,article.position);assert.equal(source.cost,article.cost);assert.equal(source.block.name,article.block.name);assert.equal(source.is_enabled,true);assert.equal(source.needs_plan,null);assert.ok(source.status==='ready'||source.status===1000);assert.ok(!source.error?.text&&!source.error?.code);
  assert.equal((source.block.text.match(/<iframe/g)||[]).length,article.cost?0:1,'Object frame was stripped or duplicated');assert.ok(source.block.text.length>article.block.text.length*.8,'Theory was stripped');
  if(article.cost){assert.deepEqual(source.block.source,article.block.source,'Native checker mismatch');assert.ok(source.block.text.includes('Проверим знания'));assert.ok(source.block.text.includes(`go-mini-algorithms-quiz-${String(article.position).padStart(2,'0')}.svg`));}else assert.ok(source.block.text.includes('v='+plan.version));
  recorded.update_date=source.update_date;await writeFile('.local-publication/algorithms-upload.json',JSON.stringify(journal,null,2));
  console.log(`Step ${source.position}: ${source.id}, ${source.block.name}, ${source.cost} points`);
}
const after=await sources(2706556),afterLesson=(await api('lessons/2706556')).lessons[0],afterCourse=(await api('courses/305666')).courses[0];
assert.equal(after.length,9);assert.equal(after.reduce((sum,s)=>sum+s.cost,0),30);assert.equal(afterLesson.is_draft,lesson.is_draft);assert.equal(afterLesson.title,lesson.title);assert.deepEqual(afterLesson.units,lesson.units);assert.equal(afterCourse.is_public,course.is_public);assert.equal(afterCourse.is_enabled,course.is_enabled);assert.equal(sourceHash(await sources(2706555)),untouchedHash,'First lesson changed');
await writeFile('.local-publication/algorithms-verified.json',JSON.stringify({lesson:2706556,unit:2746571,sources:after},null,2));
console.log(JSON.stringify({url:'https://stepik.org/lesson/2706556/step/1?unit=2746571',steps:9,graded:3,points:30,visibilityUnchanged:true,firstLessonUnchanged:true},null,2));

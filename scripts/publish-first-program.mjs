/* Exact approved lesson only. No deletes, visibility changes or submissions. */
import assert from 'node:assert/strict';
import{readFile,writeFile,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
const apply=process.argv.includes('--apply'),textOnly=process.argv.includes('--text-only'),plan=JSON.parse(await readFile('.local-publication/first-program.json','utf8'));
assert.equal(plan.course,305666);assert.equal(plan.lesson,2706559);assert.equal(plan.unit,2746574);assert.equal(plan.articles.length,10);assert.equal(plan.articles.reduce((s,a)=>s+a.cost,0),50);
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const hash=value=>createHash('sha256').update(value).digest('hex');
const sourceHash=sources=>hash(JSON.stringify(sources.map(({id,position,cost,block,update_date,is_enabled})=>({id,position,cost,block,update_date,is_enabled}))));
async function api(path,method='GET',body){const r=await fetch('https://stepik.org/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${method} ${path}: HTTP ${r.status}: ${(await r.text()).slice(0,1600)}`);return r.json();}
async function sources(lesson){const all=[];for(let page=1;page<=10;page++){const x=await api(`step-sources?lesson=${lesson}&page=${page}`);all.push(...x['step-sources']);if(!x.meta.has_next)return all.sort((a,b)=>a.position-b.position);}throw Error('Unexpected pagination');}
const account=(await api('stepics/1')).stepics[0].user;assert.equal(account,647088271);
const course=(await api('courses/305666')).courses[0],lesson=(await api('lessons/2706559')).lessons[0],unit=(await api('units/2746574')).units[0];
assert.equal(course.owner,account);assert.equal(lesson.owner,account);assert.equal(lesson.title,'Первая программа');assert.ok(lesson.courses.includes(305666));assert.ok(lesson.units.includes(2746574));assert.equal(unit.lesson,2706559);
const existing=await sources(2706559),untouched={};for(const id of[2706555,2706556])untouched[id]=await sources(id);
if(textOnly)assert.equal(existing.length,10,'Content-only update requires the existing full lesson');
let journal={lesson:2706559,uploaded:[]};try{journal=JSON.parse(await readFile('.local-publication/first-program-upload.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
assert.equal(journal.lesson,2706559);assert.equal(new Set(existing.map(s=>s.position)).size,existing.length);assert.ok(existing.length<=10);
for(const s of existing){const entry=journal.uploaded.find(e=>e.id===s.id&&e.position===s.position),expected=plan.articles.find(a=>a.position===s.position);assert.ok(entry&&expected,'Unrelated lesson content: no changes');assert.equal(s.block.name,expected.block.name);if(entry.update_date)assert.equal(s.update_date,entry.update_date,'Concurrent step edit');}
console.log(JSON.stringify({account,lesson:lesson.id,unit:unit.id,existingSteps:existing.length,plannedSteps:10,codeTasks:2,choiceTasks:3,points:50,mode:apply?'apply':'read-only preflight'},null,2));
if(!apply)process.exit(0);
const files=['go-mini-module-03-lesson-01-preview.html',...Array.from({length:10},(_,i)=>`go-mini-module-03-lesson-01-step-${String(i+1).padStart(2,'0')}.html`),...['.css','-embed.css','.js','-content.js','-model.js'].map(s=>'assets/go-mini-first-program'+s)];
await Promise.all(files.map(async file=>{const r=await fetch('https://zak618.github.io/stepik-course-pages/'+file+'?v='+plan.version,{signal:AbortSignal.timeout(25000)});assert.equal(r.status,200,`Not live: ${file}`);assert.equal(hash(await r.text()),hash(await readFile(file)),`Stale Pages file: ${file}`);}));
await mkdir('.local-publication',{recursive:true});await writeFile(`.local-publication/first-program-before-${Date.now()}.json`,JSON.stringify({course,lesson,unit,sources:existing,untouched},null,2));
for(const article of plan.articles){
  const fresh=await sources(2706559),old=fresh.find(s=>s.position===article.position);
  assert.ok(fresh.every(s=>existing.some(e=>e.id===s.id)||journal.uploaded.some(e=>e.id===s.id)),'Concurrent lesson edit');
  if(old){const prior=journal.uploaded.find(e=>e.id===old.id);assert.ok(prior);if(prior.update_date)assert.equal(old.update_date,prior.update_date);}
  if(textOnly){
    assert.ok(old);assert.equal(old.block.name,article.block.name);assert.equal(old.cost,article.cost);
    // Stepik normalizes HTML, so raw exporter HTML is not a safe no-op test.
    // This mode is restricted to object frames and removal of the final signature.
    if(old.cost&&old.position!==10){console.log(`Step ${article.position}: grader and text untouched`);continue;}
    if(old.position===10&&!old.block.text.includes('Команда WEB HACKER')){console.log('Step 10: signature already absent');continue;}
    if(!old.cost&&old.block.text.includes('v='+plan.version)){const height=old.block.text.match(/<iframe\b[^>]*height="(\d+)"/);assert.equal(Number(height?.[1]),plan.heights[old.position]);console.log(`Step ${article.position}: current frame version already published`);continue;}
  }
  const block=textOnly?{...article.block,source:old.block.source,feedback_correct:old.block.feedback_correct||'',feedback_wrong:old.block.feedback_wrong||''}:article.block;
  // Never blindly retry POST. Reconcile exact IDs with the journal after errors.
  const result=await api(old?`step-sources/${old.id}`:'step-sources',old?'PUT':'POST',{stepSource:{lesson:2706559,position:article.position,cost:article.cost,block}});
  const source=result['step-sources'][0],entry={id:source.id,position:article.position,type:article.block.name,cost:article.cost,update_date:source.update_date};
  journal.uploaded=journal.uploaded.filter(e=>e.position!==article.position).concat(entry).sort((a,b)=>a.position-b.position);await writeFile('.local-publication/first-program-upload.json',JSON.stringify(journal,null,2));
  let checked;for(let attempt=0;attempt<40;attempt++){checked=(await api('step-sources/'+source.id))['step-sources'][0];if(!['preparing',10].includes(checked.status))break;await new Promise(r=>setTimeout(r,900));}
  entry.update_date=checked.update_date;await writeFile('.local-publication/first-program-upload.json',JSON.stringify(journal,null,2));
  assert.equal(checked.lesson,2706559);assert.equal(checked.position,article.position);assert.equal(checked.cost,article.cost);assert.equal(checked.block.name,article.block.name);assert.equal(checked.needs_plan,null);assert.equal(checked.is_enabled,true);assert.ok(['ready',1000].includes(checked.status),JSON.stringify({status:checked.status,error:checked.error}));assert.ok(!checked.error?.text&&!checked.error?.code);
  assert.equal((checked.block.text.match(/<iframe/g)||[]).length,article.cost?0:1);assert.ok(checked.block.text.length>article.block.text.length*.8);assert.ok(!/Настоящий запуск Go|Замедленная модель|Локальная проверка|localhost:8769/.test(checked.block.text));
  if(article.block.name==='code'){
    for(const key of['code','templates_data','execution_time_limit','execution_memory_limit','samples_count'])assert.deepEqual(checked.block.source[key],article.block.source[key]);
    const publicStep=(await api('steps/'+checked.id)).steps[0];assert.deepEqual(Object.keys(publicStep.block.options.code_templates),['go']);assert.ok(publicStep.block.options.limits.go);assert.equal(publicStep.block.options.samples.length,1);assert.ok(publicStep.block.options.samples[0][1].includes(article.position===6?'Привет, Go!':'Go-шечка Find'));
  }else if(article.cost)assert.deepEqual(checked.block.source,article.block.source);
  console.log(`Step ${article.position}: ${checked.id}, ${checked.block.name}, ${checked.cost} points, ready`);
}
const after=await sources(2706559),afterLesson=(await api('lessons/2706559')).lessons[0],afterCourse=(await api('courses/305666')).courses[0];
if(textOnly){assert.deepEqual(after.map(s=>s.id),existing.map(s=>s.id));for(const old of existing.filter(s=>s.cost)){const changed=after.find(s=>s.id===old.id);assert.equal(changed.cost,old.cost);assert.equal(changed.block.name,old.block.name);assert.deepEqual(changed.block.source,old.block.source,'Grader was changed');if(old.position!==10)assert.equal(sourceHash([changed]),sourceHash([old]),'Unrelated graded step was rewritten');}}
assert.equal(after.length,10);assert.equal(after.reduce((s,a)=>s+a.cost,0),50);assert.equal(after.filter(s=>s.block.name==='code').length,2);assert.equal(afterLesson.is_draft,lesson.is_draft);assert.equal(afterLesson.title,lesson.title);assert.deepEqual(afterLesson.units,lesson.units);assert.equal(afterCourse.is_public,course.is_public);assert.equal(afterCourse.is_enabled,course.is_enabled);
for(const id of[2706555,2706556])assert.equal(sourceHash(await sources(id)),sourceHash(untouched[id]),`Unrelated lesson ${id} changed`);
await writeFile('.local-publication/first-program-verified.json',JSON.stringify({lesson:2706559,unit:2746574,sources:after},null,2));
console.log(JSON.stringify({url:'https://stepik.org/lesson/2706559/step/1?unit=2746574',steps:10,points:50,codeTasks:2,visibilityUnchanged:true,previousLessonsUnchanged:true},null,2));

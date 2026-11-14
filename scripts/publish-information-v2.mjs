/* Explicit, id-preserving publication into the one approved lesson. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const apply=process.argv.includes('--apply');
const plan=JSON.parse(await readFile('.local-publication/information-v2.json','utf8'));
assert.equal(plan.course,305666);assert.equal(plan.lesson,2706555);assert.equal(plan.unit,2746570);
assert.equal(plan.articles.length,10);assert.equal(plan.articles.reduce((sum,a)=>sum+a.cost,0),40);
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const base='https://zak618.github.io/stepik-course-pages/';
const ids=[12384973,12384974,12384975,12384976,12384978,12384979,12384980,12384981,12384982,12384983];
async function api(path,method='GET',body){
  const r=await fetch('https://stepik.org/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!r.ok)throw new Error(`${method} ${path}: HTTP ${r.status}: ${(await r.text()).slice(0,1000)}`);
  return r.json();
}
const current=(await api('stepics/1')).stepics[0].user;assert.equal(current,647088271,'Wrong Stepik account; nothing changed');
const course=(await api('courses/305666')).courses[0];assert.equal(course.owner,current);
const lesson=(await api('lessons/2706555')).lessons[0];assert.equal(lesson.owner,current);assert.ok(lesson.courses.includes(305666));assert.ok(lesson.units.includes(2746570));
async function sources(){const all=[];for(let page=1;page<=10;page++){const d=await api(`step-sources?lesson=2706555&page=${page}`);all.push(...d['step-sources']);if(!d.meta.has_next)return all;}throw new Error('Unexpected pagination');}
const before=await sources();assert.equal(before.length,10);assert.deepEqual([...before].sort((a,b)=>a.position-b.position).map(s=>s.id),ids);
for(const source of before){
  const article=plan.articles.find(a=>a.position===source.position);assert.equal(source.block.name,article.block.name,'Existing task type changed; refusing to overwrite');
  assert.ok(source.block.text.includes(base+`go-mini-module-02-lesson-01-`),'Unrelated content in target lesson');
  assert.equal(article.cost,source.block.name==='text'?0:10);
}
const schema=await api('step-sources','OPTIONS');assert.equal(schema.actions.POST.cost.read_only,false);
console.log(JSON.stringify({account:current,lesson:2706555,steps:10,graded:4,points:40,mode:apply?'apply':'read-only preflight'},null,2));
if(!apply)process.exit(0);
// Verify the exact approved files, not merely HTTP 200 or a stale CDN copy.
for(const file of [...Array.from({length:10},(_,i)=>`go-mini-module-02-lesson-01-v2-step-${String(i+1).padStart(2,'0')}.html`),'assets/go-mini-information-v2.js','assets/go-mini-information-v2-content.js','assets/go-mini-information-v2.css','assets/go-mini-information-v2-embed.css']){
  const response=await fetch(base+file+'?v='+plan.version);assert.equal(response.status,200,`Page not live: ${file}`);
  assert.equal(createHash('sha256').update(await response.text()).digest('hex'),createHash('sha256').update(await readFile(file)).digest('hex'),`CDN content mismatch: ${file}`);
}
await mkdir('.local-publication',{recursive:true});
await writeFile(`.local-publication/stepik-v2-before-${Date.now()}.json`,JSON.stringify({course,lesson,sources:before},null,2));
const uploaded=[];
for(const article of plan.articles){
  const old=before.find(s=>s.position===article.position);
  const fresh=(await api(`step-sources/${old.id}`))['step-sources'][0];assert.equal(fresh.update_date,old.update_date,'Concurrent Stepik edit detected; stopping');
  await api(`step-sources/${old.id}`,'PUT',{stepSource:{lesson:2706555,position:article.position,cost:article.cost,block:article.block}});
  let source;
  for(let attempt=0;attempt<25;attempt++){
    source=(await api(`step-sources/${old.id}`))['step-sources'][0];
    if(source.status!==10)break;
    await new Promise(resolve=>setTimeout(resolve,800));
  }
  assert.equal(source.id,old.id);assert.equal(source.position,article.position);assert.equal(source.block.name,article.block.name);assert.equal(source.cost,article.cost);
  assert.equal(source.is_enabled,true,`Step ${source.id} is not available on the free plan`);
  assert.ok(source.status===1000&&!source.error?.code&&!source.error?.text,`Step ${source.id} failed validation or is not ready`);
  assert.equal((source.block.text.match(/<iframe/g)||[]).length,(article.block.text.match(/<iframe/g)||[]).length,'An experiment was stripped');
  assert.ok(source.block.text.includes('v='+plan.version));assert.ok(source.block.text.length>article.block.text.length*.7,'Content was stripped');
  if(article.cost){assert.ok(source.block.text.includes('10 баллов'));assert.deepEqual(source.block.source,article.block.source,'Native checker differs from the exported checker');}
  uploaded.push({position:source.position,id:source.id,type:source.block.name,cost:source.cost});
  await writeFile('.local-publication/stepik-v2-upload.json',JSON.stringify({lesson:2706555,unit:2746570,uploaded},null,2));
  console.log(`Step ${source.position}: ${source.id}, ${source.block.name}, ${source.cost} points`);
}
const after=await sources();assert.equal(after.length,10);assert.equal(after.reduce((sum,s)=>sum+s.cost,0),40);
for(const s of after){assert.equal(s.id,ids[s.position-1]);assert.equal(s.cost,[4,5,7,9].includes(s.position)?10:0);assert.equal(s.is_enabled,true);}
const afterCourse=(await api('courses/305666')).courses[0],afterLesson=(await api('lessons/2706555')).lessons[0];
assert.equal(afterCourse.is_public,course.is_public);assert.equal(afterCourse.is_enabled,course.is_enabled);assert.equal(afterLesson.is_draft,lesson.is_draft);assert.deepEqual(afterLesson.steps,lesson.steps);
console.log(JSON.stringify({url:'https://stepik.org/lesson/2706555/step/1?unit=2746570',points:40,uploaded,visibilityUnchanged:true},null,2));

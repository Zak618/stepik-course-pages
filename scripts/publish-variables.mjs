/* Only the approved variables lesson. Default mode is a read-only preflight.
   Never delete steps, retry POST blindly, or change course/lesson settings. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {target} from './lib/variables-browser.mjs';

const apply=process.argv.includes('--apply');
const plan=JSON.parse(await readFile('.local-publication/variables.json','utf8'));
for(const key of ['course','lesson','unit','account','title'])assert.equal(plan[key],target[key]);
assert.equal(plan.articles.length,16);
assert.equal(plan.articles.reduce((sum,a)=>sum+a.cost,0),90);
assert.deepEqual(plan.articles.map(a=>a.position),Array.from({length:16},(_,i)=>i+1));
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const hash=value=>createHash('sha256').update(value).digest('hex');
// Stepik strips unsupported CSS; HTML byte counts do not measure lost theory.
// Compare the readable content instead, normalizing only HTML/whitespace.
const readable=html=>html.replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity)=>entity[0]==='#'?String.fromCodePoint(entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[entity.toLowerCase()]).replace(/\s+/g,' ').trim();
const sourceHash=items=>hash(JSON.stringify(items.map(({id,position,cost,block,update_date,is_enabled})=>({id,position,cost,block,update_date,is_enabled}))));
async function api(path,method='GET',body){
  const response=await fetch('https://stepik.org/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`${method} ${path}: HTTP ${response.status}: ${(await response.text()).slice(0,1200)}`);
  return response.json();
}
async function sources(lesson){
  const all=[];
  for(let page=1;page<=20;page++){
    const result=await api(`step-sources?lesson=${lesson}&page=${page}`);
    all.push(...result['step-sources']);
    if(!result.meta.has_next)return all.sort((a,b)=>a.position-b.position);
  }
  throw Error('Unexpected pagination');
}
const account=(await api('stepics/1')).stepics[0].user;
assert.equal(account,target.account);
const course=(await api('courses/'+target.course)).courses[0];
const lesson=(await api('lessons/'+target.lesson)).lessons[0];
const unit=(await api('units/'+target.unit)).units[0];
assert.equal(course.owner,account);assert.equal(lesson.owner,account);
assert.equal(lesson.title,target.title);assert.ok(lesson.courses.includes(target.course));
assert.ok(lesson.units.includes(target.unit));assert.equal(unit.lesson,target.lesson);
const existing=await sources(target.lesson),untouched={};
for(const id of [2706554,2706555,2706556,2706559])untouched[id]=await sources(id);
let journal={lesson:target.lesson,version:plan.version,uploaded:[]};
try{journal=JSON.parse(await readFile('.local-publication/variables-upload.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
assert.equal(journal.lesson,target.lesson);assert.equal(journal.version,plan.version);
assert.equal(new Set(existing.map(s=>s.position)).size,existing.length);assert.ok(existing.length<=16);
for(const source of existing){
  const entry=journal.uploaded.find(e=>e.id===source.id&&e.position===source.position);
  const expected=plan.articles.find(a=>a.position===source.position);
  assert.ok(entry&&expected,'Unrelated lesson content: refusing to overwrite');
  assert.equal(source.block.name,expected.block.name);assert.equal(source.cost,expected.cost);
  assert.equal(source.update_date,entry.update_date,'Concurrent edit: refusing to overwrite');
  assert.equal(entry.planHash,hash(JSON.stringify(expected)),'Plan changed after a partial publication');
}
console.log(JSON.stringify({account,lesson:lesson.id,title:lesson.title,existingSteps:existing.length,plannedSteps:16,codeTasks:8,choiceTasks:1,points:90,mode:apply?'apply':'read-only preflight'},null,2));
if(!apply)process.exit(0);
// The entire static dependency graph must already be live and byte-for-byte current.
await Promise.all(plan.files.map(async file=>{
  const response=await fetch('https://zak618.github.io/stepik-course-pages/'+file+'?v='+plan.version,{signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,'Pages file not live: '+file);
  assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(await readFile(file)),'Stale Pages file: '+file);
}));
await mkdir('.local-publication',{recursive:true});
await writeFile(`.local-publication/variables-before-${Date.now()}.json`,JSON.stringify({course,lesson,unit,sources:existing,untouched},null,2));
for(const article of plan.articles){
  const fresh=await sources(target.lesson);
  assert.ok(fresh.every(s=>journal.uploaded.some(e=>e.id===s.id)),'Concurrent lesson edit');
  let current=fresh.find(s=>s.position===article.position);
  if(current){
    const prior=journal.uploaded.find(e=>e.id===current.id);
    assert.equal(current.update_date,prior.update_date,'Concurrent step edit');
    assert.equal(prior.planHash,hash(JSON.stringify(article)));
  }else{
    // A failed POST is not retried automatically: reconcile its ID before resuming.
    const result=await api('step-sources','POST',{stepSource:{lesson:target.lesson,...article}});
    current=result['step-sources'][0];
    journal.uploaded.push({id:current.id,position:current.position,cost:article.cost,type:article.block.name,update_date:current.update_date,planHash:hash(JSON.stringify(article))});
    await writeFile('.local-publication/variables-upload.json',JSON.stringify(journal,null,2));
  }
  let checked;
  for(let attempt=0;attempt<40;attempt++){
    checked=(await api('step-sources/'+current.id))['step-sources'][0];
    if(!['preparing',10].includes(checked.status))break;
    await new Promise(resolve=>setTimeout(resolve,900));
  }
  journal.uploaded.find(e=>e.id===current.id).update_date=checked.update_date;
  await writeFile('.local-publication/variables-upload.json',JSON.stringify(journal,null,2));
  assert.equal(checked.lesson,target.lesson);assert.equal(checked.position,article.position);
  assert.equal(checked.cost,article.cost);assert.equal(checked.block.name,article.block.name);
  assert.equal(checked.needs_plan,null);assert.equal(checked.is_enabled,true);
  assert.ok(['ready',1000].includes(checked.status),JSON.stringify({status:checked.status,error:checked.error}));
  assert.ok(!checked.error?.text&&!checked.error?.code);
  assert.equal((checked.block.text.match(/<iframe/g)||[]).length,article.cost?0:1);
  assert.equal(readable(checked.block.text),readable(article.block.text),'Stepik removed or changed readable content');
  assert.ok(!/рад видеть|localhost:|10 баллов|Команда WEB HACKER/.test(checked.block.text));
  if(article.block.name==='code'){
    for(const key of ['code','templates_data','execution_time_limit','execution_memory_limit','samples_count'])assert.deepEqual(checked.block.source[key],article.block.source[key]);
    const publicStep=(await api('steps/'+checked.id)).steps[0];
    assert.deepEqual(Object.keys(publicStep.block.options.code_templates),['go']);
    assert.ok(publicStep.block.options.limits.go);assert.equal(publicStep.block.options.samples.length,1);
    const expected=JSON.parse(article.block.source.code.match(/^EXPECTED = (.+)/)[1]);
    assert.equal(publicStep.block.options.samples[0][1].replace(/\r\n/g,'\n').replace(/\n+$/,''),expected.replace(/\n+$/,''));
  }else if(article.cost)assert.deepEqual(checked.block.source,article.block.source);
  console.log(`Step ${article.position}: ${checked.id}, ${checked.block.name}, ${checked.cost} points, ready`);
}
const after=await sources(target.lesson),afterLesson=(await api('lessons/'+target.lesson)).lessons[0];
const afterCourse=(await api('courses/'+target.course)).courses[0],afterUnit=(await api('units/'+target.unit)).units[0];
assert.equal(after.length,16);assert.equal(after.reduce((s,a)=>s+a.cost,0),90);
assert.equal(after.filter(s=>s.block.name==='code').length,8);
assert.equal(after.filter(s=>s.block.name==='choice').length,1);
assert.equal(afterLesson.is_draft,lesson.is_draft);assert.equal(afterLesson.title,lesson.title);
assert.deepEqual(afterLesson.units,lesson.units);assert.deepEqual(afterCourse.sections,course.sections);
assert.equal(afterCourse.is_public,course.is_public);assert.equal(afterCourse.is_enabled,course.is_enabled);
for(const key of ['lesson','section','position','is_active'])assert.deepEqual(afterUnit[key],unit[key]);
for(const [id,items]of Object.entries(untouched))assert.equal(sourceHash(await sources(id)),sourceHash(items),'Unrelated lesson changed: '+id);
await writeFile('.local-publication/variables-verified.json',JSON.stringify({lesson:target.lesson,unit:target.unit,sources:after},null,2));
console.log(JSON.stringify({url:`https://stepik.org/lesson/${target.lesson}/step/1?unit=${target.unit}`,steps:16,points:90,codeTasks:8,visibilityUnchanged:true,previousLessonsUnchanged:true},null,2));

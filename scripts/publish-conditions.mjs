/* Publication is limited to module04/lesson01. No deletion, course settings,
   learner submissions, or blind retries of a possibly completed POST. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const target={course:305666,lesson:2706562,unit:2746577,account:647088271,title:'Условия и логика'};
const apply=process.argv.includes('--apply');
const compactExamples=process.argv.includes('--compact-examples');
const formatText=process.argv.includes('--format-text');
const plan=JSON.parse(await readFile('.local-publication/conditions.json','utf8'));
for(const key of Object.keys(target))assert.equal(plan[key],target[key]);
assert.equal(plan.articles.length,20);assert.equal(plan.articles.reduce((n,a)=>n+a.cost,0),110);
assert.equal(plan.articles.filter(a=>a.block.name==='code').length,10);
assert.equal(plan.articles.filter(a=>a.block.name==='choice').length,1);
assert.deepEqual(plan.articles.map(a=>a.position),Array.from({length:20},(_,i)=>i+1));
const hash=s=>createHash('sha256').update(s).digest('hex');
const readable=s=>s.replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[e.toLowerCase()]).replace(/\s+/g,'');
const sourceHash=items=>hash(JSON.stringify(items.map(({id,lesson,position,cost,block,update_date,is_enabled})=>({id,lesson,position,cost,block,update_date,is_enabled}))));
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
async function api(path,method='GET',body){
 const r=await fetch('https://stepik.org/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(`${method} ${path}: HTTP ${r.status}: ${(await r.text()).slice(0,500)}`);
 return r.json();
}
async function sources(id){const items=[];for(let page=1;page<=20;page++){const r=await api(`step-sources?lesson=${id}&page=${page}`);items.push(...r['step-sources']);if(!r.meta.has_next)return items.sort((a,b)=>a.position-b.position);}throw Error('Unexpected source pagination');}
async function structure(){
 const course=(await api('courses/'+target.course)).courses[0],sections=[],units=[];
 for(const id of course.sections){const section=(await api('sections/'+id)).sections[0];sections.push({id:section.id,title:section.title,position:section.position,units:section.units});for(const unitId of section.units){const u=(await api('units/'+unitId)).units[0];units.push({id:u.id,lesson:u.lesson,section:u.section,position:u.position,is_active:u.is_active});}}
 return {course:{id:course.id,owner:course.owner,title:course.title,is_public:course.is_public,is_enabled:course.is_enabled,sections:course.sections},sections,units};
}
const account=(await api('stepics/1')).stepics[0].user;assert.equal(account,target.account);
const beforeStructure=await structure();assert.equal(beforeStructure.course.owner,account);
const lesson=(await api('lessons/'+target.lesson)).lessons[0];
assert.equal(lesson.owner,account);assert.equal(lesson.title,target.title);assert.ok(lesson.courses.includes(target.course));assert.ok(lesson.units.includes(target.unit));
assert.ok(beforeStructure.units.some(u=>u.id===target.unit&&u.lesson===target.lesson));
const untouched={};for(const id of [...new Set(beforeStructure.units.map(u=>u.lesson))].filter(id=>id!==target.lesson))untouched[id]=await sources(id);
const existing=await sources(target.lesson);
let journal={lesson:target.lesson,version:plan.version,uploaded:[]};
try{journal=JSON.parse(await readFile('.local-publication/conditions-upload.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
assert.equal(journal.lesson,target.lesson);assert.equal(journal.version,plan.version);
assert.ok(existing.length<=20);assert.equal(new Set(existing.map(s=>s.position)).size,existing.length);
function assertCompact(source,expected){
 if(formatText){assert.equal(source.block.name,expected.block.name);assert.equal(source.cost,expected.cost);assert.deepEqual(source.block.source,expected.block.source);assert.equal(readable(source.block.text),readable(expected.block.text),'Formatting must preserve all text');const frames=h=>[...h.matchAll(/<iframe[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'));assert.deepEqual(frames(source.block.text),frames(expected.block.text),'Formatting may not change embedded pages');return;}
 assert.ok(compactExamples,'Plan changed after publication');assert.equal(source.block.name,'code');assert.equal(expected.block.name,'code');assert.equal(source.cost,expected.cost);assert.deepEqual(source.block.source,expected.block.source,'A formatting update may not change tests/templates/visibility');
 assert.ok(source.block.text.includes('Примеры для проверки'),'Only remove the known duplicate examples');assert.ok(!/Примеры для проверки|Точная запись|<h[23]/.test(expected.block.text),'Only the original task condition may remain');assert.ok(readable(source.block.text).startsWith(readable(expected.block.text)),'Task condition may not change');
}
for(const source of existing){const entry=journal.uploaded.find(e=>e.id===source.id&&e.position===source.position),expected=plan.articles.find(a=>a.position===source.position);assert.ok(entry&&expected,'Unrelated lesson content; refusing overwrite');assert.equal(source.block.name,expected.block.name);assert.equal(source.cost,expected.cost);if(entry.planHash!==hash(JSON.stringify(expected)))assertCompact(source,expected);assert.equal(source.update_date,entry.update_date,'Concurrent step edit');}
const testsOf=a=>JSON.parse(a.block.source.code.match(/^TESTS = (.+)/)[1]);
let cases=0;for(const a of plan.articles.filter(a=>a.block.name==='code')){const tests=testsOf(a);assert.equal(a.block.source.samples_count,tests.length,'Every grader input must be open');assert.ok(tests.length>=10);assert.equal(new Set(tests.map(t=>t[0])).size,tests.length);assert.ok(!/Примеры для проверки|Точная запись/.test(a.block.text),'Do not duplicate native samples');cases+=tests.length;}
console.log(JSON.stringify({account,lesson:lesson.id,title:lesson.title,existingSteps:existing.length,plannedSteps:20,points:110,openInputCases:cases,otherLessons: Object.keys(untouched).length,mode:apply?'apply':'read-only preflight'},null,2));
if(!apply)process.exit(0);
// Fail before creating any Stepik step if one static dependency is stale.
await Promise.all(plan.files.map(async file=>{assert.ok(/^(assets\/go-mini-conditions[\w.-]*\.(js|css)|courses\/305666-go-mini\/modules\/04-control-flow\/lesson-01-[\w-]+\.html)$/.test(file));const r=await fetch('https://zak618.github.io/stepik-course-pages/'+file+'?v='+plan.version,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,'Pages not ready: '+file);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(await readFile(file)),'Stale Pages: '+file);}));
await mkdir('.local-publication',{recursive:true});
await writeFile(`.local-publication/conditions-before-${Date.now()}.json`,JSON.stringify({lesson,structure:beforeStructure,sources:existing,untouched},null,2));
for(const article of plan.articles){
 const fresh=await sources(target.lesson);assert.ok(fresh.every(s=>journal.uploaded.some(e=>e.id===s.id)),'Concurrent lesson edit');
 let current=fresh.find(s=>s.position===article.position);
 if(current){const entry=journal.uploaded.find(e=>e.id===current.id);assert.equal(current.update_date,entry.update_date,'Concurrent step edit');if(entry.planHash!==hash(JSON.stringify(article))){assertCompact(current,article);const result=await api('step-sources/'+current.id,'PUT',{stepSource:{lesson:target.lesson,...article}});current=result['step-sources'][0];entry.planHash=hash(JSON.stringify(article));entry.update_date=current.update_date;await writeFile('.local-publication/conditions-upload.json',JSON.stringify(journal,null,2));}}
 else{
  const created=await api('step-sources','POST',{stepSource:{lesson:target.lesson,...article}});current=created['step-sources'][0];
  journal.uploaded.push({id:current.id,position:article.position,update_date:current.update_date,planHash:hash(JSON.stringify(article)),type:article.block.name,cost:article.cost});
  await writeFile('.local-publication/conditions-upload.json',JSON.stringify(journal,null,2));
 }
 let checked;for(let attempt=0;attempt<50;attempt++){checked=(await api('step-sources/'+current.id))['step-sources'][0];if(!['preparing',10].includes(checked.status))break;await new Promise(r=>setTimeout(r,850));}
 journal.uploaded.find(e=>e.id===current.id).update_date=checked.update_date;await writeFile('.local-publication/conditions-upload.json',JSON.stringify(journal,null,2));
 assert.equal(checked.lesson,target.lesson);assert.equal(checked.position,article.position);assert.equal(checked.cost,article.cost);assert.equal(checked.block.name,article.block.name);
 assert.equal(checked.needs_plan,null);assert.equal(checked.is_enabled,true);assert.ok(['ready',1000].includes(checked.status),JSON.stringify({status:checked.status,error:checked.error}));assert.ok(!checked.error?.text&&!checked.error?.code);
 assert.equal(readable(checked.block.text),readable(article.block.text),'Readable text changed during sanitization');assert.equal((checked.block.text.match(/<iframe/g)||[]).length,article.block.name==='text'?1:0);assert.ok(!/localhost:|10 баллов|Команда WEB HACKER/.test(checked.block.text));
 if(article.block.name==='code'){
  for(const key of ['code','templates_data','execution_time_limit','execution_memory_limit','samples_count'])assert.deepEqual(checked.block.source[key],article.block.source[key]);
  const publicStep=(await api('steps/'+checked.id)).steps[0];assert.deepEqual(Object.keys(publicStep.block.options.code_templates),['go']);assert.ok(publicStep.block.options.limits.go);
  const tests=testsOf(article),samples=publicStep.block.options.samples;assert.equal(samples.length,tests.length,'Not all tests are open in native task');
  for(let i=0;i<tests.length;i++){assert.equal(samples[i][0].replace(/\r\n/g,'\n'),tests[i][0].replace(/\r\n/g,'\n'));assert.equal(samples[i][1].replace(/\r\n/g,'\n').replace(/\n+$/,''),tests[i][1].replace(/\r\n/g,'\n').replace(/\n+$/,''));}
 }else if(article.block.name==='choice')assert.deepEqual(checked.block.source,article.block.source);
 console.log(`Step ${article.position}: ${checked.id}, ${checked.block.name}, ${checked.cost} points, ready`);
}
const after=await sources(target.lesson),afterLesson=(await api('lessons/'+target.lesson)).lessons[0];
if(compactExamples)for(const prior of existing.filter(s=>s.block.name!=='code'))assert.equal(sourceHash([after.find(s=>s.id===prior.id)]),sourceHash([prior]),'An unrelated step changed');
assert.equal(after.length,20);assert.equal(after.reduce((n,s)=>n+s.cost,0),110);assert.equal(after.filter(s=>s.block.name==='code').length,10);assert.equal(after.filter(s=>s.block.name==='choice').length,1);
assert.equal(afterLesson.title,lesson.title);assert.equal(afterLesson.is_draft,lesson.is_draft);assert.deepEqual(afterLesson.units,lesson.units);assert.deepEqual(await structure(),beforeStructure,'Course structure/visibility changed');
for(const [id,items]of Object.entries(untouched))assert.equal(sourceHash(await sources(id)),sourceHash(items),'Unrelated lesson changed: '+id);
await writeFile('.local-publication/conditions-verified.json',JSON.stringify({lesson:target.lesson,unit:target.unit,sources:after},null,2));
console.log(JSON.stringify({url:`https://stepik.org/lesson/${target.lesson}/step/1?unit=${target.unit}`,steps:20,points:110,openInputCases:cases,allCasesOpen:true,visibilityUnchanged:true,otherLessonsUnchanged:true},null,2));

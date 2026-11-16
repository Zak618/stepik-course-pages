/* Scoped publication: module06/lesson01 only. No deletions or blind POST retry. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {target,frameSteps} from './lib/project-browser.mjs';
const apply=process.argv.includes('--apply'),refreshScenes=false;
const plan=JSON.parse(await readFile('.local-publication/project.json','utf8'));
for(const key of Object.keys(target))assert.equal(plan[key],target[key]);
assert.equal(plan.articles.length,12);assert.equal(plan.articles.reduce((n,a)=>n+a.cost,0),70);
assert.equal(plan.articles.filter(a=>a.block.name==='code').length,7);
assert.equal(plan.articles.filter(a=>a.block.name==='choice').length,0);
assert.deepEqual(plan.articles.map(a=>a.position),Array.from({length:12},(_,i)=>i+1));
const hash=s=>createHash('sha256').update(s).digest('hex');
const readable=s=>s.replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[e.toLowerCase()]).replace(/\s+/g,'');
const sourceHash=items=>hash(JSON.stringify(items.map(({id,lesson,position,cost,block,update_date,is_enabled})=>({id,lesson,position,cost,block,update_date,is_enabled}))));
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
async function api(path,method='GET',body){
 const r=await fetch('https://stepik.org/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(`${method} ${path}: HTTP ${r.status}`);
 return r.json();
}
async function sources(id){const items=[];for(let page=1;page<=20;page++){const r=await api(`step-sources?lesson=${id}&page=${page}`);items.push(...r['step-sources']);if(!r.meta.has_next)return items.sort((a,b)=>a.position-b.position);}throw Error('Unexpected pagination');}
async function structure(){
 const course=(await api('courses/'+target.course)).courses[0],sections=[],units=[];
 for(const id of course.sections){const section=(await api('sections/'+id)).sections[0];sections.push({id:section.id,title:section.title,position:section.position,units:section.units});for(const unitId of section.units){const u=(await api('units/'+unitId)).units[0];units.push({id:u.id,lesson:u.lesson,section:u.section,position:u.position,is_active:u.is_active});}}
 return{course:{id:course.id,owner:course.owner,title:course.title,is_public:course.is_public,is_enabled:course.is_enabled,sections:course.sections},sections,units};
}
const account=(await api('stepics/1')).stepics[0].user;assert.equal(account,target.account);
const beforeStructure=await structure();assert.equal(beforeStructure.course.owner,account);
const lesson=(await api('lessons/'+target.lesson)).lessons[0];
assert.equal(lesson.owner,account);assert.equal(lesson.title,target.title);assert.ok(lesson.courses.includes(target.course));assert.ok(lesson.units.includes(target.unit));
assert.ok(beforeStructure.units.some(u=>u.id===target.unit&&u.lesson===target.lesson));
const untouched={};for(const id of [...new Set(beforeStructure.units.map(u=>u.lesson))].filter(id=>id!==target.lesson))untouched[id]=await sources(id);
const existing=await sources(target.lesson);
let journal={lesson:target.lesson,version:plan.version,uploaded:[]};
try{journal=JSON.parse(await readFile('.local-publication/project-upload.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
assert.equal(journal.lesson,target.lesson);
assert.equal(journal.version,plan.version,'Unexpected publication version');
function assertSceneRefresh(){throw Error('Existing content differs; refusing overwrite');}
assert.ok(existing.length<=12);assert.equal(new Set(existing.map(s=>s.position)).size,existing.length);
for(const source of existing){const entry=journal.uploaded.find(e=>e.id===source.id&&e.position===source.position),expected=plan.articles.find(a=>a.position===source.position);assert.ok(entry&&expected,'Unrelated content; refusing overwrite');if(entry.planHash!==hash(JSON.stringify(expected)))assertSceneRefresh(source,expected);assert.equal(source.block.name,expected.block.name);assert.equal(source.cost,expected.cost);assert.equal(source.update_date,entry.update_date,'Concurrent step edit');}
const testsOf=a=>JSON.parse(a.block.source.code.match(/^TESTS = (.+)/)[1]);
let cases=0;for(const a of plan.articles.filter(a=>a.block.name==='code')){const tests=testsOf(a);assert.equal(a.block.source.samples_count,tests.length);assert.ok(tests.length>=12);assert.equal(new Set(tests.map(t=>t[0])).size,tests.length);assert.ok(!/Примеры для проверки|Точная запись|<pre/.test(a.block.text),'Only native samples');cases+=tests.length;}
for(const n of [10,12])assert.equal(plan.articles[n-1].block.source.templates_data.trim(),'::go\npackage main\n\nfunc main() {\n\n}','Last tasks must be independent');
assert.equal(cases,88);
console.log(JSON.stringify({account,lesson:lesson.id,title:lesson.title,existingSteps:existing.length,plannedSteps:12,points:70,openInputCases:cases,otherLessons:Object.keys(untouched).length,mode:apply?'apply':'read-only preflight'},null,2));
if(!apply)process.exit(0);
// CDN readiness checks are GET-only; mutations below are never blindly retried.
async function checkPage(file){
 assert.ok(/^(assets\/go-mini-project[\w.-]*\.(js|css)|assets\/go-mini-conditions\.css|courses\/305666-go-mini\/modules\/06-project\/lesson-01-[\w-]+\.html)$/.test(file));
 const expected=hash(await readFile(file));
 for(let attempt=0;attempt<4;attempt++){
  const r=await fetch('https://zak618.github.io/stepik-course-pages/'+file+'?v='+plan.version,{signal:AbortSignal.timeout(30000)});
  if(r.ok&&hash(Buffer.from(await r.arrayBuffer()))===expected)return;
  if(attempt===3)throw Error('Pages not ready: '+file+' HTTP '+r.status);
  await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));
 }
}
for(let start=0;start<plan.files.length;start+=4)await Promise.all(plan.files.slice(start,start+4).map(checkPage));
await mkdir('.local-publication',{recursive:true});
await writeFile(`.local-publication/project-before-${Date.now()}.json`,JSON.stringify({lesson,structure:beforeStructure,sources:existing,untouched},null,2));
journal.version=plan.version;
for(const article of plan.articles.filter(a=>!refreshScenes||frameSteps.includes(a.position))){
 const fresh=await sources(target.lesson);assert.ok(fresh.every(s=>journal.uploaded.some(e=>e.id===s.id)),'Concurrent lesson edit');
 let current=fresh.find(s=>s.position===article.position);
 if(current){const entry=journal.uploaded.find(e=>e.id===current.id);assert.equal(current.update_date,entry.update_date,'Concurrent step edit');if(entry.planHash!==hash(JSON.stringify(article))){assertSceneRefresh(current,article);const result=await api('step-sources/'+current.id,'PUT',{stepSource:{lesson:target.lesson,...article}});current=result['step-sources'][0];entry.planHash=hash(JSON.stringify(article));entry.update_date=current.update_date;await writeFile('.local-publication/project-upload.json',JSON.stringify(journal,null,2));}}
 else{
  const created=await api('step-sources','POST',{stepSource:{lesson:target.lesson,...article}});current=created['step-sources'][0];
  journal.uploaded.push({id:current.id,position:article.position,update_date:current.update_date,planHash:hash(JSON.stringify(article)),type:article.block.name,cost:article.cost});
  await writeFile('.local-publication/project-upload.json',JSON.stringify(journal,null,2));
 }
 let checked;for(let attempt=0;attempt<50;attempt++){checked=(await api('step-sources/'+current.id))['step-sources'][0];if(!['preparing',10].includes(checked.status))break;await new Promise(r=>setTimeout(r,850));}
 journal.uploaded.find(e=>e.id===current.id).update_date=checked.update_date;await writeFile('.local-publication/project-upload.json',JSON.stringify(journal,null,2));
 assert.equal(checked.lesson,target.lesson);assert.equal(checked.position,article.position);assert.equal(checked.cost,article.cost);assert.equal(checked.block.name,article.block.name);
 assert.equal(checked.needs_plan,null);assert.equal(checked.is_enabled,true);assert.ok(['ready',1000].includes(checked.status),JSON.stringify({status:checked.status,error:checked.error}));assert.ok(!checked.error?.text&&!checked.error?.code);
 assert.equal(readable(checked.block.text),readable(article.block.text),'Text changed in sanitization');assert.equal((checked.block.text.match(/<iframe/g)||[]).length,article.block.name==='text'?1:0);assert.ok(!/localhost:|10 баллов|Команда WEB HACKER/.test(checked.block.text));
 if(article.block.name==='code'){
  for(const key of ['code','templates_data','execution_time_limit','execution_memory_limit','samples_count'])assert.deepEqual(checked.block.source[key],article.block.source[key]);
  const publicStep=(await api('steps/'+checked.id)).steps[0];assert.deepEqual(Object.keys(publicStep.block.options.code_templates),['go']);assert.ok(publicStep.block.options.limits.go);
  const tests=testsOf(article),samples=publicStep.block.options.samples;assert.equal(samples.length,tests.length,'Native samples missing');
  for(let i=0;i<tests.length;i++){assert.equal(samples[i][0].replace(/\r\n/g,'\n'),tests[i][0].replace(/\r\n/g,'\n'));assert.equal(samples[i][1].replace(/\r\n/g,'\n').replace(/\n+$/,''),tests[i][1].replace(/\r\n/g,'\n').replace(/\n+$/,''));}
 }else if(article.block.name==='choice')assert.deepEqual(checked.block.source,article.block.source);
 console.log(`Step ${article.position}: ${checked.id}, ${checked.block.name}, ${checked.cost} points, ready`);
}
const after=await sources(target.lesson),afterLesson=(await api('lessons/'+target.lesson)).lessons[0];
assert.equal(after.length,12);assert.equal(after.reduce((n,s)=>n+s.cost,0),70);assert.equal(after.filter(s=>s.block.name==='code').length,7);assert.equal(after.filter(s=>s.block.name==='choice').length,0);
assert.equal(afterLesson.title,lesson.title);assert.equal(afterLesson.is_draft,lesson.is_draft);assert.deepEqual(afterLesson.units,lesson.units);assert.deepEqual(await structure(),beforeStructure,'Course structure/visibility changed');
if(refreshScenes)for(const source of existing.filter(s=>!frameSteps.includes(s.position)))assert.equal(sourceHash([after.find(s=>s.id===source.id)]),sourceHash([source]),'A graded step changed');
for(const[id,items]of Object.entries(untouched))assert.equal(sourceHash(await sources(id)),sourceHash(items),'Unrelated lesson changed: '+id);
await writeFile('.local-publication/project-verified.json',JSON.stringify({lesson:target.lesson,unit:target.unit,sources:after},null,2));
console.log(JSON.stringify({url:`https://stepik.org/lesson/${target.lesson}/step/1?unit=${target.unit}`,steps:12,points:70,openInputCases:cases,allCasesOpen:true,visibilityUnchanged:true,otherLessonsUnchanged:true},null,2));

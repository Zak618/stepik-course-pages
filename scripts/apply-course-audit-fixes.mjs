// Ten narrowly scoped edits approved after the read-only course audit.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const apply=process.argv.includes('--apply'),verifyOnly=process.argv.includes('--verify');
const version='audit-fixes-20261115-1',courseId=305666,accountId=647088271;
const path='.local-publication/course-audit-fixes.json';
const sourceFiles=['assets/go-mini-information-v2-content.js','assets/go-mini-algorithms-content.js','assets/go-mini-first-program-content.js','assets/go-mini-variables-content.js','assets/go-mini-project-content.js'];
const greetings=new Map([[12384973,'Итак, рады снова вас видеть. Начинаем первый урок!'],[12390669,'Итак, снова рады вас видеть! '],[12391180,'Итак, рады видеть вас снова! '],[12402650,'Итак, мы рады видеть вас на следующем уроке. ']]);
const inputs=new Map([[12403749,2],[12403751,4],[12403753,6],[12403757,10],[12403759,12]]),projectId=12427852;
const allowed=new Set([...greetings.keys(),...inputs.keys(),projectId]);
const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const pick=(o,keys)=>Object.fromEntries(keys.map(k=>[k,o[k]]));
const readable=s=>s.replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[e.toLowerCase()]).replace(/\s+/g,'');
const importData=async file=>import('data:text/javascript;base64,'+Buffer.from(await readFile(file,'utf8')).toString('base64'));
const inputData=await importData('assets/go-mini-input-content.js'),project=await importData('assets/go-mini-project-content.js');
assert.ok(!project.tasks.searchSession.starter.includes('printFound'));
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
async function api(p,method='GET',body){const r=await fetch('https://stepik.org/api/'+p,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${method} ${p}: HTTP ${r.status}`);return r.json();}
async function allSources(id){const all=[];for(let p=1;p<=20;p++){const r=await api(`step-sources?lesson=${id}&page=${p}`);all.push(...r['step-sources']);if(!r.meta.has_next)return all.sort((a,b)=>a.position-b.position);}throw Error('Unexpected pagination');}
async function snapshot(){
 const course=(await api('courses/'+courseId)).courses[0];assert.equal(course.owner,accountId);
 const sections=await Promise.all(course.sections.map(async id=>pick((await api('sections/'+id)).sections[0],['id','title','position','units'])));
 const units=[];for(const s of sections)units.push(...await Promise.all(s.units.map(async id=>pick((await api('units/'+id)).units[0],['id','lesson','section','position','is_active']))));
 const lessons=[],sources=[];for(let start=0;start<units.length;start+=3){const part=await Promise.all(units.slice(start,start+3).map(async u=>({lesson:pick((await api('lessons/'+u.lesson)).lessons[0],['id','title','owner','is_draft','units','courses','steps']),sources:await allSources(u.lesson)})));for(const p of part){lessons.push(p.lesson);sources.push(...p.sources);}}
 const courseKeys=['id','title','title_en','owner','cover','summary','description','workload','acquired_skills','acquired_assets','target_audience','requirements','learning_format','intro','intro_video','authors','instructors','tags','language','difficulty','sections','is_public','is_enabled','is_paid','price','currency_code','certificate','is_certificate_issued','is_certificate_auto_issued','certificate_regular_threshold','certificate_distinction_threshold','grading_policy','begin_date','end_date'];
 return {course:pick(course,courseKeys),sections,units,lessons,sources};
}
assert.equal((await api('stepics/1')).stepics[0].user,accountId);
let journal;try{journal=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(journal)assert.equal(journal.version,version);
const current=await snapshot(),before=journal?.before||current;
assert.equal(before.lessons.length,13);assert.equal(before.sources.length,183);
assert.equal(before.sources.filter(s=>allowed.has(s.id)).length,10);
const changes=before.sources.filter(s=>allowed.has(s.id)).map(s=>{
 const next=structuredClone(s);let reason;
 if(greetings.has(s.id)){
  assert.equal(s.block.name,'text');assert.equal(s.position,1);const phrase=greetings.get(s.id);assert.equal(s.block.text.split(phrase).length,2);
  if(s.id===12384973){const paragraph=/<p\b[^>]*>Итак, рады снова вас видеть\. Начинаем первый урок!<\/p>/;assert.ok(paragraph.test(next.block.text));next.block.text=next.block.text.replace(paragraph,'');}
  else next.block.text=next.block.text.replace(phrase,'');
  reason='remove repeated greeting';
 }else if(inputs.has(s.id)){
  assert.equal(s.lesson,2706561);assert.equal(s.position,inputs.get(s.id));assert.equal(s.block.name,'code');assert.equal(s.block.source.samples_count,1);
  const tests=JSON.parse(s.block.source.code.match(/^TESTS = (.+)$/m)[1]),task=inputData.tasks[inputData.steps[s.position-1].task];assert.deepEqual(tests,task.tests);
  next.block.source.samples_count=tests.length;
  // Stepik regenerates the public options when examples are opened.
  next.block.options.samples=tests;reason='show all '+tests.length+' existing samples';
 }else{
  assert.equal(s.lesson,2706569);assert.equal(s.position,8);assert.equal(s.block.name,'code');const old='// Используйте printTitles, findTitles и printFound из своих решений.';assert.ok(s.block.source.templates_data.includes(old));
  next.block.source.templates_data=next.block.source.templates_data.replace(old,'// Используйте printTitles и findTitles из прошлых шагов.\n    // Выведите найденные записи и их количество по условию.');
  next.block.options.code_templates.go=next.block.options.code_templates.go.replace(old,'// Используйте printTitles и findTitles из прошлых шагов.\n    // Выведите найденные записи и их количество по условию.');
  assert.equal(next.block.source.templates_data,'::go\n'+project.tasks.searchSession.starter);reason='remove reference to an unassigned helper';
 }
 return {id:s.id,lesson:s.lesson,position:s.position,reason,block:next.block,cost:s.cost};
});
const sourceState=s=>pick(s,['id','lesson','position','cost','block','is_enabled','update_date']);
function verifyStep(s,c){
 const original=before.sources.find(s=>s.id===c.id);assert.deepEqual(pick(s,['id','lesson','position','cost','is_enabled']),pick(original,['id','lesson','position','cost','is_enabled']));
 assert.equal(s.block.name,c.block.name);assert.deepEqual(s.block.source,c.block.source);
 assert.deepEqual(pick(s.block,Object.keys(original.block).filter(k=>!['text','source'].includes(k))),pick(c.block,Object.keys(original.block).filter(k=>!['text','source'].includes(k))));
 assert.equal(readable(s.block.text),readable(c.block.text));assert.deepEqual(s.block.text.match(/<iframe\b[^>]*>/g)||[],original.block.text.match(/<iframe\b[^>]*>/g)||[]);
 assert.ok(['ready',1000].includes(s.status));assert.equal(s.needs_plan,null);assert.ok(!s.error?.text&&!s.error?.code);
}
function verifyUntouched(now){
 for(const key of ['course','sections','units','lessons'])assert.deepEqual(now[key],before[key],key+' changed');
 assert.deepEqual(now.sources.map(s=>s.id),before.sources.map(s=>s.id));
 for(const s of now.sources.filter(s=>!allowed.has(s.id)))assert.equal(hash(sourceState(s)),hash(sourceState(before.sources.find(old=>old.id===s.id))),'Unrelated step changed: '+s.id);
 assert.equal(now.sources.reduce((n,s)=>n+s.cost,0),before.sources.reduce((n,s)=>n+s.cost,0));
}
verifyUntouched(current);
for(const c of changes){const s=current.sources.find(s=>s.id===c.id),original=before.sources.find(s=>s.id===c.id);if(hash(sourceState(s))!==hash(sourceState(original)))verifyStep(s,c);}
console.log(JSON.stringify({mode:verifyOnly?'verify':apply?'apply':'read-only preflight',changes:changes.map(({id,lesson,position,reason})=>({id,lesson,position,reason})),lessons:13,steps:183,untouched:173,points:before.sources.reduce((n,s)=>n+s.cost,0)},null,2));
if(!apply&&!verifyOnly)process.exit(0);
if(apply){
 for(const file of sourceFiles){const r=await fetch('https://zak618.github.io/stepik-course-pages/'+file+'?v='+version,{signal:AbortSignal.timeout(30000)});assert.ok(r.ok&&hash(Buffer.from(await r.arrayBuffer()))===hash(await readFile(file)),'Pages not ready: '+file);}
 if(!journal){await mkdir('.local-publication',{recursive:true});journal={version,before,uploaded:[]};await writeFile(path,JSON.stringify(journal,null,2));}
 for(const c of changes){
  const original=before.sources.find(s=>s.id===c.id);let s=(await api('step-sources/'+c.id))['step-sources'][0];
  if(hash(sourceState(s))===hash(sourceState(original))){s=(await api('step-sources/'+c.id,'PUT',{stepSource:{lesson:c.lesson,position:c.position,cost:c.cost,block:c.block}}))['step-sources'][0];}
  for(let attempt=0;attempt<50;attempt++){s=(await api('step-sources/'+c.id))['step-sources'][0];if(!['preparing',10].includes(s.status))break;await new Promise(r=>setTimeout(r,800));}
  verifyStep(s,c);if(!journal.uploaded.includes(c.id))journal.uploaded.push(c.id);await writeFile(path,JSON.stringify(journal,null,2));console.log('Verified step',c.lesson,c.position);
 }
}
const after=apply?await snapshot():current;verifyUntouched(after);for(const c of changes)verifyStep(after.sources.find(s=>s.id===c.id),c);
for(const c of changes.filter(c=>inputs.has(c.id))){const s=(await api('steps/'+c.id)).steps[0],tests=JSON.parse(c.block.source.code.match(/^TESTS = (.+)$/m)[1]);assert.equal(s.block.options.samples.length,tests.length);assert.deepEqual(Object.keys(s.block.options.code_templates),['go']);for(let i=0;i<tests.length;i++){assert.equal(s.block.options.samples[i][0].replace(/\r\n/g,'\n'),tests[i][0]);assert.equal(s.block.options.samples[i][1].replace(/\r\n/g,'\n').replace(/\n+$/,''),tests[i][1].replace(/\n+$/,''));}}
await writeFile('.local-publication/course-audit-fixes-verified.json',JSON.stringify({version,changed:changes,allInputSamplesOpen:16,otherStepsUnchanged:173,pointsUnchanged:true,courseSettingsUnchanged:true},null,2));
console.log('All 10 fixes saved; 16 examples open; 173 other steps and every score unchanged.');

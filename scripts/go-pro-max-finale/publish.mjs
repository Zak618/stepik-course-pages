// Append one approved final module. Existing lessons are read-only.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
const apply=process.argv.includes('--apply'),verify=process.argv.includes('--verify');
assert.ok(!(apply&&verify));
const dir='.local-publication/go-pro-max-finale-draft',folder='courses/305734-go-pro-max/modules/29-finale';
const plan=JSON.parse(await readFile(dir+'/stepik-drafts.json','utf8'));
assert.equal(plan.course,305734);assert.equal(plan.accountId,647088271);assert.equal(plan.module.position,29);
assert.deepEqual(plan.steps.map(s=>[s.position,s.cost,s.block.name]),[[1,0,'text'],[2,0,'free-answer'],[3,0,'text'],[4,0,'text']]);
const token=JSON.parse(await readFile('.stepik-accounts/647088271/session.json','utf8')).access_token;
async function api(resource,method='GET',payload){
 if(method!=='GET')assert.ok(apply&&method==='POST'&&['sections','lessons','step-sources','units'].includes(resource));
 if(method==='POST'){
  const config=['url = '+JSON.stringify('https://stepik.org/api/'+resource),'request = "POST"','header = '+JSON.stringify('Authorization: Bearer '+token),'header = "Content-Type: application/json"','data-binary = '+JSON.stringify(JSON.stringify(payload))].join('\n')+'\n';
  const child=spawn('curl',['--config','-','--silent','--show-error','--connect-timeout','8','--max-time','40','--write-out','\n%{http_code}'],{stdio:['pipe','pipe','pipe']});let output='';child.stdout.on('data',data=>output+=data);child.stderr.resume();
  const finished=new Promise((resolve,reject)=>{child.on('error',()=>reject(Error('Cannot start transport')));child.on('close',code=>code===0?resolve():reject(Error('POST uncertain; reconcile read-only before retrying')));});child.stdin.on('error',()=>{});child.stdin.end(config);await finished;
  const split=output.lastIndexOf('\n'),status=Number(output.slice(split+1));assert.ok(status>=200&&status<300,'POST '+resource+': HTTP '+status+' '+output.slice(0,split).replaceAll(token,'[redacted]').slice(0,500));return JSON.parse(output.slice(0,split));
 }
 const response=await fetch('https://stepik.org/api/'+resource,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(30000)});
 assert.ok(response.ok,method+' '+resource+': HTTP '+response.status);return response.json();
}
const hash=x=>createHash('sha256').update(x).digest('hex');
const run=promisify(execFile);
const hosted=async path=>(await run('curl',['--fail','--silent','--show-error','--connect-timeout','8','--max-time','25','https://zak618.github.io/stepik-course-pages/'+path],{encoding:'buffer',maxBuffer:2*1024*1024})).stdout;
const pick=(v,keys)=>Object.fromEntries(keys.map(k=>[k,v[k]]));
const courseKeys=['id','owner','title','is_public','is_enabled','is_paid','price','currency_code','description','summary','requirements','target_audience','acquired_skills','certificate_regular_threshold','certificate_distinction_threshold'];
async function batch(type,ids){const result=[];for(let i=0;i<ids.length;i+=12)result.push(...(await api(type+'?'+ids.slice(i,i+12).map(id=>'ids[]='+id).join('&')))[type]);assert.equal(result.length,ids.length);return result;}
async function baseline(course){
 const sections=await batch('sections',course.sections),units=await batch('units',sections.flatMap(s=>s.units)),lessons=await batch('lessons',[...new Set(units.map(u=>u.lesson))]);
 return{course:pick(course,courseKeys),sectionIds:course.sections,sections:sections.map(s=>pick(s,['id','course','title','position','units','required_section','required_percent','is_exam'])),units:units.map(u=>pick(u,['id','section','lesson','position','is_active'])),lessons:lessons.map(l=>pick(l,['id','owner','title','steps','units','courses','is_public','is_draft']))};
}
assert.equal((await api('stepics/1')).stepics[0].user,647088271);
let course=(await api('courses/305734')).courses[0];assert.equal(course.owner,360771622);assert.ok(course.actions.edit_syllabus);
const planHash=hash(JSON.stringify(plan));let journal;
try{journal=JSON.parse(await readFile(dir+'/upload.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(journal){assert.equal(journal.planHash,planHash);assert.deepEqual(pick(course,courseKeys),journal.before.course);}
else{assert.equal(course.sections.length,28);assert.equal(course.total_units,158);}
console.log(JSON.stringify({mode:apply?'apply':verify?'verify':'preflight',course:305734,account:647088271,newModule:29,steps:4}));
if(!apply&&!verify)process.exit(0);
for(const file of ['finale.css','finale.js','embeds/project.html','embeds/telegram.html']){
 assert.equal(hash(await hosted(folder+'/'+file+'?v='+planHash.slice(0,12))),hash(await readFile(folder+'/'+file)),'Hosting not ready: '+file);
}
for(const id of plan.recommendations)assert.ok((await hosted('assets/course-covers/'+id+'.png')).length>1000,'Cover unavailable');
const flush=()=>writeFile(dir+'/upload.json',JSON.stringify(journal,null,2),{mode:0o600});
if(!journal){assert.ok(apply);journal={planHash,before:await baseline(course),operations:{},startedAt:new Date().toISOString()};await writeFile(dir+'/upload.json',JSON.stringify(journal,null,2),{mode:0o600,flag:'wx'});}
async function create(type,key,payload){
 const old=journal.operations[key];if(old){assert.equal(old.hash,hash(JSON.stringify(payload)));assert.ok(old.id,'Ambiguous POST. Reconcile read-only before retrying: '+key);return old.id;}
 assert.ok(apply,'Missing published '+key);journal.operations[key]={type,hash:hash(JSON.stringify(payload)),state:'pending'};await flush();
 const singular={'sections':'section','lessons':'lesson','step-sources':'stepSource','units':'unit'}[type];
 const item=(await api(type,'POST',{[singular]:payload}))[type][0];assert.ok(Number.isSafeInteger(item.id));journal.operations[key]={...journal.operations[key],id:item.id,state:'created'};await flush();return item.id;
}
const section=await create('sections','section',{course:305734,position:29,title:plan.module.title,required_section:null,required_percent:100,is_exam:false,exam_duration_minutes:120,random_exam_problems_count:20});
const lesson=await create('lessons','lesson',{owner:647088271,language:'ru',title:plan.lesson.title,is_public:false});
for(const step of plan.steps){
 const {title,...payload}=step;const id=await create('step-sources','step-'+step.position,{lesson,...payload});
 let saved;
 for(let i=0;i<30;i++){saved=(await api('step-sources/'+id))['step-sources'][0];if(saved.status==='ready')break;assert.ok(['preparing',10,'ready'].includes(saved.status),'Unexpected source status '+saved.status);await new Promise(r=>setTimeout(r,500));}
 assert.equal(saved.status,'ready');assert.equal(saved.cost,0);assert.equal(saved.is_enabled,true);assert.equal(saved.block.name,step.block.name);assert.deepEqual(saved.block.source,step.block.source);
 const readable=s=>s.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,'').trim();
 assert.equal(readable(saved.block.text),readable(step.block.text));
 const frames=text=>[...text.matchAll(/<iframe\b[^>]*>/g)].map(([tag])=>({src:tag.match(/\bsrc="([^"]+)"/)?.[1],height:tag.match(/\bheight="(\d+)"/)?.[1]}));
 assert.deepEqual(frames(saved.block.text),frames(step.block.text));
 await writeFile(dir+'/saved-step-'+step.position+'.json',JSON.stringify(saved,null,2),{mode:0o600});
 console.log('Verified step '+step.position+' ('+step.block.name+'): '+id);
}
const unit=await create('units','unit',{section,lesson,position:1});
course=(await api('courses/305734')).courses[0];assert.deepEqual(pick(course,courseKeys),journal.before.course);assert.deepEqual(course.sections,[...journal.before.sectionIds,section]);assert.equal(course.total_units,159);
const current=await baseline({...course,sections:journal.before.sectionIds});assert.deepEqual(current,journal.before,'Existing course content changed');
const s=(await api('sections/'+section)).sections[0],l=(await api('lessons/'+lesson)).lessons[0],u=(await api('units/'+unit)).units[0];
assert.equal(s.position,29);assert.equal(s.title,plan.module.title);assert.deepEqual(s.units,[unit]);assert.equal(u.section,section);assert.equal(u.lesson,lesson);assert.equal(u.position,1);assert.equal(l.title,plan.lesson.title);assert.ok(l.courses.includes(305734));assert.deepEqual(l.steps,plan.steps.map(step=>journal.operations['step-'+step.position].id));
const sources=(await api('step-sources?lesson='+lesson))['step-sources'];assert.equal(sources.length,4);
const result={course:305734,section,lesson,unit,steps:4,module:29,existingLessonsUnchanged:158,settingsUnchanged:true,freeAnswer:true,automaticAnimation:true,url:'https://stepik.org/lesson/'+lesson+'/step/1?unit='+unit,verifiedAt:new Date().toISOString()};
await writeFile(dir+'/verified.json',JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify(result));

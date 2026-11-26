// Insert only new free text steps. Existing source blocks and scores are immutable.
import assert from 'node:assert/strict';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createApi,readSources,pick,sourceKeys,courseKeys,lessonKeys,unitKeys} from './stepik.mjs';
const apply=process.argv.includes('--apply'),verify=process.argv.includes('--verify');
assert.ok(!(apply&&verify));
const only=process.argv.find(arg=>arg.startsWith('--course='))?.slice(9);
const dir='.local-publication/go-max-course-promotions-20261126';
const snapshot=JSON.parse(await readFile(dir+'/snapshot.json','utf8'));
const plan=JSON.parse(await readFile(dir+'/plan.json','utf8'));
assert.equal(plan.account,647088271);assert.equal(plan.targets.length,75);
assert.ok(!plan.targets.some(t=>t.course===305734));
let journal;
try{journal=JSON.parse(await readFile(dir+'/journal.json','utf8'));}
catch(error){if(error.code!=='ENOENT')throw error;journal={revision:plan.revision,records:{},pending:null};}
assert.equal(journal.revision,plan.revision,'Do not rebuild a partially published campaign');
const persist=async()=>{await writeFile(dir+'/journal.tmp',JSON.stringify(journal,null,2),{mode:0o600});await rename(dir+'/journal.tmp',dir+'/journal.json');};
const selected=plan.targets.filter(t=>!only||String(t.course)===only);
assert.ok(selected.length);
let active;
const api=await createApi({apply,allow:(path,method,body)=>{
  if(!active)return false;
  const record=journal.records[active.key]||{};
  const lesson=active.lesson||record.lesson;
  if(method==='POST'&&path==='lessons')return !active.lesson&&body.lesson.title===active.newLessonTitle;
  if(method==='POST'&&path==='units')return !active.lesson&&body.unit.section===active.section&&body.unit.lesson===lesson;
  if(method==='POST'&&path==='step-sources')return body.stepSource.lesson===lesson&&body.stepSource.cost===0&&body.stepSource.block.name==='text'&&body.stepSource.block.text===active.text;
  if(method==='PUT'&&/^step-sources\/\d+$/.test(path))return body.stepSource.lesson===lesson&&snapshot.sources.some(s=>path==='step-sources/'+s.id&&s.lesson===lesson);
  return false;
}});

if(journal.pending){
  const pending=journal.pending,target=plan.targets.find(t=>t.key===pending.key);
  assert.ok(target);
  if(pending.kind==='source'){
    const matches=(await readSources(api,pending.lesson)).filter(s=>s.block.text===target.text&&!snapshot.sources.some(old=>old.id===s.id));
    assert.equal(matches.length,1,'Unknown POST result. Inspect the saved pending request before retrying.');
    journal.records[target.key]={...journal.records[target.key],source:matches[0].id};journal.pending=null;if(apply)await persist();
  }else if(pending.kind==='unit'){
    const section=(await api('sections/'+target.section)).sections[0];
    const data=await api('units?'+section.units.map(id=>'ids[]='+id).join('&'));
    const matches=data.units.filter(unit=>unit.lesson===journal.records[target.key]?.lesson);
    assert.equal(matches.length,1,'Unknown unit creation result. Do not create another lesson.');
    journal.records[target.key].unit=matches[0].id;journal.pending=null;if(apply)await persist();
  }else throw Error('Unknown lesson creation result. Inspect journal.pending; automatic duplication is forbidden.');
}

const originalsFor=lesson=>snapshot.sources.filter(s=>s.lesson===lesson).sort((a,b)=>a.position-b.position);
function inspect(target,current,complete){
  const record=journal.records[target.key]||{},originals=originalsFor(target.lesson);
  const added=current.filter(s=>!originals.some(old=>old.id===s.id));
  assert.ok(added.length<=1,'Unexpected new step in '+target.key);
  if(added.length){assert.equal(added[0].id,record.source);assert.equal(added[0].block.text,target.text);assert.equal(added[0].block.name,'text');assert.equal(added[0].cost,0);assert.equal(added[0].position,target.position);assert.equal(added[0].status,'ready');}
  assert.deepEqual(current.filter(s=>s.id!==record.source).map(s=>s.id),originals.map(s=>s.id),'Original order changed '+target.key);
  for(const original of originals){
    const now=current.find(s=>s.id===original.id);
    assert.deepEqual(pick(now,sourceKeys),pick(original,sourceKeys),'Source changed '+original.id);
    const position=original.position+(original.position>=target.position?1:0);
    if(complete)assert.equal(now.position,position);else assert.ok([original.position,position].includes(now.position));
  }
  if(complete){assert.equal(added.length,1);assert.deepEqual(current.map(s=>s.position),Array.from({length:originals.length+1},(_,i)=>i+1));}
}
async function recoverSource(target,lesson){
  const originals=originalsFor(target.lesson),current=await readSources(api,lesson);
  const added=current.filter(s=>!originals.some(old=>old.id===s.id));
  if(added.length&&!journal.records[target.key]?.source){
    assert.equal(added.length,1);assert.equal(added[0].block.text,target.text);
    journal.records[target.key]={...journal.records[target.key],source:added[0].id};if(apply)await persist();
  }
  inspect(target,current,false);return current;
}
async function create(kind,path,body,target,lesson){
  journal.pending={kind,key:target.key,lesson:lesson||null,startedAt:new Date().toISOString()};await persist();
  const data=await api(path,'POST',body);
  const result=data[path][0];
  journal.records[target.key]={...journal.records[target.key],[kind==='source'?'source':kind]:result.id};
  journal.pending=null;await persist();return result;
}
async function inspectStructure(){
  for(const original of snapshot.courses){
    if(only&&String(original.id)!==only)continue;
    const course=(await api('courses/'+original.id)).courses[0];
    assert.deepEqual(pick(course,courseKeys),pick(original,courseKeys),'Course settings changed '+original.id);
  }
  for(const original of snapshot.sections){
    if(only&&!snapshot.courses.find(c=>String(c.id)===only)?.sections.includes(original.id))continue;
    const section=(await api('sections/'+original.id)).sections[0];
    const created=plan.targets.filter(t=>t.section===original.id&&!t.lesson).map(t=>journal.records[t.key]?.unit).filter(Boolean);
    assert.deepEqual(section.units,[...original.units,...created],'Section units changed '+original.id);
    for(const key of ['id','course','position','title','description','is_active','begin_date','end_date','discount','is_free'])assert.deepEqual(section[key],original[key]);
  }
}

await inspectStructure();
for(const target of selected){
  if(target.lesson){
    const lesson=(await api('lessons/'+target.lesson)).lessons[0];
    assert.deepEqual(pick(lesson,lessonKeys),pick(snapshot.lessons.find(l=>l.id===lesson.id),lessonKeys));
    assert.ok(lesson.actions.edit_lesson);await recoverSource(target,target.lesson);
  }
}
console.log(JSON.stringify({mode:apply?'apply':verify?'verify':'preflight',courses:new Set(selected.map(t=>t.course)).size,targets:selected.length,revision:plan.revision}));
if(!apply&&!verify)process.exit(0);

const run=promisify(execFile),hash=value=>createHash('sha256').update(value).digest('hex');
await Promise.all(plan.assets.map(async file=>{
  const {stdout}=await run('curl',['--fail','--silent','--show-error','--location','--max-time','30','https://zak618.github.io/stepik-course-pages/'+file+'?v='+plan.revision],{encoding:'buffer',maxBuffer:3000000});
  assert.equal(hash(stdout),hash(await readFile(file)),'Hosted bytes differ '+file);
}));

if(apply)for(const target of selected){
  active=target;
  journal.records[target.key]||={};
  let record=journal.records[target.key],lesson=target.lesson||record.lesson;
  if(!lesson){const created=await create('lesson','lessons',{lesson:{title:target.newLessonTitle,is_comments_enabled:true}},target);lesson=created.id;record=journal.records[target.key];}
  if(!target.lesson&&!record.unit){await create('unit','units',{unit:{section:target.section,lesson,position:target.unitPosition}},target,lesson);record=journal.records[target.key];}
  const current=await recoverSource(target,lesson);
  record=journal.records[target.key];
  if(!record.source){
    for(const original of [...originalsFor(target.lesson)].reverse()){
      if(original.position<target.position)continue;
      const fresh=current.find(s=>s.id===original.id),position=original.position+1;
      assert.deepEqual(pick(fresh,sourceKeys),pick(original,sourceKeys));
      if(fresh.position!==position)await api('step-sources/'+fresh.id,'PUT',{stepSource:{lesson,position,cost:fresh.cost,block:fresh.block}});
    }
    await create('source','step-sources',{stepSource:{lesson,position:target.position,cost:0,block:{name:'text',source:{},text:target.text}}},target,lesson);
  }
  inspect(target,await readSources(api,lesson),true);
  journal.records[target.key].done=true;await persist();
  console.log('Ready '+target.key+' '+target.discount+'%');
}
active=null;

const verified=[];
for(const target of selected){
  const record=journal.records[target.key];assert.ok(record?.source,'Step not created '+target.key);
  const lesson=target.lesson||record.lesson,unit=target.unit||record.unit;
  const current=await readSources(api,lesson);inspect(target,current,true);
  assert.equal((await api('steps/'+record.source)).steps[0].block.text,target.text);
  const lessonNow=(await api('lessons/'+lesson)).lessons[0];
  assert.deepEqual(lessonNow.steps,current.map(s=>s.id));
  if(target.lesson)assert.deepEqual(pick(lessonNow,lessonKeys),pick(snapshot.lessons.find(l=>l.id===lesson),lessonKeys));
  else{assert.deepEqual(lessonNow.courses,[target.course]);assert.equal(lessonNow.title,target.newLessonTitle);}
  const unitNow=(await api('units/'+unit)).units[0];
  if(target.unit)assert.deepEqual(pick(unitNow,unitKeys),pick(snapshot.units.find(u=>u.id===unit),unitKeys));
  else{assert.equal(unitNow.lesson,lesson);assert.equal(unitNow.section,target.section);assert.equal(unitNow.position,target.unitPosition);}
  verified.push({course:target.course,placement:target.placement,source:record.source,lesson,unit,position:target.position,discount:target.discount,url:`https://stepik.org/lesson/${lesson}/step/${target.position}?unit=${unit}`});
}
await inspectStructure();
// Even the original shared GitHub lesson must remain byte-for-byte intact.
if(!only){
  const shared=snapshot.lessons.find(l=>l.id===1480698);
  assert.deepEqual((await readSources(api,shared.id)).map(s=>({...pick(s,sourceKeys),position:s.position})),originalsFor(shared.id).map(s=>({...pick(s,sourceKeys),position:s.position})));
}
await writeFile(dir+(only?'/verified-'+only+'.json':'/verified.json'),JSON.stringify({revision:plan.revision,verifiedAt:new Date().toISOString(),account:647088271,originalSourcesPreserved:snapshot.sources.length,originalScoresPreserved:true,courseSettingsPreserved:true,steps:verified},null,2),{mode:0o600});
console.log(JSON.stringify({complete:true,courses:new Set(verified.map(v=>v.course)).size,newSteps:verified.length,originalScoresPreserved:true,courseSettingsPreserved:true}));

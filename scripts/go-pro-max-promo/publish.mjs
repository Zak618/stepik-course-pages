// Only eight course editorial fields. No lessons, pricing or access changes.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const folder='courses/305734-go-pro-max/promo';
const privateDir='.local-publication/go-pro-max-promo-20261120';
const plan=JSON.parse(await readFile(folder+'/publication.json','utf8'));
const fields={...JSON.parse(await readFile(folder+'/course-fields.json','utf8')),description:plan.description};
const keys=['summary','workload','acquired_skills','description','target_audience','requirements','learning_format','acquired_assets'];
assert.deepEqual(Object.keys(fields).sort(),keys.slice().sort());
assert.equal(plan.course,305734);
assert.ok(fields.summary.length<=300);
assert.ok(!/[—–]/.test(JSON.stringify(fields)));
const apply=process.argv.includes('--apply'),verifyOnly=process.argv.includes('--verify');
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const pick=(value,keys)=>Object.fromEntries(keys.map(key=>[key,value[key]]));
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const protectedKeys=['id','title','title_en','owner','cover','intro','intro_video','authors','instructors','sections','is_public','is_enabled','is_paid','price','price_tier','currency_code','tags','difficulty','language','is_certificate_issued','is_certificate_auto_issued','certificate','certificate_regular_threshold','certificate_distinction_threshold','certificate_cover_org','certificate_footer','is_self_paced','begin_date','end_date','enrollment_begin_date','enrollment_end_date','grading_policy','preview_lesson','preview_unit','parent_courses','child_courses','course_type','product_kind'];
async function api(path,method='GET',body){
  const response=await fetch('https://stepik.org/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(method+' '+path+': '+response.status+(response.status===400?' '+JSON.stringify(await response.json()):''));
  return response.json();
}
async function course(){return(await api('courses/305734')).courses[0];}
async function batch(type,ids,keys){
  const result=[];
  for(let start=0;start<ids.length;start+=48){
    const chunks=[];
    for(let i=start;i<Math.min(start+48,ids.length);i+=12)chunks.push(ids.slice(i,i+12));
    result.push(...(await Promise.all(chunks.map(async chunk=>(await api(type+'?'+chunk.map(id=>'ids[]='+id).join('&')))[type]))).flat());
  }
  assert.equal(result.length,ids.length);
  return result.map(value=>pick(value,keys)).sort((a,b)=>a.id-b.id);
}
async function curriculum(current){
  const sections=await batch('sections',current.sections,['id','title','position','units']);
  const units=await batch('units',sections.flatMap(s=>s.units),['id','lesson','section','position','is_active']);
  const lessons=await batch('lessons',[...new Set(units.map(u=>u.lesson))],['id','title','owner','steps','units','courses']);
  return{sections,units,lessons};
}
function verify(saved){
  for(const key of keys){
    if(['target_audience','requirements','learning_format'].includes(key))assert.equal(saved[key].replace(/\s+/g,''),fields[key].replace(/\s+/g,''),'Saved '+key);
    else if(key!=='description')assert.deepEqual(saved[key],fields[key],'Saved '+key);
  }
  assert.equal((saved.description.match(/<iframe\b/g)||[]).length,1,'Interactive description retained');
  assert.ok(saved.description.includes('/'+folder+'/project.html?v='+plan.version));
  assert.ok(saved.description.includes('height:360px'),'Compact frame height retained');
  assert.ok(!saved.description.includes('embed.html')&&!saved.description.includes('WEB HACKER'),'No full-page iframe or footer');
  const readable=value=>value.replace(/<[^>]*>/g,'').replace(/\s+/g,'');
  assert.equal(readable(saved.description),readable(fields.description),'Native text retained');
}
assert.equal((await api('stepics/1')).stepics[0].user,647088271);
const before=await course();assert.equal(before.owner,360771622);assert.ok(before.actions.edit_course);
assert.equal(before.sections.length,28);assert.equal(before.total_units,158);
let release;try{release=JSON.parse(await readFile(privateDir+'/release-2-before.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(verifyOnly||release){
  assert.ok(release);verify(before);assert.deepEqual(pick(before,protectedKeys),pick(release.course,protectedKeys));
  assert.deepEqual(await curriculum(before),release.curriculum);
  console.log('Description, all 8 fields, access, settings and 158 lessons verified.');process.exit(0);
}
const baseline=JSON.parse(await readFile(privateDir+'/verified.json','utf8')).fields;
for(const key of keys)assert.deepEqual(before[key],baseline[key],'Course edited since approval: '+key);
console.log(JSON.stringify({mode:apply?'apply':'read-only preflight',course:305734,fields:keys,modules:28,lessons:158}));
if(!apply)process.exit(0);
for(const file of ['project.html','project.css','project.js']){
  const response=await fetch('https://zak618.github.io/stepik-course-pages/'+folder+'/'+file+'?v='+plan.version,{signal:AbortSignal.timeout(30000)});
  assert.ok(response.ok&&hash(Buffer.from(await response.arrayBuffer()))===hash(await readFile(folder+'/'+file)),'Hosting not ready: '+file);
}
const outline=await curriculum(before);
const fresh=await course();assert.deepEqual(pick(fresh,[...keys,...protectedKeys,'update_date']),pick(before,[...keys,...protectedKeys,'update_date']),'Concurrent course edit');
await mkdir(privateDir,{recursive:true});
await writeFile(privateDir+'/release-2-before.json',JSON.stringify({course:before,curriculum:outline,fields,version:plan.version},null,2),{mode:0o600,flag:'wx'});
// Exactly one scoped mutation. Never retry an ambiguous write automatically.
await api('courses/305734','PUT',{course:{title:before.title,...fields}});
const after=await course();verify(after);
assert.deepEqual(pick(after,protectedKeys),pick(before,protectedKeys),'Protected course settings changed');
assert.deepEqual(await curriculum(after),outline,'Curriculum changed');
await writeFile(privateDir+'/verified.json',JSON.stringify({course:305734,version:plan.version,fields:pick(after,keys),settingsUnchanged:true,lessonsPreserved:158,modulesPreserved:28,url:'https://stepik.org/course/305734/promo'},null,2),{mode:0o600});
console.log('Saved and verified 8 description fields. 158 lessons and course settings unchanged.');

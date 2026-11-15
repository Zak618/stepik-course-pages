// Update editorial fields only. Never publish the course or edit lessons.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {target,version,files,fields,frameHeight}=await import('data:text/javascript;base64,'+Buffer.from(await readFile('assets/go-mini-course-info.js','utf8')).toString('base64'));
const apply=process.argv.includes('--apply'),verifyOnly=process.argv.includes('--verify');
const keys=['summary','workload','acquired_skills','description','target_audience','requirements','learning_format','acquired_assets'];
assert.deepEqual(Object.keys(fields),keys);assert.equal(target.course,305666);assert.equal(target.account,647088271);
const hash=s=>createHash('sha256').update(s).digest('hex');
const planHash=hash(JSON.stringify(fields)),token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const protectedKeys=['title','title_en','owner','cover','intro','intro_video','certificate','is_certificate_issued','is_certificate_auto_issued','certificate_regular_threshold','certificate_distinction_threshold','authors','instructors','tags','language','difficulty','sections','is_public','is_enabled','is_paid','price','currency_code','grading_policy','is_self_paced','begin_date','end_date','enrollment_begin_date','enrollment_end_date'];
const pick=(c,ks)=>Object.fromEntries(ks.map(k=>[k,c[k]]));
const readable=s=>s.replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[e.toLowerCase()]).replace(/\s+/g,'');
async function api(p,method='GET',body){const r=await fetch('https://stepik.org/api/'+p,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});if(!r.ok){const detail=r.status===400?JSON.stringify(await r.json()).slice(0,2000):'';throw Error(`${method} ${p}: HTTP ${r.status} ${detail}`);}return r.json();}
async function course(){return (await api('courses/'+target.course)).courses[0];}
async function curriculum(c){const sections=[],units=[],lessons=[],sources=[];for(const id of c.sections){const s=(await api('sections/'+id)).sections[0];sections.push({id:s.id,title:s.title,position:s.position,units:s.units});for(const uid of s.units){const u=(await api('units/'+uid)).units[0];units.push({id:u.id,lesson:u.lesson,section:u.section,position:u.position,is_active:u.is_active});const l=(await api('lessons/'+u.lesson)).lessons[0];lessons.push(pick(l,['id','title','owner','is_draft','steps','units','courses']));for(let p=1;p<=20;p++){const r=await api(`step-sources?lesson=${l.id}&page=${p}`);sources.push(...r['step-sources'].map(s=>pick(s,['id','lesson','position','block','cost','is_enabled','update_date'])));if(!r.meta.has_next)break;if(p===20)throw Error('Unexpected pagination');}}}return {sections,units,lessons,sources};}
assert.equal((await api('stepics/1')).stepics[0].user,target.account);
const before=await course();assert.equal(before.owner,target.account);assert.equal(before.title,target.title);
let journal;try{journal=JSON.parse(await readFile('.local-publication/course-info-upload.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(journal)assert.equal(journal.planHash,planHash,'Editorial source differs from publication journal');
function verify(c){
 for(const key of keys){if(['description','target_audience','requirements','learning_format'].includes(key))assert.equal(readable(c[key]),readable(fields[key]),'Content: '+key);else assert.deepEqual(c[key],fields[key],'Field: '+key);}
 const iframe=c.description.match(/<iframe\b[^>]*>/g)||[];assert.equal(iframe.length,1,'Stepik removed the embed');assert.ok(iframe[0].includes('https://zak618.github.io/stepik-course-pages/go-mini-course-promo.html'));assert.ok(iframe[0].includes(`height="${frameHeight}"`));
}
if(verifyOnly){assert.ok(journal);verify(before);assert.deepEqual(pick(before,protectedKeys),journal.protected);assert.equal(hash(JSON.stringify(await curriculum(before))),journal.curriculumHash,'Curriculum changed');console.log('All 8 editorial fields, iframe, protected settings and all lessons verified');process.exit(0);}
if(journal){verify(before);console.log('Already saved; use --verify for a full read-only check');process.exit(0);}
for(const key of keys.filter(k=>k!=='workload'))assert.ok(before[key]===''||Array.isArray(before[key])&&before[key].length===0,'Existing author content: '+key);
assert.ok(['3','3 часа в неделю'].includes(before.workload),'Unexpected workload');
const outline=await curriculum(before),protectedState=pick(before,protectedKeys);
console.log(JSON.stringify({mode:apply?'apply':'read-only preflight',course:target.course,title:before.title,fields:keys,lessonsPreserved:outline.lessons.length,stepsPreserved:outline.sources.length,isPublic:before.is_public,isEnabled:before.is_enabled},null,2));
if(!apply)process.exit(0);
for(const file of files){assert.ok(/^(go-mini-course-promo\.html|assets\/go-mini-course-promo\.(js|css))$/.test(file));const expected=hash(await readFile(file));const r=await fetch('https://zak618.github.io/stepik-course-pages/'+file+'?v='+version,{signal:AbortSignal.timeout(30000)});assert.ok(r.ok&&hash(Buffer.from(await r.arrayBuffer()))===expected,'Pages not ready: '+file);}
const fresh=await course();assert.deepEqual(pick(fresh,[...keys,...protectedKeys,'update_date']),pick(before,[...keys,...protectedKeys,'update_date']),'Concurrent course edit');
await mkdir('.local-publication',{recursive:true});const snapshot=`.local-publication/course-info-before-${Date.now()}.json`;await writeFile(snapshot,JSON.stringify({course:before,curriculum:outline},null,2));
// One explicit update; do not retry an ambiguous mutation.
// PUT requires the title too; carry its current value through unchanged.
await api('courses/'+target.course,'PUT',{course:{title:before.title,...fields}});
const after=await course();verify(after);assert.deepEqual(pick(after,protectedKeys),protectedState,'Protected settings changed');
journal={course:target.course,version,planHash,snapshot,protected:protectedState,curriculumHash:hash(JSON.stringify(outline))};await writeFile('.local-publication/course-info-upload.json',JSON.stringify(journal,null,2));
assert.equal(hash(JSON.stringify(await curriculum(after))),journal.curriculumHash,'Lessons changed');
await writeFile('.local-publication/course-info-verified.json',JSON.stringify({course:target.course,version,fields:pick(after,keys),protectedSettingsUnchanged:true,allLessonsUnchanged:true},null,2));
console.log(JSON.stringify({url:`https://stepik.org/course/${target.course}/promo`,fieldsSaved:keys.length,iframeRetained:true,courseStillPrivate:!after.is_public,lessonsUnchanged:true},null,2));

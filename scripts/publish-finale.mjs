// Append exactly two ungraded text steps. Never edit/delete existing content.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const apply=process.argv.includes('--apply');
const plan=JSON.parse(await readFile('.local-publication/finale.json','utf8'));
assert.equal(plan.account,647088271);assert.equal(plan.course,305666);
assert.deepEqual(plan.articles.map(a=>[a.lesson,a.unit,a.position,a.cost,a.block.name]),[[2706569,2746584,13,0,'text'],[2713291,2753290,1,0,'text']]);
const hash=s=>createHash('sha256').update(s).digest('hex');
const sourceHash=items=>hash(JSON.stringify(items.map(({id,lesson,position,cost,block,update_date,is_enabled})=>({id,lesson,position,cost,block,update_date,is_enabled}))));
const readable=s=>s.replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[e.toLowerCase()]).replace(/\s+/g,'');
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
async function api(p,method='GET',body){const r=await fetch('https://stepik.org/api/'+p,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${method} ${p}: HTTP ${r.status}`);return r.json();}
async function sources(id){const out=[];for(let p=1;p<=20;p++){const r=await api(`step-sources?lesson=${id}&page=${p}`);out.push(...r['step-sources']);if(!r.meta.has_next)return out.sort((a,b)=>a.position-b.position);}throw Error('Unexpected pagination');}
async function structure(){const c=(await api('courses/'+plan.course)).courses[0],sections=[],units=[];for(const id of c.sections){const s=(await api('sections/'+id)).sections[0];sections.push({id:s.id,title:s.title,position:s.position,units:s.units});for(const uid of s.units){const u=(await api('units/'+uid)).units[0];units.push({id:u.id,lesson:u.lesson,section:u.section,position:u.position,is_active:u.is_active});}}return {course:{id:c.id,owner:c.owner,title:c.title,is_public:c.is_public,is_enabled:c.is_enabled,sections:c.sections},sections,units};}
assert.equal((await api('stepics/1')).stepics[0].user,plan.account);
const outline=await structure();assert.equal(outline.course.owner,plan.account);
let journal={version:plan.version,uploaded:[]};try{journal=JSON.parse(await readFile('.local-publication/finale-upload.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}assert.equal(journal.version,plan.version);
// Preserve the user's current settings, not an older publication snapshot.
const baseline=journal.originalSources||(await sources(2706569)).filter(s=>s.position<=12);
assert.equal(baseline.length,12);assert.deepEqual(baseline.map(s=>s.id),[12427840,12427841,12427843,12427844,12427848,12427849,12427850,12427852,12427856,12427857,12427859,12427860]);
const originalPoints=baseline.reduce((n,s)=>n+s.cost,0);
const lessons={},initial={},untouched={};
function checkExisting(article,list){
 const originals=article.lesson===2706569?baseline:[];
 assert.equal(sourceHash(list.filter(s=>s.position<article.position)),sourceHash(originals),'Original content changed');
 assert.ok(list.length===originals.length||list.length===originals.length+1,'Unexpected step count');
 for(const s of list.filter(s=>s.position>=article.position)){
  const e=journal.uploaded.find(e=>e.id===s.id&&e.lesson===article.lesson&&e.position===article.position);
  assert.ok(e,'Foreign step; refusing overwrite');assert.equal(s.position,article.position);assert.equal(e.planHash,hash(JSON.stringify(article)));assert.equal(e.update_date,s.update_date,'Concurrent edit');
 }
}
for(const a of plan.articles){
 const l=(await api('lessons/'+a.lesson)).lessons[0];assert.equal(l.owner,plan.account);assert.equal(l.title,a.title);assert.ok(l.courses.includes(plan.course));assert.ok(l.units.includes(a.unit));assert.ok(outline.units.some(u=>u.id===a.unit&&u.lesson===a.lesson));lessons[a.lesson]=l;initial[a.lesson]=await sources(a.lesson);checkExisting(a,initial[a.lesson]);
 assert.equal((a.block.text.match(/<iframe/g)||[]).length,1);assert.ok(!/localhost:|AudioContext|applause/.test(a.block.text));
}
for(const id of [...new Set(outline.units.map(u=>u.lesson))].filter(id=>!plan.articles.some(a=>a.lesson===id)))untouched[id]=await sources(id);
console.log(JSON.stringify({mode:apply?'apply':'read-only preflight',account:plan.account,append:plan.articles.map(a=>({lesson:a.lesson,position:a.position,existing:initial[a.lesson].length})),pointsUnchanged:originalPoints,otherLessons:Object.keys(untouched).length},null,2));
if(!apply)process.exit(0);
for(const file of plan.files){
 assert.ok(/^(assets\/go-mini-finale\.(js|css)|courses\/305666-go-mini\/modules\/06-project\/(finale-preview|lesson-01-step-13|lesson-02-step-01)\.html)$/.test(file));
 const expected=hash(await readFile(file));let ready=false;
 for(let i=0;i<4;i++){const r=await fetch('https://zak618.github.io/stepik-course-pages/'+file+'?v='+plan.version,{signal:AbortSignal.timeout(30000)});if(r.ok&&hash(Buffer.from(await r.arrayBuffer()))===expected){ready=true;break;}await new Promise(r=>setTimeout(r,1000));}
 assert.ok(ready,'Pages not ready: '+file);
}
await mkdir('.local-publication',{recursive:true});await writeFile(`.local-publication/finale-before-${Date.now()}.json`,JSON.stringify({lessons,outline,initial,untouched},null,2));
journal.originalSources=baseline;await writeFile('.local-publication/finale-upload.json',JSON.stringify(journal,null,2));
const articles=[];
for(const a of plan.articles){
 const fresh=await sources(a.lesson);checkExisting(a,fresh);let s=fresh.find(s=>s.position===a.position);
 if(!s){const {file,title,unit,...article}=a;const r=await api('step-sources','POST',{stepSource:article});s=r['step-sources'][0];journal.uploaded.push({id:s.id,lesson:a.lesson,position:a.position,update_date:s.update_date,planHash:hash(JSON.stringify(a))});await writeFile('.local-publication/finale-upload.json',JSON.stringify(journal,null,2));}
 for(let i=0;i<50;i++){s=(await api('step-sources/'+s.id))['step-sources'][0];if(!['preparing',10].includes(s.status))break;await new Promise(r=>setTimeout(r,850));}
 journal.uploaded.find(e=>e.id===s.id).update_date=s.update_date;await writeFile('.local-publication/finale-upload.json',JSON.stringify(journal,null,2));
 assert.equal(s.lesson,a.lesson);assert.equal(s.position,a.position);assert.equal(s.cost,0);assert.equal(s.block.name,'text');assert.equal(s.is_enabled,true);assert.equal(s.needs_plan,null);assert.ok(['ready',1000].includes(s.status));assert.ok(!s.error?.text&&!s.error?.code);assert.equal(readable(s.block.text),readable(a.block.text));
 const height=t=>Number(t.match(/<iframe[^>]*height="(\d+)"/)[1]);assert.equal(height(s.block.text),height(a.block.text));
 articles.push({...a,id:s.id,block:s.block});console.log(`Ready: lesson ${a.lesson}, step ${a.position}, id ${s.id}`);
}
for(const a of plan.articles){const now=await sources(a.lesson);checkExisting(a,now);assert.equal(now.length,a.position===13?13:1);assert.equal(now.reduce((n,s)=>n+s.cost,0),a.position===13?originalPoints:0);const l=(await api('lessons/'+a.lesson)).lessons[0];for(const key of ['title','is_draft','units','owner','courses'])assert.deepEqual(l[key],lessons[a.lesson][key]);}
assert.deepEqual(await structure(),outline,'Course structure/visibility changed');
for(const[id,items]of Object.entries(untouched))assert.equal(sourceHash(await sources(id)),sourceHash(items),'Unrelated lesson changed: '+id);
await writeFile('.local-publication/finale-verified.json',JSON.stringify({version:plan.version,articles,originalProjectStepsUnchanged:true,otherLessonsUnchanged:true,courseStructureUnchanged:true},null,2));
console.log(JSON.stringify({urls:articles.map(a=>`https://stepik.org/lesson/${a.lesson}/step/${a.position}?unit=${a.unit}`),originalStepsUnchanged:true,points:originalPoints,otherLessonsUnchanged:true},null,2));

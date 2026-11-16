// Read-only inventory. Full source snapshots stay local and are never published.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const directory='.local-publication/intros-20261116';
await mkdir(directory,{recursive:true});
try{await access(directory+'/snapshot.json');console.log('Snapshot already exists; use the saved inventory instead of overwriting it.');process.exit(0);}catch{}
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
async function api(path){const r=await fetch('https://stepik.org/api/'+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(path.split('?')[0]+' HTTP '+r.status);return r.json();}
async function batch(type,ids){const result=[];for(let i=0;i<ids.length;i+=48){const chunks=[];for(let j=i;j<Math.min(i+48,ids.length);j+=12)chunks.push(ids.slice(j,j+12));result.push(...(await Promise.all(chunks.map(async ids=>(await api(type+'?'+ids.map(id=>'ids[]='+id).join('&')))[type]))).flat());}return result;}
assert.equal((await api('stepics/1')).stepics[0].user,647088271);
const sandbox={window:{}};vm.runInNewContext(await readFile('assets/go-mini-course-catalog.js','utf8'),sandbox);
const ids=sandbox.window.INTRO_CATALOG.courses.map(c=>c.id);
const courses=await batch('courses',[...ids,305734]);
for(const id of ids)assert.equal(courses.find(c=>c.id===id).is_public,true,'Public asset scope '+id);
const sections=await batch('sections',[...new Set(courses.flatMap(c=>c.sections))]);
const selectedUnits=[...new Set(courses.flatMap(c=>{const first=sections.find(s=>s.id===c.sections[0]),last=sections.find(s=>s.id===c.sections.at(-1));return [...first.units,...last.units.slice(-2)];}))];
const units=await batch('units',selectedUnits);
const lessons=await batch('lessons',[...new Set(units.map(u=>u.lesson))]);
const intros=courses.map(c=>{const section=sections.find(s=>s.id===c.sections[0]),unit=units.find(u=>u.id===section.units[0]),lesson=lessons.find(l=>l.id===unit.lesson);return{course:c.id,section:section.id,unit:unit.id,lesson:lesson.id};});
const sources=[];
for(let i=0;i<intros.length;i+=4){await Promise.all(intros.slice(i,i+4).map(async intro=>{for(let page=1;page<=20;page++){const d=await api('step-sources?lesson='+intro.lesson+'&page='+page);sources.push(...d['step-sources']);if(!d.meta.has_next)return;}throw Error('Unexpected pagination');}));console.log('Read introductions '+Math.min(i+4,intros.length)+' / '+intros.length);}
// Remove LTI keys and group IDs from editorial diagnostics.
const safeCourses=courses.map(c=>Object.fromEntries(Object.entries(c).filter(([key])=>!key.startsWith('lti_')&&!key.endsWith('_group'))));
await writeFile(directory+'/snapshot.json',JSON.stringify({at:new Date().toISOString(),account:647088271,courses:safeCourses,sections,units,lessons,intros,sources},null,2),{mode:0o600});
const text=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
console.log(JSON.stringify(intros.map(i=>{const c=courses.find(c=>c.id===i.course);return{id:c.id,title:c.title,canEdit:!!c.actions.edit_course,lesson:i.lesson,steps:sources.filter(s=>s.lesson===i.lesson).sort((a,b)=>a.position-b.position).map(s=>({id:s.id,pos:s.position,type:s.block.name,cost:s.cost,text:text(s.block.text).slice(0,130),images:(s.block.text.match(/<img\b/g)||[]).length}))};})));

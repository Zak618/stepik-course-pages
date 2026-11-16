// Existing ungraded text only. No new steps, reordering, course settings, or tasks.
import assert from 'node:assert/strict';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {version,base} from '../../shared/course-introductions/catalog.mjs';
if(version==='unified-intros-20261116-3'){await import('./publish-repairs.mjs');process.exit(0);}
const dir='.local-publication/unified-intros-preview-20261116';
const snapshot=JSON.parse(await readFile(dir+'/snapshot.json','utf8'));
const build=JSON.parse(await readFile(dir+'/build.json','utf8'));
const layout=JSON.parse(await readFile(dir+'/layout.json','utf8'));
assert.equal(build.version,version);assert.equal(layout.version,version);assert.deepEqual(layout.errors,[]);
const updates=layout.updates;assert.equal(new Set(updates.map(u=>u.course)).size,37);
assert.ok(!updates.some(u=>[305666,300562,305734].includes(u.course)));
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
async function api(p,method='GET',body){const r=await fetch('https://stepik.org/api/'+p,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(method+' '+p.split('?')[0]+' HTTP '+r.status);return r.json();}
const hash=s=>createHash('sha256').update(s).digest('hex');
const stable=s=>({id:s.id,lesson:s.lesson,position:s.position,cost:s.cost,is_enabled:s.is_enabled,needs_plan:s.needs_plan,block:s.block});
const settings=c=>Object.fromEntries(['id','title','owner','sections','is_public','is_enabled','is_paid','price','currency_code','is_certificate_issued','certificate_regular_threshold','certificate_distinction_threshold','child_courses'].map(k=>[k,c[k]]));
async function readSources(lesson){const list=[];for(let page=1;page<=20;page++){const d=await api('step-sources?lesson='+lesson+'&page='+page);list.push(...d['step-sources']);if(!d.meta.has_next)return list.sort((a,b)=>a.position-b.position);}throw Error('Pagination limit');}
async function each(items,fn){let i=0;await Promise.all(Array.from({length:4},async()=>{while(i<items.length)await fn(items[i++]);}));}
assert.equal((await api('stepics/1')).stepics[0].user,647088271);
const intros=snapshot.intros.filter(i=>updates.some(u=>u.course===i.course));
const rawOriginal=new Map(snapshot.sources.map(s=>[s.id,s]));
// A follow-up repair may replace the exact previously published text, never an
// arbitrary fresh edit. Archive the verified layout before rebuilding it.
let previous={updates:[]};try{previous=JSON.parse(await readFile(dir+'/previous-layout.json','utf8'));assert.notEqual(previous.version,version);}catch(e){if(e.code!=='ENOENT')throw e;}
const original=new Map(snapshot.sources.map(s=>{const u=previous.updates.find(u=>u.id===s.id);return[s.id,u?{...s,block:{...s.block,text:u.text}}:s];}));
const journalFile=dir+'/publication-journal-'+version+'.json';
let journal={version,done:[]};try{journal=JSON.parse(await readFile(journalFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
assert.equal(journal.version,version);
let pending=Promise.resolve();const persist=()=>{pending=pending.then(async()=>{await writeFile(journalFile+'.tmp',JSON.stringify(journal,null,2),{mode:0o600});await rename(journalFile+'.tmp',journalFile);});return pending;};
function checkList(intro,current){
  const baseline=snapshot.sources.filter(s=>s.lesson===intro.lesson).sort((a,b)=>a.position-b.position);
  assert.deepEqual(current.map(s=>s.id),baseline.map(s=>s.id),'Step order changed '+intro.course);
  for(const s of current){const old=original.get(s.id),u=updates.find(u=>u.id===s.id);let expected=stable(old);if(u&&s.block.text===u.text)expected={...expected,block:{...old.block,text:u.text}};assert.deepEqual(stable(s),expected,'Concurrent edit '+s.id);}
}
async function verifyCourses(){for(let i=0;i<intros.length;i+=12){const d=await api('courses?'+intros.slice(i,i+12).map(c=>'ids[]='+c.course).join('&'));for(const c of d.courses){assert.deepEqual(settings(c),settings(snapshot.courses.find(x=>x.id===c.id)),'Course settings changed '+c.id);}}}
await verifyCourses();
await each(intros,async intro=>{const lesson=(await api('lessons/'+intro.lesson)).lessons[0];assert.equal(lesson.owner,snapshot.lessons.find(l=>l.id===intro.lesson).owner);assert.ok(lesson.actions.edit_lesson,'No lesson edit permission');assert.ok(!lesson.courses.some(id=>[300562,305734].includes(id)));checkList(intro,await readSources(intro.lesson));});
console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':process.argv.includes('--verify')?'verify':'preflight',courses:intros.length,updates:updates.length,tasksUnchanged:build.protectedTasks,newSteps:0}));
if(!process.argv.includes('--apply')&&!process.argv.includes('--verify'))process.exit(0);
if(process.argv.includes('--apply')){
  // Verify the actual uploaded pages and shared learner assets before changing Stepik.
  const uploaded=[...build.generated.filter(f=>f.endsWith('.html')),'shared/course-introductions/base.css','shared/course-introductions/embedded.css','shared/course-introductions/embedded.js','shared/course-introductions/interactions.js','shared/course-introductions/study.css'];
  await each(uploaded,async file=>{const r=await fetch(base+file+'?v='+version,{signal:AbortSignal.timeout(30000)});assert.ok(r.ok&&hash(Buffer.from(await r.arrayBuffer()))===hash(await readFile(file)),'Pages not ready '+file);});
  const results=await Promise.allSettled(intros.map((intro,index)=>({intro,index})).reduce((groups,item)=>{groups[item.index%4].push(item.intro);return groups;},[[],[],[],[]]).map(async group=>{
    for(const intro of group){for(const u of updates.filter(u=>u.course===intro.course)){
      const old=original.get(u.id);assert.equal(old.block.name,'text');assert.equal(old.cost,0);assert.equal(hash(JSON.stringify(rawOriginal.get(u.id).block)),u.beforeHash);
      const fresh=(await api('step-sources/'+u.id))['step-sources'][0];
      if(fresh.block.text!==u.text){assert.deepEqual(stable(fresh),stable(old),'Concurrent edit '+u.id);await api('step-sources/'+u.id,'PUT',{stepSource:{lesson:old.lesson,position:old.position,cost:old.cost,block:{...old.block,text:u.text}}});}
      const saved=(await api('step-sources/'+u.id))['step-sources'][0];assert.equal(saved.block.text,u.text,'Sanitized text differs '+u.id);assert.equal(saved.status,'ready');assert.ok(!saved.error?.text&&!saved.error?.code);assert.deepEqual(stable(saved),{...stable(old),block:{...old.block,text:u.text}});
      if(!journal.done.includes(u.id)){journal.done.push(u.id);await persist();}
    }console.log('Ready '+intro.course+' ('+journal.done.length+'/'+updates.length+')');}
  }));
  const failed=results.filter(r=>r.status==='rejected');if(failed.length)throw failed[0].reason;
}
await verifyCourses();
await each(intros,async intro=>{const now=await readSources(intro.lesson);checkList(intro,now);for(const u of updates.filter(u=>u.course===intro.course)){const source=now.find(s=>s.id===u.id);assert.equal(source.block.text,u.text);const learner=(await api('steps/'+u.id)).steps[0];assert.equal(learner.block.text,u.text);}});
await writeFile(dir+'/published.json',JSON.stringify({version,courses:intros.map(i=>i.course),updates:updates.length,allTasksUnchanged:true,structureUnchanged:true,courseSettingsUnchanged:true,excluded:[305666,300562,305734],learnerTextVerified:true},null,2),{mode:0o600});
console.log(JSON.stringify({complete:true,courses:intros.length,updates:updates.length,tasksUnchanged:true,courseSettingsUnchanged:true}));

// Direct mini URLs and separate, zero-point rules steps. Never submit answers.
import assert from 'node:assert/strict';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {base,version} from '../../shared/course-introductions/catalog.mjs';
import {repairMiniStep} from './mini-repairs.mjs';
const dir='.local-publication/intros-deep-audit-20261116';
const baseline=JSON.parse(await readFile(dir+'/snapshot.json','utf8'));
const layout=JSON.parse(await readFile('.local-publication/unified-intros-preview-20261116/layout.json','utf8'));
const build=JSON.parse(await readFile('.local-publication/unified-intros-preview-20261116/build.json','utf8'));
assert.equal(layout.version,version);assert.deepEqual(layout.errors,[]);
const browserAudit=JSON.parse(await readFile(dir+'/browser-audit.json','utf8'));
assert.equal(browserAudit.version,version);assert.deepEqual(browserAudit.problems,[]);assert.deepEqual(browserAudit.errors,[]);
const mapping=JSON.parse(await readFile('courses/305666-go-mini/legacy-paths.json','utf8'));
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
async function api(p,method='GET',body){const r=await fetch('https://stepik.org/api/'+p,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(method+' '+p.split('?')[0]+' HTTP '+r.status);return r.json();}
async function sources(id){const out=[];for(let p=1;p<=20;p++){const d=await api('step-sources?lesson='+id+'&page='+p);out.push(...d['step-sources']);if(!d.meta.has_next)return out.sort((a,b)=>a.position-b.position);}throw Error('Pagination');}
const stable=s=>({id:s.id,lesson:s.lesson,position:s.position,cost:s.cost,is_enabled:s.is_enabled,needs_plan:s.needs_plan,block:s.block});
const updates=new Map(baseline.sources.map(s=>{const u=layout.updates.find(u=>u.id===s.id);return[s.id,repairMiniStep(s.id,u?.text??s.block.text,mapping)];}));
const additions=baseline.intros.filter(i=>i.course!==305666).flatMap(i=>{const community=baseline.sources.find(s=>s.lesson===i.lesson&&(s.block.text.match(/<iframe/g)||[]).length===2&&s.block.text.includes('/02-telegram.html')&&s.block.text.includes('/05-rules.html'));if(!community)return[];const course=build.courses.find(c=>c.id===i.course);assert.ok(course);return[{course:i.course,lesson:i.lesson,after:community.id,text:`<div style="font-size:0;margin:0;"><iframe height="${layout.heights[i.course+':rules']}" src="${base}${course.pages.rules}?embed=1&amp;v=${version}" style="border:0;width:100%;margin:0;background:#fff;" width="100%"></iframe></div>`}];});
assert.equal(additions.length,29);
let journal={version,added:[],done:[]};try{journal=JSON.parse(await readFile(dir+'/journal.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}assert.equal(journal.version,version);
let saving=Promise.resolve();const persist=()=>{const text=JSON.stringify(journal,null,2);saving=saving.then(async()=>{await writeFile(dir+'/journal.tmp',text,{mode:0o600});await rename(dir+'/journal.tmp',dir+'/journal.json');});return saving;};
async function each(items,fn){let index=0;const results=await Promise.allSettled(Array.from({length:4},async()=>{while(index<items.length)await fn(items[index++]);}));const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;}
const oldFor=lesson=>baseline.sources.filter(s=>s.lesson===lesson).sort((a,b)=>a.position-b.position);
function inspect(lesson,current,complete=false){
  const old=oldFor(lesson),addition=additions.find(a=>a.lesson===lesson),extra=current.filter(s=>!old.some(o=>o.id===s.id));
  assert.ok(extra.length<=(addition?1:0),'Unexpected new steps '+lesson);
  if(extra.length){assert.equal(extra[0].block.name,'text');assert.equal(extra[0].cost,0);assert.equal(extra[0].block.text,addition.text);}
  // The original sequence is preserved even while the appended new step is moved.
  assert.deepEqual(current.filter(s=>old.some(o=>o.id===s.id)).map(s=>s.id),old.map(s=>s.id));
  const inserted=extra[0]&&extra[0].position===old.find(s=>s.id===addition.after).position+1;
  const owned=extra[0]&&journal.added.some(a=>a.id===extra[0].id&&a.lesson===lesson);
  for(const s of old){const now=current.find(x=>x.id===s.id);assert.ok(now);const tail=addition&&s.position>old.find(x=>x.id===addition.after).position;
    const desired=s.position+(inserted&&tail?1:0);
    if(complete)assert.equal(now.position,desired);else assert.ok(now.position===s.position||(owned&&tail&&now.position===s.position+1),'Foreign reorder '+s.id);
    const want={...stable(s),position:now.position};
    assert.ok(now.block.text===s.block.text||now.block.text===updates.get(s.id),'Concurrent text edit '+s.id);
    if(complete)assert.equal(now.block.text,updates.get(s.id));
    assert.deepEqual(stable(now),{...want,block:{...s.block,text:now.block.text}},'Protected source changed '+s.id);
  }
  assert.equal(current.reduce((n,s)=>n+s.cost,0),old.reduce((n,s)=>n+s.cost,0));
  if(complete&&addition){assert.equal(extra.length,1);assert.ok(inserted,'Rules not after Telegram');}
  return extra[0];
}
assert.equal((await api('stepics/1')).stepics[0].user,647088271);
const apply=process.argv.includes('--apply'),only=Number(process.argv.find(a=>a.startsWith('--course='))?.split('=')[1]||0);
const targetLessons=baseline.lessons.filter(l=>!only||baseline.intros.some(i=>i.course===only&&i.lesson===l.id));
await each(targetLessons,async l=>{assert.ok(!l.courses.some(id=>[300562,305734].includes(id)));const fresh=(await api('lessons/'+l.id)).lessons[0];assert.equal(fresh.owner,l.owner);assert.ok(fresh.actions.edit_lesson);inspect(l.id,await sources(l.id));});
console.log(JSON.stringify({mode:apply?'apply':'preflight',lessons:targetLessons.length,changedSources:baseline.sources.filter(s=>updates.get(s.id)!==s.block.text).length,newRules:additions.length,pointsPreserved:true}));
if(!apply&&!process.argv.includes('--verify'))process.exit(0);
if(apply){
  let cursor=0;const files=[...build.generated.filter(f=>f.endsWith('.html')),...new Set(baseline.oldFrames.map(f=>f.next)),'shared/course-introductions/embedded.css'];
  await Promise.all(Array.from({length:6},async()=>{while(cursor<files.length){const f=files[cursor++],r=await fetch(base+f+'?v='+version,{signal:AbortSignal.timeout(30000)});assert.ok(r.ok&&hash(Buffer.from(await r.arrayBuffer()))===hash(await readFile(f)),'Hosting not ready '+f);}}));
  // FullStack first: confirm Stepik's insertion behavior before processing others.
  targetLessons.sort((a,b)=>(b.id===1086996)-(a.id===1086996));
  const publishLesson=async l=>{
    let current=await sources(l.id);let added=inspect(l.id,current);const addition=additions.find(a=>a.lesson===l.id);
    if(addition){
      if(!added){
        const body={stepSource:{lesson:l.id,position:current.length+1,cost:0,block:{name:'text',source:{},text:addition.text}}};
        try{added=(await api('step-sources','POST',body))['step-sources'][0];}catch(error){const matches=(await sources(l.id)).filter(s=>!oldFor(l.id).some(o=>o.id===s.id)&&s.block.text===addition.text);if(matches.length!==1)throw error;added=matches[0];}
      }
      if(!journal.added.some(x=>x.id===added.id)){journal.added.push({course:addition.course,lesson:l.id,id:added.id,after:addition.after});await persist();}
      const after=current.find(s=>s.id===addition.after),position=after.position+1;
      if(added.position!==position)await api('step-sources/'+added.id,'PUT',{stepSource:{lesson:l.id,position,cost:0,block:added.block}});
      current=await sources(l.id);inspect(l.id,current);assert.equal(current.find(s=>s.id===added.id).position,position);
      // Stepik accepts duplicate numeric positions; it does not shift the tail.
      // Move existing steps backwards, keeping every original ID and block.
      for(const old of oldFor(l.id).filter(s=>s.position>=position).reverse()){
        const fresh=(await api('step-sources/'+old.id))['step-sources'][0];
        assert.ok(fresh.position===old.position||fresh.position===old.position+1);
        assert.ok(fresh.block.text===old.block.text||fresh.block.text===updates.get(old.id));
        assert.deepEqual({...fresh.block,text:old.block.text},old.block);
        if(fresh.position===old.position)await api('step-sources/'+old.id,'PUT',{stepSource:{lesson:l.id,position:old.position+1,cost:old.cost,block:fresh.block}});
      }
      current=await sources(l.id);inspect(l.id,current);
    }
    for(const old of oldFor(l.id).filter(s=>updates.get(s.id)!==s.block.text)){
      const text=updates.get(old.id);let fresh=(await api('step-sources/'+old.id))['step-sources'][0];
      assert.ok(fresh.block.text===old.block.text||fresh.block.text===text);assert.deepEqual({...fresh.block,text:old.block.text},old.block);
      if(fresh.block.text!==text)await api('step-sources/'+old.id,'PUT',{stepSource:{lesson:l.id,position:fresh.position,cost:old.cost,block:{...old.block,text}}});
    }
    inspect(l.id,await sources(l.id),true);if(!journal.done.includes(l.id)){journal.done.push(l.id);await persist();}console.log('Ready lesson '+l.id+' ('+journal.done.length+'/'+baseline.lessons.length+')');
  };
  const fullstack=targetLessons.find(l=>l.id===1086996);if(fullstack)await publishLesson(fullstack);
  await each(targetLessons.filter(l=>l.id!==1086996),publishLesson);
}
await each(targetLessons,async l=>{const current=await sources(l.id);inspect(l.id,current,true);for(const s of current){assert.equal(s.status,'ready');if(!oldFor(l.id).some(o=>o.id===s.id)||updates.get(s.id)!==oldFor(l.id).find(o=>o.id===s.id).block.text){const learner=(await api('steps/'+s.id)).steps[0];assert.equal(learner.block.text,s.block.text);}}});
if(!only){await writeFile(dir+'/verified.json',JSON.stringify({version,lessons:targetLessons.length,sources:baseline.sources.length,added:journal.added,pointsPreserved:true,existingTaskDefinitionsPreserved:true,noLegacyMiniFrames:true,telegramAndRulesSeparated:true},null,2),{mode:0o600});await writeFile('courses/introduction-rules-steps.json',JSON.stringify({version,steps:journal.added},null,2)+'\n');}
console.log(JSON.stringify({complete:true,lessons:targetLessons.length,only:only||null,added:journal.added.length}));

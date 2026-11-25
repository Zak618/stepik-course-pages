// Scoped release: finale recommendations and one AI-help block in the description.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {aiHelp} from '../../courses/305734-go-pro-max/promo/content.mjs';
const apply=process.argv.includes('--apply'),verify=process.argv.includes('--verify');
assert.ok(!(apply&&verify));
const dir='.local-publication/go-pro-max-finale-draft',folder='courses/305734-go-pro-max/modules/29-finale';
const token=JSON.parse(await readFile('.stepik-accounts/647088271/session.json','utf8')).access_token;
async function api(path,method='GET',body){
  if(method!=='GET')assert.ok(apply&&method==='PUT'&&['courses/305734','step-sources/12593826'].includes(path));
  const response=await fetch('https://stepik.org/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  assert.ok(response.ok,method+' '+path+': HTTP '+response.status);return response.json();
}
const course=async()=>(await api('courses/305734')).courses[0];
const sources=async()=>(await api('step-sources?lesson=2744253'))['step-sources'].sort((a,b)=>a.position-b.position);
const readable=s=>s.replace(/<[^>]*>/g,'').replace(/\s+/g,'');
const links=s=>[...s.matchAll(/\bsrc="([^"]+)"/g)].map(x=>x[1]);
const settings=['id','title','owner','sections','total_units','is_public','is_enabled','is_paid','price','currency_code','summary','requirements','target_audience','acquired_skills','learning_format','acquired_assets','workload','cover','certificate_regular_threshold','certificate_distinction_threshold'];
assert.equal((await api('stepics/1')).stepics[0].user,647088271);
let current=await course();assert.equal(current.owner,360771622);assert.ok(current.actions.edit_course);assert.equal(current.sections.length,29);assert.equal(current.total_units,159);
let old=await sources();assert.deepEqual(old.map(s=>[s.id,s.position,s.cost,s.block.name]),[[12593823,1,0,'text'],[12593824,2,0,'free-answer'],[12593825,3,0,'text'],[12593826,4,0,'text']]);
let release;
if(verify)release=JSON.parse(await readFile(dir+'/external-cards-before.json','utf8'));
else{
  const plan=JSON.parse(await readFile(dir+'/stepik-drafts.json','utf8'));
  const frame=plan.steps[3].block.text.match(/<div style="font-size:0;margin:0 0 16px;">[\s\S]*?<\/div>/)?.[0];assert.ok(frame?.includes('embeds/courses.html'));
  const text=old[3].block.text,start=text.indexOf('<div class="gpmx-finale-course-card"'),end=text.indexOf('<p class="gpmx-finale-all-courses"');assert.ok(start>0&&end>start);
  const description=current.description;assert.ok(!description.includes('ИИ-помощник'));const marker='<p style="color:#65748d;">';assert.equal(description.split(marker).length,2);
  release={course:current,sources:old,stepText:text.slice(0,start)+frame+text.slice(end),description:description.replace(marker,aiHelp+marker),at:new Date().toISOString()};
  console.log(JSON.stringify({mode:apply?'apply':'preflight',course:305734,source:12593826,descriptionBlock:true,otherSteps:3}));
  if(!apply)process.exit(0);
  const run=promisify(execFile);
  for(const file of ['courses.html','courses.css']){
    const {stdout}=await run('curl',['--fail','--silent','--show-error','--max-time','30','https://zak618.github.io/stepik-course-pages/'+folder+'/embeds/'+file+'?v=20261125-author-links'],{encoding:'buffer'});
    assert.ok(stdout.equals(await readFile(folder+'/embeds/'+file)),'Hosting not ready: '+file);
  }
  const fresh=await course(),freshSources=await sources();assert.equal(fresh.description,current.description);assert.deepEqual(freshSources.map(s=>s.block),old.map(s=>s.block));
  await writeFile(dir+'/external-cards-before.json',JSON.stringify(release,null,2),{mode:0o600,flag:'wx'});
  const s=old[3];await api('step-sources/12593826','PUT',{stepSource:{lesson:s.lesson,position:s.position,cost:s.cost,block:{...s.block,text:release.stepText}}});
  // Stepik PUT clears these arrays when omitted, even on an editorial update.
  await api('courses/305734','PUT',{course:{title:fresh.title,description:release.description,acquired_skills:fresh.acquired_skills,acquired_assets:fresh.acquired_assets}});
}
current=await course();old=await sources();
for(const key of settings)assert.deepEqual(current[key],release.course[key],'Changed course field '+key);
for(let i=0;i<3;i++)assert.deepEqual(old[i].block,release.sources[i].block);
assert.equal(old[3].cost,0);assert.equal(old[3].block.name,'text');assert.deepEqual(old[3].block.source,release.sources[3].block.source);
assert.equal(readable(old[3].block.text),readable(release.stepText));assert.deepEqual(links(old[3].block.text),links(release.stepText));
const height=release.stepText.match(/height:(calc\([^;]+);/)?.[1];assert.ok(height);assert.ok(old[3].block.text.includes(height),'Responsive height removed');
assert.equal((old[3].block.text.match(/<iframe\b/g)||[]).length,1);assert.ok(!old[3].block.text.includes('class="gpmx-finale-course-card"'));
assert.equal(readable(current.description),readable(release.description));assert.deepEqual(links(current.description),links(release.course.description));assert.equal(current.description.split('ИИ-помощник в комментариях').length,2);
const rendered=(await api('steps/12593826')).steps[0];assert.equal(rendered.block.text,old[3].block.text);
await writeFile(dir+'/saved-step-4.json',JSON.stringify(old[3],null,2),{mode:0o600});
const plan=JSON.parse(await readFile(dir+'/stepik-drafts.json','utf8')),journal=JSON.parse(await readFile(dir+'/upload.json','utf8'));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex'),{title,...payload}=plan.steps[3];
journal.externalCardsRepair={previousPlanHash:journal.planHash,at:new Date().toISOString()};journal.planHash=hash(plan);journal.operations['step-4'].hash=hash({lesson:2744253,...payload});
await writeFile(dir+'/upload.json',JSON.stringify(journal,null,2),{mode:0o600});
const proof={course:305734,externalCards:true,descriptionAiHelp:true,settingsUnchanged:true,otherStepsUnchanged:true,verifiedAt:new Date().toISOString()};await writeFile(dir+'/external-cards-verified.json',JSON.stringify(proof,null,2),{mode:0o600});console.log(JSON.stringify(proof));

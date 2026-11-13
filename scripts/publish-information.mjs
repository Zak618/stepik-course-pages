/* Explicit Stepik upload, restricted to the inspected course and lesson. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
if(!process.argv.includes('--apply'))throw new Error('External writes require --apply. Run export-information.mjs first.');
const plan=JSON.parse(await readFile('.local-publication/information.json','utf8'));
assert.equal(plan.course,305666);assert.equal(plan.lesson,2706555);assert.equal(plan.unit,2746570);assert.equal(plan.articles.length,10);
const token=JSON.parse(await readFile('.env.stepik-session','utf8')).access_token;
async function api(path,method='GET',body){
  const response=await fetch('https://stepik.org/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const raw=await response.text();if(!response.ok)throw new Error(`${method} ${path}: HTTP ${response.status}: ${raw.slice(0,1500)}`);
  try{return JSON.parse(raw);}catch{throw new Error(`Non-JSON response for ${path}`);}
}
const identity=(await api('stepics/1')).stepics[0].user;assert.equal(identity,647088271,'Wrong Stepik account');
const course=(await api('courses/305666')).courses[0];assert.equal(course.owner,identity);
const lesson=(await api('lessons/2706555')).lessons[0];assert.equal(lesson.owner,identity);assert.ok(lesson.courses.includes(305666));assert.ok(lesson.units.includes(2746570));
// GitHub Pages must be ready before the lesson acquires any embeds.
const base='https://zak618.github.io/stepik-course-pages/';
for(const file of [...Array.from({length:10},(_,i)=>`go-mini-module-02-lesson-01-step-${String(i+1).padStart(2,'0')}.html`),'assets/go-mini-information-story.js','assets/go-mini-information.js','assets/go-mini-information.css']){
  const response=await fetch(base+file+'?v='+plan.version);assert.equal(response.status,200,`Page not live: ${file}`);
  const text=await response.text();if(file.includes('story')){assert.ok(text.includes('Go-шечка Find'));assert.ok(!text.includes('GoSearch'));}
}
async function getSources(){const all=[];for(let page=1;page<=20;page++){const data=await api(`step-sources?lesson=2706555&page=${page}`);all.push(...data['step-sources']);if(!data.meta?.has_next)return all;}throw new Error('Unexpected pagination');}
const existing=await getSources();
for(const source of existing){assert.ok(source.position>=1&&source.position<=10);assert.ok(source.block.text.includes(base+`go-mini-module-02-lesson-01-step-${String(source.position).padStart(2,'0')}.html`),'Unrelated step exists; refusing to replace it');}
assert.equal(new Set(existing.map(source=>source.position)).size,existing.length,'Duplicate positions');
await mkdir('.local-publication',{recursive:true});
await writeFile(`.local-publication/stepik-before-${Date.now()}.json`,JSON.stringify({lesson,sources:existing},null,2));
const uploaded=[];
for(const article of plan.articles){
  const old=existing.find(source=>source.position===article.position);
  if(old)assert.ok(old.block.name===article.block.name||(article.position===5&&old.block.name==='string'&&old.needs_plan==='basic_paid'&&article.block.name==='choice'),'Refusing to change an unrelated step type');
  const result=await api(old?`step-sources/${old.id}`:'step-sources',old?'PUT':'POST',{stepSource:{lesson:2706555,position:article.position,block:article.block}});
  const source=result['step-sources'][0];assert.equal(source.lesson,2706555);assert.equal(source.position,article.position);assert.equal(source.block.name,article.block.name);
  if(source.status===1010||source.status==='error'||source.error?.text||source.error?.code)throw new Error(`Step ${source.id} failed validation: ${JSON.stringify(source.error||source.reason_of_failure)}`);
  assert.equal(source.is_enabled,true,`Step ${source.id} requires a paid plan`);
  const beforeFrames=(article.block.text.match(/<iframe/g)||[]).length;
  assert.equal((source.block.text.match(/<iframe/g)||[]).length,beforeFrames,'Stepik stripped an experiment');
  assert.ok(source.block.text.length>article.block.text.length*.7,'Stepik stripped too much content');
  uploaded.push({position:source.position,id:source.id,type:source.block.name});
  await writeFile('.local-publication/stepik-upload.json',JSON.stringify({lesson:2706555,unit:2746570,uploaded},null,2));
  console.log(`Step ${source.position}: ${source.id} (${source.block.name})`);
}
const verify=await getSources();assert.equal(verify.length,10);
for(const source of verify){const expected=plan.articles.find(article=>article.position===source.position);assert.equal(source.block.name,expected.block.name);assert.ok(!source.block.text.includes('GoSearch'));}
const finalLesson=(await api('lessons/2706555')).lessons[0];assert.equal(finalLesson.steps.length,10);assert.equal(finalLesson.is_draft,lesson.is_draft,'Course draft state must remain unchanged');
const afterCourse=(await api('courses/305666')).courses[0];assert.equal(afterCourse.is_public,course.is_public);assert.equal(afterCourse.is_enabled,course.is_enabled);
console.log(JSON.stringify({url:'https://stepik.org/lesson/2706555/step/1?unit=2746570',steps:uploaded,courseVisibilityUnchanged:true},null,2));

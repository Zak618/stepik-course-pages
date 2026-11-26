// Read-only inventory of the introduction and final lessons. No course writes.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createApi} from './stepik.mjs';
const directory='.local-publication/go-max-course-promotions-20261126';
const api=await createApi();
const sandbox={window:{}};vm.runInNewContext(await readFile('assets/go-mini-course-catalog.js','utf8'),sandbox);
const ids=Array.from(sandbox.window.INTRO_CATALOG.courses,course=>course.id).filter(id=>id!==305734);
assert.equal(ids.length,39);
async function many(resource,ids){
  const records=[];
  for(let i=0;i<ids.length;i+=20){const data=await api(resource+'?'+ids.slice(i,i+20).map(id=>'ids[]='+id).join('&'));records.push(...data[resource]);}
  assert.equal(records.length,new Set(ids).size,resource+' incomplete');
  return records;
}
const courses=await many('courses',ids);
assert.ok(courses.every(course=>course.actions.edit_course&&course.actions.edit_syllabus));
const sectionIds=[...new Set(courses.flatMap(course=>[course.sections[0],course.sections.at(-1)]))];
const sections=await many('sections',sectionIds);
assert.ok(sections.every(section=>section.units.length>0),'Empty first or last section');
const units=await many('units',[...new Set(sections.flatMap(section=>section.units))]);
const boundaries=courses.map(course=>{
  const inSection=id=>units.filter(unit=>unit.section===id).sort((a,b)=>a.position-b.position);
  return {course:course.id,title:course.title,intro:inSection(course.sections[0])[0],final:inSection(course.sections.at(-1)).at(-1)};
});
const lessons=await many('lessons',[...new Set(boundaries.flatMap(entry=>[entry.intro.lesson,entry.final.lesson]))]);
const sources=[];
let cursor=0;
await Promise.all(Array.from({length:3},async()=>{while(cursor<lessons.length){const lesson=lessons[cursor++];for(let page=1;page<=30;page++){const data=await api('step-sources?lesson='+lesson.id+'&page='+page);sources.push(...data['step-sources']);if(!data.meta.has_next)break;assert.ok(page<30,'Pagination limit');}}}));
for(const lesson of lessons){assert.ok(lesson.actions.edit_lesson,'No edit access to '+lesson.id);assert.deepEqual(sources.filter(s=>s.lesson===lesson.id).sort((a,b)=>a.position-b.position).map(s=>s.id),lesson.steps,'Incomplete steps '+lesson.id);}
await mkdir(directory,{recursive:true,mode:0o700});
await writeFile(directory+'/snapshot.json',JSON.stringify({account:647088271,createdAt:new Date().toISOString(),courses,sections,units,lessons,sources,boundaries},null,2),{mode:0o600,flag:'wx'});
const summary=boundaries.map(entry=>{
  const intro=lessons.find(l=>l.id===entry.intro.lesson),final=lessons.find(l=>l.id===entry.final.lesson);
  return {course:entry.course,title:entry.title,intro:{id:intro.id,title:intro.title,steps:intro.steps.length,courses:intro.courses},final:{id:final.id,title:final.title,steps:final.steps.length,courses:final.courses}};
});
await writeFile(directory+'/boundaries.json',JSON.stringify(summary,null,2),{mode:0o600});
console.log(JSON.stringify({courses:courses.length,lessons:lessons.length,sources:sources.length,stepikWrites:0}));
console.log(JSON.stringify(summary));

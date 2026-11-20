// Only six existing sources. Their native answer definitions remain untouched.
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {course, lesson, unit, version, folder, base, privateDir, frameText} from './config.mjs';
const apply = process.argv.includes('--apply');
const verify = process.argv.includes('--verify');
const plan = JSON.parse(await readFile(folder + '/publication.json','utf8'));
assert.equal(plan.version,version);
assert.equal(plan.pages.length,6);
const token = JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
async function api(path, method = 'GET', body) {
  const response = await fetch('https://stepik.org/api/' + path, {
    method, headers:{Authorization:'Bearer ' + token,'Content-Type':'application/json'},
    body:body ? JSON.stringify(body) : undefined,signal:AbortSignal.timeout(30000),
  });
  assert.ok(response.ok,method + ' ' + path + ': ' + response.status);
  return response.json();
}
const stable = source => Object.fromEntries(['id','lesson','position','cost','is_enabled','needs_plan','block'].map(key=>[key,source[key]]));
const settings = value => Object.fromEntries(['id','owner','title','sections','is_public','is_enabled','is_paid','price','currency_code','certificate','certificate_regular_threshold','certificate_distinction_threshold'].map(key=>[key,value[key]]));
const sources = async () => {
  const result = await api('step-sources?lesson=' + lesson);
  assert.ok(!result.meta.has_next);
  return result['step-sources'].sort((a,b)=>a.position-b.position);
};
assert.equal((await api('stepics/1')).stepics[0].user,647088271);
const currentCourse = (await api('courses/' + course)).courses[0];
assert.equal(currentCourse.owner,647088271);
const currentLesson = (await api('lessons/' + lesson)).lessons[0];
assert.ok(currentLesson.actions.edit_lesson);
assert.ok(currentLesson.courses.includes(course));
const baseline = JSON.parse(await readFile('.local-publication/go-pro-max-intro-20261120/snapshot.json','utf8'));
let release;
try {release = JSON.parse(await readFile(privateDir + '/before.json','utf8'));}
catch(error) {if(error.code !== 'ENOENT') throw error;}
const existing = await sources();
assert.deepEqual(existing.map(source=>source.id),plan.pages.map(page=>page.source));
for (const page of plan.pages) {
  const old = baseline.sources.find(source=>source.id===page.source);
  const current = existing.find(source=>source.id===page.source);
  assert.equal(current.block.name,page.type);
  assert.equal(current.cost,old.cost);
  assert.ok(current.block.text === old.block.text || current.block.text === frameText(page),'Concurrent text edit: ' + page.source);
  assert.deepEqual(stable(current),{...stable(old),block:{...old.block,text:current.block.text}},'Protected answer settings changed: ' + page.source);
}
if (release) {
  assert.equal(release.version,version);
  assert.deepEqual(settings(currentCourse),release.course);
  assert.deepEqual(currentLesson.steps,release.steps);
}
if (!apply && !verify) {
  console.log(JSON.stringify({mode:'preflight',course,lesson,sources:6,nativeAnswersPreserved:2,stepikWrites:0}));
  process.exit(0);
}
const hash = value => createHash('sha256').update(value).digest('hex');
const files = [...plan.pages.map(page=>folder + '/' + page.file),...['introduction.css','introduction.js','course-map-catalog.js','publication.json'].map(file=>folder + '/' + file),...['base.css','embedded.css','embedded.js','interactions.js'].map(file=>'shared/course-introductions/' + file)];
await Promise.all(files.map(async file=>{
  const response = await fetch(base + file + '?v=' + version,{signal:AbortSignal.timeout(30000)});
  assert.ok(response.ok && hash(Buffer.from(await response.arrayBuffer())) === hash(await readFile(file)),'Hosting not ready: ' + file);
}));
if (apply && !release) {
  await mkdir(privateDir,{recursive:true});
  release = {version,course:settings(currentCourse),steps:currentLesson.steps,sources:existing};
  await writeFile(privateDir + '/before.json',JSON.stringify(release,null,2),{mode:0o600,flag:'wx'});
}
for (const page of plan.pages) {
  const old = existing.find(source=>source.id===page.source), text = frameText(page);
  if (apply && old.block.text !== text) {
    const fresh = (await api('step-sources/' + old.id))['step-sources'][0];
    assert.deepEqual(stable(fresh),stable(old),'Concurrent edit before save: ' + old.id);
    await api('step-sources/' + old.id,'PUT',{stepSource:{lesson,position:old.position,cost:old.cost,block:{...old.block,text}}});
  }
  const saved = (await api('step-sources/' + old.id))['step-sources'][0];
  assert.deepEqual(stable(saved),{...stable(old),block:{...old.block,text}},'Stepik changed published markup: ' + old.id);
  assert.equal(saved.status,'ready');
  assert.equal((await api('steps/' + old.id)).steps[0].block.text,text);
  console.log('Verified step ' + saved.position + ': ' + saved.id);
}
assert.deepEqual((await api('lessons/' + lesson)).lessons[0].steps,currentLesson.steps);
assert.deepEqual(settings((await api('courses/' + course)).courses[0]),settings(currentCourse));
assert.deepEqual((await sources()).map(source=>source.id),existing.map(source=>source.id));
const result = {version,course,lesson,unit,steps:6,nativeAnswersPreserved:2,pointsPreserved:true,courseSettingsUnchanged:true,url:`https://stepik.org/lesson/${lesson}/step/1?unit=${unit}`};
await writeFile(privateDir + '/verified.json',JSON.stringify(result,null,2),{mode:0o600});
console.log(JSON.stringify(result));

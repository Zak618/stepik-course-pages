// A separate native text step; never rewrite the six existing introduction blocks.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {promisify} from 'node:util';
import {course, lesson, unit, folder, base} from './config.mjs';
import {pages} from '../../courses/305734-go-pro-max/introduction/content.mjs';

const apply = process.argv.includes('--apply');
const verify = process.argv.includes('--verify');
assert.ok(!(apply && verify), 'Выберите --apply или --verify');
const directory = folder + '/versions';
const state = JSON.parse(await readFile(directory + '/step.json', 'utf8'));
const plan = JSON.parse(await readFile(directory + '/publication.json', 'utf8'));
for (const value of [state, plan]) {
  assert.equal(value.course, course); assert.equal(value.lesson, lesson); assert.equal(value.unit, unit);
}
assert.equal(state.position, 6);
assert.equal(plan.suggestedPosition, state.position);
assert.equal(plan.frameHeight, 240);
assert.equal(plan.source, state.source, 'Сначала выполните build-versions.mjs');
assert.ok(plan.text.includes(base + directory + '/picture.html?v=' + plan.revision));
const session = JSON.parse(await readFile('.stepik-accounts/647088271/session.json', 'utf8'));
async function api(path, method = 'GET', body) {
  assert.ok(method === 'GET' || apply, 'Запись только с --apply');
  assert.ok(method === 'GET' || path === 'step-sources' || /^step-sources\/\d+$/.test(path), 'Только шаги урока');
  const response = await fetch('https://stepik.org/api/' + path, {
    method, headers:{Authorization:'Bearer ' + session.access_token, 'Content-Type':'application/json'},
    body:body ? JSON.stringify(body) : undefined, signal:AbortSignal.timeout(30000),
  });
  assert.ok(response.ok, method + ' ' + path + ' HTTP ' + response.status);
  return response.json();
}
async function sources() {
  const result = await api('step-sources?lesson=' + lesson);
  assert.ok(!result.meta.has_next);
  return result['step-sources'].sort((a,b) => a.position - b.position);
}
const stable = source => Object.fromEntries([
  'id','lesson','block','cost','is_enabled','needs_plan','instruction','instruction_type',
  'is_solutions_unlocked','solutions_unlocked_attempts','has_submissions_restrictions',
  'max_submissions_count','variation','variations_count','discussion_threads',
].map(key => [key,source[key]]));
assert.equal((await api('stepics/1')).stepics[0].user, 647088271);
const courseBefore = (await api('courses/' + course)).courses[0];
const lessonBefore = (await api('lessons/' + lesson)).lessons[0];
assert.ok(courseBefore.actions.edit_course && lessonBefore.actions.edit_lesson);
assert.deepEqual(lessonBefore.courses, [course]);
const privateDir = '.local-publication/go-pro-max-versions/' + plan.revision;
let journal;
try { journal = JSON.parse(await readFile(privateDir + '/journal.json','utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
let addedId = state.source || journal?.source || null;
const existing = await sources();
// Recover a successful POST whose response was lost, without creating a duplicate.
if (!addedId) {
  const matches = existing.filter(source => !pages.some(page => page.source === source.id) && source.block.text === plan.text);
  assert.ok(matches.length <= 1, 'Найдены два шага версий');
  if (matches.length) addedId = matches[0].id;
}
assert.deepEqual(existing.filter(source => source.id !== addedId).map(source => source.id), pages.map(page => page.source), 'Изменился порядок или состав урока');
const before = journal?.originals || existing.filter(source => source.id !== addedId);
function inspect(current, complete = false) {
  assert.deepEqual(current.filter(source => source.id !== addedId).map(source => source.id), pages.map(page => page.source));
  assert.equal(current.length, pages.length + (addedId ? 1 : 0));
  for (const [index, page] of pages.entries()) {
    const original = before.find(source => source.id === page.source);
    const now = current.find(source => source.id === page.source);
    assert.deepEqual(stable(now), stable(original), 'Изменился исходный шаг ' + page.source);
    const originalPosition = index + 1;
    const target = originalPosition + (addedId && originalPosition >= state.position ? 1 : 0);
    if (complete) assert.equal(now.position, target);
    else assert.ok(now.position === originalPosition || now.position === target);
  }
  if (complete) {
    assert.ok(addedId, 'Шаг версий ещё не создан');
    const saved = current.find(source => source.id === addedId);
    assert.equal(saved.position, state.position); assert.equal(saved.cost, 0);
    assert.equal(saved.block.name, 'text'); assert.equal(saved.block.text, plan.text);
    assert.equal(saved.status, 'ready');
    assert.deepEqual(current.map(source => source.position), [1,2,3,4,5,6,7]);
  }
}
inspect(existing);
if (!apply && !verify) {
  console.log(JSON.stringify({mode:'preflight',course,lesson,position:6,source:addedId,create:!addedId,originalStepsPreserved:6,stepikWrites:0}));
  process.exit(0);
}
const hash = value => createHash('sha256').update(value).digest('hex');
const run = promisify(execFile);
await Promise.all(['picture.html','picture.css','picture.js'].map(async file => {
  const {stdout} = await run('curl', ['--fail','--silent','--show-error','--location','--max-time','30',base + directory + '/' + file + '?v=' + plan.revision], {encoding:'buffer'});
  assert.equal(hash(stdout),hash(await readFile(directory + '/' + file)), 'Файлы ещё не готовы на хостинге: ' + file);
}));
if (apply) {
  await mkdir(privateDir, {recursive:true,mode:0o700});
  if (!journal) {
    journal = {revision:plan.revision,source:addedId,originals:before};
    await writeFile(privateDir + '/before.json',JSON.stringify({course:courseBefore,lesson:lessonBefore,sources:existing},null,2),{mode:0o600,flag:'wx'});
    await writeFile(privateDir + '/journal.json',JSON.stringify(journal,null,2),{mode:0o600});
  }
  if (!addedId) {
    const saved = (await api('step-sources','POST',{stepSource:{lesson,position:pages.length+1,cost:0,block:{name:'text',source:{},text:plan.text}}}))['step-sources'][0];
    addedId = saved.id;
    journal.source = addedId;
    await writeFile(privateDir + '/journal.json',JSON.stringify(journal,null,2),{mode:0o600});
    console.log('Создан шаг ' + addedId);
  }
  // Stepik does not shift duplicate positions automatically. Move the old tail first.
  for (const [index,page] of [...pages.entries()].reverse()) {
    if (index + 1 < state.position) continue;
    const fresh = (await api('step-sources/' + page.source))['step-sources'][0];
    assert.deepEqual(stable(fresh), stable(before.find(source => source.id === page.source)));
    if (fresh.position !== index + 2) {
      assert.equal(fresh.position, index + 1);
      await api('step-sources/' + fresh.id,'PUT',{stepSource:{lesson,position:index+2,cost:fresh.cost,block:fresh.block}});
    }
  }
  const fresh = (await api('step-sources/' + addedId))['step-sources'][0];
  assert.equal(fresh.lesson,lesson); assert.equal(fresh.block.name,'text'); assert.equal(fresh.cost,0);
  if (fresh.position !== state.position || fresh.block.text !== plan.text) {
    await api('step-sources/' + addedId,'PUT',{stepSource:{lesson,position:state.position,cost:0,block:{...fresh.block,text:plan.text}}});
  }
}
const saved = await sources();
inspect(saved,true);
assert.equal((await api('steps/' + addedId)).steps[0].block.text,plan.text);
const lessonAfter = (await api('lessons/' + lesson)).lessons[0];
assert.deepEqual(lessonAfter.steps,saved.map(source => source.id));
for (const key of ['owner','title','courses','units','cover_url','is_comments_enabled','is_exam_without_progress','is_public','language']) assert.deepEqual(lessonAfter[key],lessonBefore[key]);
const courseAfter = (await api('courses/' + course)).courses[0];
for (const key of ['owner','title','description','sections','is_public','is_enabled','is_paid','price','currency_code','certificate','certificate_regular_threshold','certificate_distinction_threshold','acquired_skills','acquired_assets']) assert.deepEqual(courseAfter[key],courseBefore[key]);
const result = {course,lesson,unit,source:addedId,position:state.position,revision:plan.revision,steps:7,originalBlocksUnchanged:6,nativeAnswersPreserved:2,pointsPreserved:true,url:`https://stepik.org/lesson/${lesson}/step/${state.position}?unit=${unit}`};
if (apply) {
  await writeFile(directory + '/step.json',JSON.stringify({...state,source:addedId},null,2)+'\n');
  await writeFile(privateDir + '/verified.json',JSON.stringify(result,null,2),{mode:0o600});
}
console.log(JSON.stringify(result));

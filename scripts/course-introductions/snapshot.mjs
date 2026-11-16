// GET-only baseline; also used by the guarded publisher. No writes to Stepik.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const directory = '.local-publication/unified-intros-preview-20261116';
await mkdir(directory, {recursive: true});
try { await readFile(directory + '/snapshot.json'); console.log('Using existing read-only snapshot.'); process.exit(0); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const token = JSON.parse(await readFile('.env.stepik-webhacker-session', 'utf8')).access_token;
async function api(resource) {
  const r = await fetch('https://stepik.org/api/' + resource, {headers: {Authorization: 'Bearer ' + token}, signal: AbortSignal.timeout(30000)});
  if (!r.ok) throw Error(resource.split('?')[0] + ': HTTP ' + r.status);
  return r.json();
}
async function batch(type, ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 48) {
    const chunks = [];
    for (let j = i; j < Math.min(i + 48, ids.length); j += 12) chunks.push(ids.slice(j, j + 12));
    out.push(...(await Promise.all(chunks.map(async part => (await api(type + '?' + part.map(id => 'ids[]=' + id).join('&')))[type]))).flat());
  }
  return out;
}
assert.equal((await api('stepics/1')).stepics[0].user, 647088271);
const sandbox = {window: {}};
vm.runInNewContext(await readFile('assets/go-mini-course-catalog.js', 'utf8'), sandbox);
const ids = sandbox.window.INTRO_CATALOG.courses.map(c => c.id).filter(id => ![300562,305734].includes(id));
const courses = await batch('courses', ids);
assert.equal(courses.length, ids.length);
const sections = await batch('sections', [...new Set(courses.flatMap(c => c.sections))]);
const allUnits = c => c.sections.flatMap(id => sections.find(s => s.id === id).units);
const units = await batch('units', [...new Set(courses.flatMap(c => allUnits(c).slice(0, 2)))]);
const lessons = await batch('lessons', [...new Set(units.map(u => u.lesson))]);
const intros = courses.map(c => {
  const unit = units.find(u => u.id === allUnits(c)[0]);
  const next = units.find(u => u.id === allUnits(c)[1]);
  return {course: c.id, unit: unit.id, lesson: unit.lesson, nextUnit: next?.id, nextLesson: next?.lesson};
});
const sources = [];
for (let i = 0; i < intros.length; i += 4) {
  await Promise.all(intros.slice(i, i + 4).map(async intro => {
    for (let page = 1; page <= 20; page++) {
      const data = await api('step-sources?lesson=' + intro.lesson + '&page=' + page);
      sources.push(...data['step-sources']);
      if (!data.meta.has_next) return;
    }
    throw Error('Unexpected pagination');
  }));
  console.log('Read ' + Math.min(i + 4, intros.length) + '/' + intros.length);
}
const safeCourses = courses.map(c => Object.fromEntries(Object.entries(c).filter(([key]) => !key.startsWith('lti_') && !key.endsWith('_group'))));
await writeFile(directory + '/snapshot.json', JSON.stringify({at: new Date().toISOString(), mode: 'local-only', excluded: [300562,305734], courses: safeCourses, sections, units, lessons, intros, sources}, null, 2), {mode: 0o600});
console.log(JSON.stringify({courses: courses.length, sources: sources.length, writesToStepik: 0, directory}));

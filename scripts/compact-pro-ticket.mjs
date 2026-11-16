// Change only the scratch-ticket iframe; preserve the rest of the live lesson.
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root = 'https://zak618.github.io/stepik-course-pages/';
const file = 'courses/305666-go-mini/modules/06-project/pro-ticket.html';
const version = 'ticket-compact-20261116-2';
const dir = '.local-publication/pro-ticket-compact-20261116';
const token = JSON.parse(await readFile('.env.stepik-webhacker-session', 'utf8')).access_token;
const apply = process.argv.includes('--apply');
const verify = process.argv.includes('--verify');
async function api(path, method = 'GET', body) {
  const response = await fetch('https://stepik.org/api/' + path, {
    method, headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000),
  });
  assert.ok(response.ok, method + ' ' + path + ': ' + response.status);
  return response.json();
}
const source = async () => (await api('step-sources/12428178'))['step-sources'][0];
assert.equal((await api('stepics/1')).stepics[0].user, 647088271);
const old = await source();
assert.equal(old.lesson, 2713291);
assert.equal(old.cost, 0);
assert.equal(old.block.name, 'text');
const frames = [...old.block.text.matchAll(/<iframe\b[^>]*>/g)];
const matches = frames.filter(match => match[0].includes('/' + file + '?'));
assert.equal(matches.length, 1);
const previous = matches[0][0];
assert.match(previous, /height="(?:230|138)"/);
const next = previous.replace(/height="(?:230|138)"/, 'height="138"')
  .replace(/(pro-ticket\.html\?v=)[^"&]+/, '$1' + version);
const text = old.block.text.replace(previous, next);
assert.equal((text.match(/<iframe/g) || []).length, frames.length);
if (verify) assert.equal(old.block.text, text, 'Compact ticket not published');
if (apply || verify) {
  const hash = value => createHash('sha256').update(value).digest('hex');
  for (const path of [file, 'assets/go-mini-pro-gift.css', 'assets/go-mini-pro-gift.js']) {
    const response = await fetch(root + path + '?v=' + version, {signal: AbortSignal.timeout(30000)});
    assert.ok(response.ok && hash(Buffer.from(await response.arrayBuffer())) === hash(await readFile(path)), 'Pages not ready: ' + path);
  }
}
if (apply && text !== old.block.text) {
  await mkdir(dir, {recursive: true});
  await writeFile(dir + '/before.json', JSON.stringify(old, null, 2), {mode: 0o600, flag: 'wx'});
  assert.deepEqual(await source(), old, 'Concurrent edit; refusing overwrite');
  await api('step-sources/12428178', 'PUT', {stepSource: {
    lesson: old.lesson, position: old.position, cost: old.cost, block: {...old.block, text},
  }});
}
if (apply || verify) {
  const saved = await source();
  assert.deepEqual(saved.block, {...old.block, text});
  for (const key of ['id', 'lesson', 'position', 'cost', 'is_enabled']) assert.deepEqual(saved[key], old[key]);
  assert.equal(saved.status, 'ready');
  assert.equal((await api('steps/12428178')).steps[0].block.text, text);
  if (apply) await writeFile(dir + '/verified.json', JSON.stringify({step: saved.id, height: 138, surroundingContentPreserved: true, text}, null, 2), {mode: 0o600});
}
console.log(JSON.stringify({mode: apply ? 'apply' : verify ? 'verify' : 'preflight', step: old.id, height: 138, changed: text !== old.block.text}));

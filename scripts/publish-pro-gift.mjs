// Restore the original step and replace only its old prose promo with a small ticket.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir = '.local-publication/pro-gift-inset-20261116';
const before = JSON.parse(await readFile('.local-publication/pro-gift-20261116/before.json', 'utf8'));
const baseline = JSON.parse(await readFile(dir + '/before.json', 'utf8'));
const old = baseline.source;
assert.equal(old.id, 12428178);
assert.equal(old.lesson, 2713291);
assert.equal(old.position, 1);
assert.equal(old.cost, 0);
assert.equal(old.block.name, 'text');
assert.equal(before.sources['step-sources'].length, 1);
const version = 'ticket-inset-20261116-1';
const root = 'https://zak618.github.io/stepik-course-pages/';
// Stepik strips allow/title and zero line-height, and orders iframe attributes.
// Clipboard copying therefore also supports the legacy, user-activated path.
const original = before.sources['step-sources'][0].block.text;
const start = original.indexOf('<h3>🎁 Небольшой подарок от WEB HACKER</h3>');
const end = original.indexOf('<h2', start);
assert.ok(start > 0 && end > start && original.slice(start, end).includes('GOSHECHKA10'));
const prefix = original.slice(0, start).replace('v=finale-20261115-1', 'v=city-restored-20261116-1');
const suffix = original.slice(end);
const ticket = `<div style="font-size:0;margin:0;"><iframe height="230" src="${root}courses/305666-go-mini/modules/06-project/pro-ticket.html?v=${version}" style="border:0;width:100%;margin:0;background:#fff;" width="100%"></iframe></div>`;
const text = prefix + ticket + '\n\n' + suffix;
assert.ok(text.includes('Find работает.') && text.includes('Спасибо, что были с нами.'));
assert.equal((text.match(/<iframe/g) || []).length, 2);
const token = JSON.parse(await readFile('.env.stepik-webhacker-session', 'utf8')).access_token;
async function api(p, method = 'GET', body) {
  const r = await fetch('https://stepik.org/api/' + p, {method, headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000)});
  if (!r.ok) throw Error(method + ' ' + p + ': ' + r.status);
  return r.json();
}
const hash = value => createHash('sha256').update(value).digest('hex');
const stable = s => ({id: s.id, lesson: s.lesson, position: s.position, cost: s.cost, is_enabled: s.is_enabled, block: s.block});
const settings = c => Object.fromEntries(['id', 'owner', 'title', 'sections', 'is_public', 'is_enabled', 'is_paid', 'price', 'currency_code', 'certificate', 'certificate_regular_threshold', 'certificate_distinction_threshold'].map(k => [k, c[k]]));
assert.equal((await api('stepics/1')).stepics[0].user, 647088271);
const current = (await api('step-sources/12428178'))['step-sources'][0];
assert.ok(current.block.text === text || JSON.stringify(stable(current)) === JSON.stringify(stable(old)), 'Concurrent step edit; refusing overwrite');
assert.deepEqual(settings((await api('courses/305666')).courses[0]), settings(baseline.course), 'Course settings changed');
assert.deepEqual(stable((await api('step-sources/12428177'))['step-sources'][0]), stable(baseline.curtain), 'Theatre changed');
if (!process.argv.includes('--apply') && !process.argv.includes('--verify')) {
  console.log(JSON.stringify({mode: 'preflight', step: old.id, cost: old.cost, height: 230, originalPrefixRestored: true, originalSuffixRestored: true}));
  process.exit(0);
}
for (const file of ['courses/305666-go-mini/modules/06-project/lesson-02-step-01.html', 'courses/305666-go-mini/modules/06-project/pro-ticket.html', 'assets/go-mini-pro-gift.css', 'assets/go-mini-pro-gift.js']) {
  const r = await fetch(root + file + '?v=' + version, {signal: AbortSignal.timeout(30000)});
  assert.ok(r.ok && hash(Buffer.from(await r.arrayBuffer())) === hash(await readFile(file)), 'Pages not ready: ' + file);
}
if (process.argv.includes('--apply') && current.block.text !== text) {
  // A fresh equality check immediately before the single authorized write.
  assert.deepEqual(stable((await api('step-sources/12428178'))['step-sources'][0]), stable(current));
  await api('step-sources/12428178', 'PUT', {stepSource: {lesson: old.lesson, position: old.position, cost: old.cost, block: {...old.block, text}}});
}
const saved = (await api('step-sources/12428178'))['step-sources'][0];
assert.equal(saved.block.text, text);
assert.equal(saved.status, 'ready');
assert.ok(!saved.error?.text && !saved.error?.code);
assert.deepEqual(stable(saved), {...stable(old), block: {...old.block, text}});
assert.equal((await api('steps/12428178')).steps[0].block.text, text);
assert.deepEqual((await api('lessons/2713291')).lessons[0].steps, before.lesson.lessons[0].steps);
assert.deepEqual(settings((await api('courses/305666')).courses[0]), settings(baseline.course));
assert.deepEqual(stable((await api('step-sources/12428177'))['step-sources'][0]), stable(baseline.curtain));
await writeFile(dir + '/verified.json', JSON.stringify({step: saved.id, text, status: saved.status, courseSettingsUnchanged: true, theatreUnchanged: true}, null, 2), {mode: 0o600});
console.log(JSON.stringify({step: saved.id, status: saved.status, learnerTextVerified: true, courseSettingsUnchanged: true, theatreUnchanged: true}));

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeVersion,versionOptions} from '../../courses/305734-go-pro-max/introduction/versions/version-options.mjs';
import {readVersionFrame,updateVersionFrame} from './version-links.mjs';
const base='https://zak618.github.io/stepik-course-pages/courses/305734-go-pro-max/introduction/versions/picture.html';
test('URL settings change current version and preserve old numbers',()=>{
  assert.deepEqual(versionOptions('?version=v1.2&history=1.1,1.0,1.1,1.2'),{current:'1.2',history:['1.1','1.0']});
  assert.deepEqual(versionOptions('?version=2.0.1&history='),{current:'2.0.1',history:[]});
});
test('invalid values and HTML never become version labels',()=>{
  assert.equal(normalizeVersion('<img src=x>'),null);
  assert.deepEqual(versionOptions('?version=%3Cscript%3E&history=1.0,%3Cimg%3E',{current:'1.1',history:[]}),{current:'1.1',history:['1.0']});
  assert.equal(versionOptions('?version='+'1'.repeat(5000)).current,'1.0');
});
test('migration changes only iframe URL, never native author text',()=>{
  const text=`<iframe height="240" src="${base}?v=old" style="border:0;"></iframe><h3>v1.1</h3><p>Мой текст.</p><h3>v1.0</h3>`;
  const saved=updateVersionFrame(text,'new');
  assert.equal(saved.replace(readVersionFrame(saved).raw,readVersionFrame(text).raw),text);
  assert.equal(readVersionFrame(saved).url.searchParams.get('version'),'1.1');
  assert.equal(readVersionFrame(saved).url.searchParams.get('history'),'1.0');
  assert.ok(saved.includes('&amp;'));
});
test('later asset updates do not reset manually configured versions',()=>{
  const text=`<iframe src="${base}?version=3.2&amp;history=3.1,2.0&amp;v=old"></iframe><h3>v1.0</h3>`;
  const saved=updateVersionFrame(text,'new');
  assert.deepEqual(versionOptions(readVersionFrame(saved).url.search),{current:'3.2',history:['3.1','2.0']});
  assert.equal(readVersionFrame(saved).url.searchParams.get('v'),'new');
  assert.equal(updateVersionFrame(saved,'new'),saved);
});

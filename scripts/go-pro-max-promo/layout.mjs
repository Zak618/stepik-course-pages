// Description text uses native flow, not a viewport-dependent full-page frame.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const plan=JSON.parse(await readFile('courses/305734-go-pro-max/promo/publication.json','utf8'));
assert.equal(plan.mode,'native-text');assert.equal(plan.frameHeight,360);
assert.ok(!plan.description.includes('embed.html'));
console.log('Native text and one compact 360px illustration. No height formula.');

import assert from 'node:assert/strict';
import {normalizeVersion,versionOptions} from '../../courses/305734-go-pro-max/introduction/versions/version-options.mjs';
import {base,folder} from './config.mjs';

const pictureUrl = new URL(folder + '/versions/picture.html',base);
const escapeAttribute = text => text.replaceAll('&','&amp;').replaceAll('"','&quot;');

export function readVersionFrame(text) {
  const frames = [...text.matchAll(/<iframe\b[^>]*\bsrc=(['"])(.*?)\1[^>]*>/gi)].map(match => {
    const raw = match[2];
    const url = new URL(raw.replaceAll('&amp;','&'),base);
    return {raw,url};
  }).filter(frame => frame.url.origin === pictureUrl.origin && frame.url.pathname === pictureUrl.pathname);
  assert.equal(frames.length,1,'В шаге должна быть одна анимация версий');
  return frames[0];
}

export function updateVersionFrame(text,revision) {
  const frame = readVersionFrame(text);
  const headings = [...text.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)]
    .map(match => normalizeVersion(match[1].replace(/<[^>]*>/g,'').replaceAll('&nbsp;',' ').trim())).filter(Boolean);
  // Existing URL settings take priority. Legacy links start with the native history.
  const options = versionOptions(frame.url.search,{current:headings[0]});
  frame.url.searchParams.set('version',options.current);
  frame.url.searchParams.delete('history');
  frame.url.searchParams.set('v',revision);
  return text.replace(frame.raw,escapeAttribute(frame.url.href));
}

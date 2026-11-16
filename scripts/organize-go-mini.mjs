// One-time mechanical move, also safe to rerun to refresh legacy URL redirects.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,readdir,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
const root='courses/305666-go-mini';
const modules={
  '01':'01-introduction','02':'02-computing','03':'03-go-basics',
  '04':'04-control-flow','05':'05-functions-and-data','06':'06-project'
};
const prefixes=Object.entries(modules).map(([id,folder])=>['go-mini-module-'+id+'-',root+'/modules/'+folder+'/']);
prefixes.push(['go-mini-pro-ticket.html',root+'/modules/06-project/pro-ticket.html'],['go-mini-course-promo.html',root+'/promo.html']);
const rewrite=(text,regex=false)=>prefixes.reduce((s,[before,after])=>s.replaceAll(before,regex?after.replaceAll('/','\\/'):after),text);
const require=createRequire(import.meta.url);
// Acorn is needed only for the initial mechanical migration, not for previews.
let acorn;
async function source(text,file){
  if(!/\.(m?js)$/.test(file))return rewrite(text);
  acorn??=require('acorn');
  const edits=[];
  for(const token of acorn.tokenizer(text,{ecmaVersion:'latest',sourceType:'module',allowHashBang:true})){
    const raw=text.slice(token.start,token.end),next=rewrite(raw,token.type.label==='regexp');
    if(raw!==next)edits.push({start:token.start,end:token.end,next});
  }
  for(const e of edits.reverse())text=text.slice(0,e.start)+e.next+text.slice(e.end);
  return text;
}
await mkdir(root,{recursive:true});
const manifestFile=root+'/legacy-paths.json';
let mapping={};try{mapping=JSON.parse(await readFile(manifestFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const oldPages=(await readdir('.')).filter(f=>/^go-mini-(?:module-0[1-6]-.+|pro-ticket|course-promo)\.html$/.test(f)).sort();
for(const old of oldPages){
  const next=rewrite(old);assert.notEqual(old,next);assert.ok(next.startsWith(root+'/'));
  await mkdir(path.dirname(next),{recursive:true});
  // Fail rather than overwrite a page the user has already placed there.
  try{await readFile(next);throw Error('Destination already exists: '+next);}catch(e){if(e.code!=='ENOENT')throw e;}
  await rename(old,next);mapping[old]=next;
}
async function walk(folder){
  for(const entry of await readdir(folder,{withFileTypes:true})){
    if(entry.name.startsWith('.')||['node_modules','docs','compat'].includes(entry.name))continue;
    const file=path.join(folder,entry.name);
    if(entry.isDirectory()){await walk(file);continue;}
    if(!/\.(?:html|mjs|js)$/.test(file)||file==='scripts/organize-go-mini.mjs')continue;
    const before=await readFile(file,'utf8');let after=await source(before,file);
    if(file.startsWith(root+'/')&&file.endsWith('.html')&&!/<base\s/i.test(after)){
      const relative=path.relative(path.dirname(file),'.').replaceAll(path.sep,'/')+'/';
      after=after.replace(/<head>/i,'<head><base href="'+relative+'">');
    }
    // These preview servers intentionally allow same-origin assets only.
    if(file.startsWith('scripts/preview-'))after=after.replaceAll("base-uri 'none'","base-uri 'self'");
    if(after!==before)await writeFile(file,after);
  }
}
if(oldPages.length)await walk('.');
await writeFile(manifestFile,JSON.stringify(mapping,null,2)+'\n');
await mkdir('compat/go-mini',{recursive:true});
for(const [old,next]of Object.entries(mapping)){
  assert.ok(/^go-mini-[a-z0-9-]+\.html$/.test(old));
  assert.ok(next.startsWith(root+'/')&&!next.includes('..'));
  await readFile(next); // Never generate a redirect to a missing page.
  const url="{{ '/"+next+"' | relative_url }}";
  await writeFile('compat/go-mini/'+old,`---\nlayout: null\npermalink: /${old}\n---\n<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${url}"><title>Go-шечка (mini)</title></head><body><a id="next" href="${url}">Открыть урок</a><script>const next=new URL(document.getElementById('next').href);next.search=location.search;next.hash=location.hash;location.replace(next.href);</script></body></html>\n`);
}
console.log(JSON.stringify({moved:oldPages.length,legacyUrls:Object.keys(mapping).length,courseFolder:root,stepikWrites:0}));

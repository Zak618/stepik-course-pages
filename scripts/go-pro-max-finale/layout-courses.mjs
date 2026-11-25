// Generate responsive heights from actual card measurements. No Stepik writes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {withBrowser} from '../sql-course/intro-browser.mjs';
const folder='courses/305734-go-pro-max/modules/29-finale';
const widths=JSON.parse(await readFile('courses/305734-go-pro-max/introduction/publication.json','utf8')).nativeWidths;
function nativeWidth(viewport){
  if(viewport<widths[0].viewport)return viewport-32;
  for(let i=1;i<widths.length;i++)if(viewport<=widths[i].viewport){
    const a=widths[i-1],b=widths[i];
    return Math.floor(a.width+(b.width-a.width)*(viewport-a.viewport)/(b.viewport-a.viewport));
  }
  return widths.at(-1).width;
}
let measured;
await withBrowser(async({viewport,load,evaluate,exceptions})=>{
  await viewport(1200);await load('http://localhost:8810/embeds/courses.html');
  measured=await evaluate(`(()=>{const heights={};const main=document.querySelector('main');for(let width=240;width<=1022;width++){main.style.width=width+'px';heights[width]=Math.ceil(main.getBoundingClientRect().height);}return heights;})()`);
  assert.deepEqual(exceptions,[]);
});
const all=[];
for(let viewport=272;viewport<=1920;viewport++){
  const localWidth=viewport<=620?viewport-36:Math.min(viewport,1004)-56;
  // Account for the browser's vertical scrollbar and breakpoint rounding.
  const width=Math.max(240,Math.min(nativeWidth(viewport),localWidth)-20);
  all.push({width:viewport,height:measured[width]+4});
}
const samples=all.filter((point,index)=>!index||index===all.length-1||point.height!==all[index-1].height||point.height!==all[index+1].height);
await writeFile(folder+'/embeds/courses-layout.json',JSON.stringify({nativeWidths:widths,samples},null,2));
console.log(JSON.stringify({samples:samples.length,minHeight:Math.min(...all.map(p=>p.height)),maxHeight:Math.max(...all.map(p=>p.height)),stepikWrites:0}));

import {base} from '../../shared/course-introductions/catalog.mjs';
export function repairMiniStep(id,text,mapping){
  text=text.replace(/(<iframe\b[^>]*\bsrc=")([^"]+)(")/g,(all,start,url,end)=>{
    if(!url.startsWith(base))return all;
    const tail=url.slice(base.length),file=tail.split(/[?#]/)[0];
    return mapping[file]?start+base+mapping[file]+tail.slice(file.length)+end:all;
  });
  // 360px phones need nine more pixels for the initial error-handling scene.
  if(id===12426818)text=text.replace('height="850"','height="864"');
  return text;
}

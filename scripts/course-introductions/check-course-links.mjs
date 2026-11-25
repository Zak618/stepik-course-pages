// Read-only browser checks. Never follow purchase links or call Stepik.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {withBrowser} from '../sql-course/intro-browser.mjs';

const mini='courses/305666-go-mini/modules/01-introduction/lesson-01-step-05.html';
const shared='courses/135466-html-css-js/introduction/06-course-map.html';
const max='courses/305734-go-pro-max/introduction/03-course-map.html';
const finale='courses/305734-go-pro-max/modules/29-finale/04-next.html';
const pages=new Set([mini,shared,max,finale]);
const maps=execFileSync('rg',['-l','id="course-link"','courses','--glob','*.html']).toString().trim().split('\n');
assert.equal(maps.length,39);
for(const file of maps){
  const html=await readFile(file,'utf8');
  assert.match(html,/src="(?:assets\/go-mini-intro|shared\/course-introductions\/interactions)\.js\?/);
}
const server=createServer(async(req,res)=>{
  const file=new URL(req.url,'http://localhost').pathname.slice(1);
  if(!pages.has(file)&&!(/^(assets|shared\/course-introductions)\/[a-zA-Z0-9/_.-]+\.(js|css|png)$/.test(file)&&!file.includes('..'))&&file!=='courses/305734-go-pro-max/introduction/course-map-catalog.js'){
    res.writeHead(404);res.end();return;
  }
  try{const data=await readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(data);}
  catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const results=[];
try{
  await withBrowser(async({viewport,load,evaluate,exceptions})=>{
    for(const width of [1280,390])for(const file of [mini,shared,max]){
      await viewport(width);await load(origin+'/'+file+'?embed=1');
      const links=await evaluate(`(()=>{
        const search=document.querySelector('#course-search'),result=[];
        for(const course of window.INTRO_CATALOG.courses){
          search.value=course.title;search.dispatchEvent(new Event('input',{bubbles:true}));
          const button=document.querySelector('.list-course[data-course="'+course.id+'"]');
          if(!button)throw Error('Missing course '+course.id);
          button.click();
          const a=document.querySelector('#course-link');
          result.push({id:course.id,free:course.free,href:a.href,target:a.target,rel:a.rel});
          document.querySelector('#dialog-close').click();
        }
        return result;
      })()`);
      for(const link of links){
        assert.equal(link.href,link.free?'https://stepik.org/course/'+link.id+'/promo':'https://stepik.org/a/'+link.id);
        assert.equal(link.target,'_blank');assert.ok(link.rel.includes('noopener'));
      }
      results.push({file,width,courses:links.length,paid:links.filter(c=>!c.free).length});
    }
    await load(origin+'/'+finale);
    assert.deepEqual(await evaluate('[...document.querySelectorAll(".gpmx-finale-course-card a")].map(a=>a.href)'),['https://stepik.org/a/200517','https://stepik.org/a/200517','https://stepik.org/a/183142','https://stepik.org/a/183142']);
    assert.deepEqual(exceptions,[]);
  });
}finally{await new Promise(resolve=>server.close(resolve));}
console.log(JSON.stringify({maps:maps.length,results,finaleLinks:4,stepikWrites:0}));

// Read-only Stepik rendering. Source bytes are checked on the real host first.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {createApi} from './stepik.mjs';
import {variants} from '../../shared/course-promotions/go-pro-max/offer.mjs';
const dir='.local-publication/go-max-course-promotions-20261126';
const plan=JSON.parse(await readFile(dir+'/plan.json','utf8'));
const journal=JSON.parse(await readFile(dir+'/journal.json','utf8'));
assert.equal(journal.revision,plan.revision);
const courses=(process.argv.find(arg=>arg.startsWith('--courses='))?.slice(10)||'135466,305666').split(',').map(Number);
const targets=plan.targets.filter(t=>courses.includes(t.course));
assert.ok(targets.length);
const api=await createApi();
const token=JSON.parse(await readFile('.stepik-accounts/647088271/session.json','utf8')).access_token;
const base='https://zak618.github.io/stepik-course-pages/';
const assets=new Map(),run=promisify(execFile),hash=x=>createHash('sha256').update(x).digest('hex');
for(const file of plan.assets){const{stdout}=await run('curl',['--fail','--silent','--show-error','--location','--max-time','30',base+file+'?v='+plan.revision],{encoding:'buffer',maxBuffer:3000000});assert.equal(hash(stdout),hash(await readFile(file)));assets.set('/stepik-course-pages/'+file,stdout);}
const {stdout:headers}=await run('curl',['--fail','--silent','--show-error','--location','--head','--max-time','20',base+'shared/course-promotions/go-pro-max/offer.mjs?v='+plan.revision]);
assert.match(headers,/content-type:\s*(?:text|application)\/javascript/i,'Real module MIME type');
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
await context.route('**/*',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
await context.route('https://stepik.org/api/**',route=>route.request().method()==='GET'?route.continue({headers:{...route.request().headers(),authorization:'Bearer '+token}}):route.abort());
await context.route(base+'**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(!assets.has(path))return route.abort();
  const type=path.endsWith('.png')?'image/png':path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':'text/javascript';
  return route.fulfill({body:assets.get(path),contentType:type});
});
const page=await context.newPage(),records=[],copyResults=[],widgetErrors=[];
page.on('pageerror',error=>{if(error.stack?.includes('/course-promotions/'))widgetErrors.push(error.message);});
try{
  for(const target of targets){
    const saved=journal.records[target.key];assert.ok(saved?.done,target.key+' not published');
    const source=(await api('step-sources/'+saved.source))['step-sources'][0];assert.equal(source.block.text,target.text);
    const lesson=target.lesson||saved.lesson,unit=target.unit||saved.unit;
    await page.goto(`https://stepik.org/lesson/${lesson}/step/${target.position}?unit=${unit}`,{waitUntil:'domcontentloaded',timeout:45000});
    const iframe=page.locator('iframe[src*="/shared/course-promotions/go-pro-max/offer-"]');
    await iframe.waitFor({timeout:45000});
    const frame=await(await iframe.elementHandle()).contentFrame();
    await frame.locator('#scratch[data-painted]').waitFor();
    assert.equal(await frame.locator('#discount').textContent(),'−'+target.discount+'%');
    assert.equal(await frame.locator('#promo').inputValue(),variants[target.audience].code);
    assert.equal(await frame.locator('.course-link').getAttribute('href'),'https://stepik.org/a/305734');
    for(const width of [1280,800,390,320]){
      await page.setViewportSize({width,height:1000});await iframe.scrollIntoViewIfNeeded();
      const metrics=await frame.evaluate(()=>({width:innerWidth,height:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,white:getComputedStyle(document.querySelector('.offer')).backgroundColor,cardHeight:document.querySelector('.offer').getBoundingClientRect().height}));
      assert.equal(metrics.height,400);assert.equal(metrics.cardHeight,400);
      assert.ok(metrics.x<=1&&metrics.y<=1,JSON.stringify(metrics));assert.equal(metrics.white,'rgb(255, 255, 255)');
      records.push({course:target.course,placement:target.placement,viewport:width,...metrics});
      if([1280,390].includes(width))await page.screenshot({path:dir+'/native-'+target.key.replace(':','-')+'-'+width+'.png'});
    }
    await frame.locator('#scratch').press('Enter');
    assert.equal(await frame.locator('#copy').isVisible(),true);
    assert.equal(await frame.locator('#promo').getAttribute('aria-hidden'),null);
    await frame.locator('#copy').click();
    await frame.waitForFunction(()=>['Скопировано ✓','Выделить код'].includes(document.querySelector('#copy span').textContent));
    const copyResult=await frame.evaluate(()=>{const code=document.querySelector('#promo');return {automatic:document.querySelector('#copy span').textContent==='Скопировано ✓',selected:code.selectionStart===0&&code.selectionEnd===code.value.length};});
    assert.ok(copyResult.automatic||copyResult.selected,'Clipboard success or usable manual fallback');
    copyResults.push({key:target.key,...copyResult});
    console.log('Native ready '+target.key+' '+target.discount+'%');
  }
  assert.deepEqual(widgetErrors,[]);
  await writeFile(dir+'/native-checks-'+courses.join('-')+'.json',JSON.stringify({records,copyResults,hostBytesVerified:true,moduleMimeVerified:true,routedVerifiedAssets:true,widgetErrors,stepikWrites:0},null,2),{mode:0o600});
  console.log(JSON.stringify({courses,views:records.length,stepikWrites:0,noScroll:true,whiteBackground:true}));
}finally{await context.unrouteAll({behavior:'ignoreErrors'});await browser.close();}

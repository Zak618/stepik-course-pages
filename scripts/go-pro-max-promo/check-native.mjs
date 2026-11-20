// GET-only native check, including outer overflow and classic scrollbars.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const live=process.argv.includes('--live'),folder='courses/305734-go-pro-max/promo';
const base='https://zak618.github.io/stepik-course-pages/';
const plan=JSON.parse(await readFile(folder+'/publication.json','utf8'));
const privateDir='.local-publication/go-pro-max-promo-20261120';
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server','--disable-features=OverlayScrollbar']});
const context=await browser.newContext({reducedMotion:'reduce',bypassCSP:true,serviceWorkers:'block'});
if(!live)await context.route(base+folder+'/**',async route=>{
  const file=new URL(route.request().url()).pathname.split('/').pop();
  assert.ok(['project.html','project.css','project.js'].includes(file));
  await route.fulfill({body:await readFile(folder+'/'+file),contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html'});
});
await context.route('https://stepik.org/api/**',async route=>{
  if(route.request().method()!=='GET')return route.abort();
  if(live)return route.continue({headers:{...route.request().headers(),authorization:'Bearer '+token}});
  const response=await route.fetch({headers:{...route.request().headers(),authorization:'Bearer '+token}});
  if(new URL(route.request().url()).pathname.includes('/courses')){
    const data=await response.json();for(const course of data.courses||[])if(course.id===305734)course.description=plan.description;
    return route.fulfill({response,json:data});
  }
  return route.fulfill({response});
});
const page=await context.newPage();const results=[];
try{
  await page.goto('https://stepik.org/course/305734/promo',{waitUntil:'domcontentloaded',timeout:60000});
  const element=page.locator('iframe[src*="'+folder+'/project.html"]');await element.waitFor({timeout:45000});
  const frame=await(await element.elementHandle()).contentFrame();await frame.locator('#play').waitFor();
  const description=page.locator('.course-promo__description');
  assert.ok(!/WEB HACKER|@webosnovy|На связи/.test(await description.innerText()));
  assert.ok((await description.innerText()).includes('Малая часть'));
  assert.equal(await description.locator('iframe').count(),1);
  for(const width of [320,390,800,1024,1025,1366,1618]){
    await page.setViewportSize({width,height:1025});await element.scrollIntoViewIfNeeded();await page.waitForTimeout(250);
    await frame.locator('#play').click();
    assert.equal(await frame.locator('.demo').getAttribute('data-stage'),'4');
    const metrics=await frame.evaluate(()=>({width:innerWidth,height:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,bottom:document.querySelector('button').getBoundingClientRect().bottom}));
    assert.ok(metrics.x<=1&&metrics.y<=1&&metrics.bottom<=metrics.height,'Inner overflow: '+JSON.stringify({width,...metrics}));
    const ancestors=await element.evaluate(element=>{let result=[];for(let node=element.parentElement;node&&node!==document.body;node=node.parentElement){const s=getComputedStyle(node);if(['auto','scroll'].includes(s.overflowY)&&node.scrollHeight>node.clientHeight+1)result.push(node.className);}return result;});
    assert.deepEqual(ancestors,[],'Outer description must not scroll separately');
    assert.ok(await description.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Native text overflow');
    for(const summary of await description.locator('details summary').all())await summary.click();
    assert.ok((await description.innerText()).includes('Pinia'));
    for(const summary of await description.locator('details summary').all())await summary.click();
    results.push({width,...metrics,outerOverflow:false,footerRemoved:true});
    if([390,1618].includes(width)){await description.evaluate(e=>window.scrollTo(0,e.getBoundingClientRect().top+scrollY-100));await page.screenshot({path:privateDir+'/'+(live?'live-fixed':'preview-fixed')+'-'+width+'.png'});}
  }
  await page.emulateMedia({reducedMotion:'no-preference'});await frame.locator('#play').click();
  assert.ok(await frame.locator('#play').isDisabled());await frame.waitForFunction(()=>document.querySelector('.demo').dataset.stage==='4');assert.ok(await frame.locator('#play').isEnabled());
  await writeFile(privateDir+'/'+(live?'browser-fixed':'browser-preview-fixed')+'.json',JSON.stringify({live,results,stepikWrites:0},null,2),{mode:0o600});
  console.log(JSON.stringify({live,checkedWidths:results.length,innerScrolls:0,outerScrolls:0,footerRemoved:true}));
}finally{await context.unrouteAll({behavior:'ignoreErrors'});await browser.close();}

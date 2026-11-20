// GET-only browser verification. Mock mode previews local files without saving.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const live=process.argv.includes('--live');
const folder='courses/305734-go-pro-max/promo';
const base='https://zak618.github.io/stepik-course-pages/';
const plan=JSON.parse(await readFile(folder+'/publication.json','utf8'));
const privateDir='.local-publication/go-pro-max-promo-20261120';
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context=await browser.newContext({reducedMotion:'reduce',bypassCSP:true,serviceWorkers:'block'});
if(!live)await context.route(base+folder+'/**',async route=>{
  const file=new URL(route.request().url()).pathname.split('/').pop();
  assert.ok(['embed.html','styles.css','interactions.js'].includes(file));
  await route.fulfill({body:await readFile(folder+'/'+file),contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html'});
});
await context.route('https://stepik.org/api/**',async route=>{
  if(route.request().method()!=='GET')return route.abort();
  if(live)return route.continue({headers:{...route.request().headers(),authorization:'Bearer '+token}});
  const response=await route.fetch({headers:{...route.request().headers(),authorization:'Bearer '+token}});
  if(new URL(route.request().url()).pathname.includes('/courses')){
    const data=await response.json();
    for(const course of data.courses||[])if(course.id===305734)course.description=plan.description;
    return route.fulfill({response,json:data});
  }
  return route.fulfill({response});
});
const page=await context.newPage();const results=[],errors=[];
page.on('pageerror',error=>{if(error.message.includes('promo/'))errors.push(error.message);});
try{
  await page.goto('https://stepik.org/course/305734/promo',{waitUntil:'domcontentloaded',timeout:60000});
  const element=page.locator('iframe[src*="'+folder+'/embed.html"]');await element.waitFor({timeout:45000});
  const frame=await(await element.elementHandle()).contentFrame();await frame.locator('h1').waitFor();
  for(const width of [320,390,800,1024,1025,1366]){
    await page.setViewportSize({width,height:1000});await page.waitForTimeout(1000);
    await element.scrollIntoViewIfNeeded();
    await frame.locator('#run-demo').click();
    assert.equal(await frame.locator('.project-visual').getAttribute('data-stage'),'4');
    await frame.locator('.topic').nth(4).locator('summary').click();
    await frame.locator('.faq-list details').nth(2).locator('summary').click();
    await page.waitForTimeout(80);
    const metrics=await frame.evaluate(()=>({width:innerWidth,height:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,tail:innerHeight-document.querySelector('main').getBoundingClientRect().height}));
    console.log(JSON.stringify({viewport:width,...metrics}));
    assert.ok(metrics.x<=1&&metrics.y<=1,'Frame overflow: '+width);
    assert.ok(metrics.tail<160,'Excessive blank tail: '+width);
    assert.ok(!/[—–]/.test(await frame.locator('body').innerText()));
    assert.equal(await frame.locator('.preview-bar,.draft-label').count(),0);
    results.push({viewport:width,...metrics});
    if([390,1366].includes(width))await page.screenshot({path:privateDir+'/'+(live?'live':'preview')+'-'+width+'.png',fullPage:true});
  }
  assert.deepEqual(errors,[]);
  await writeFile(privateDir+'/'+(live?'browser':'browser-preview')+'.json',JSON.stringify({live,results,errors,stepikWrites:0},null,2),{mode:0o600});
}finally{await context.unrouteAll({behavior:'ignoreErrors'});await browser.close();}

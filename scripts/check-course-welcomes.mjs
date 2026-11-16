import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const origin=process.env.STEPIK_INTRO_URL||'http://localhost:8793';
const sandbox={window:{}};vm.runInNewContext(await readFile('assets/course-intro-index.js','utf8'),sandbox);
const items=sandbox.window.COURSE_INTRO_INDEX;
assert.equal(items.length,38);
for(const item of items){assert.ok(!/course-intro\.html|course-intro\.js|<button|<canvas/.test(item.html),'No games '+item.id);assert.ok(/Привет|Добро пожаловать/.test(item.html),'Greeting '+item.id);}
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const page=await browser.newPage(),errors=[];let checks=0;
page.on('pageerror',e=>errors.push(e.message));
const screenshots=await mkdtemp('/tmp/course-welcomes-qa-');
try{
 for(const width of[280,320,390,800,1100]){
  await page.setViewportSize({width,height:900});
  await page.goto(origin+'/course-intros.html',{waitUntil:'domcontentloaded'});
  await page.locator('#preview h2').first().waitFor();
  for(const item of items){
   await page.selectOption('#course',String(item.id));
   assert.ok(await page.locator('#preview').innerText().then(t=>/Привет|Добро пожаловать/.test(t)));checks++;
   assert.equal(await page.locator('#preview button,#preview canvas,#preview iframe[src*="course-intro.html"]').count(),0);checks++;
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow '+width+' '+item.id);checks++;
   assert.equal(await page.locator('#open-course').getAttribute('href'),item.url);checks++;
  }
  await page.selectOption('#course','184095');
  if([390,1100].includes(width))await page.screenshot({path:screenshots+'/welcome-'+width+'.png',fullPage:true});
  console.log('Checked 38 greetings at '+width+'px');
 }
 await page.goto(origin+'/course-intro.html?course=184095',{waitUntil:'domcontentloaded'});
 await page.locator('#app h2').waitFor();
 assert.equal(await page.locator('.experience,.primary,canvas,input').count(),0);checks++;
 assert.equal(await page.locator('script[src*="course-intro.js"]').count(),0);checks++;
 assert.equal(errors.length,0,errors.join('; '));checks++;
 await writeFile('.local-publication/intro-welcomes-20261116/qa.json',JSON.stringify({at:new Date().toISOString(),checks,widths:[280,320,390,800,1100],screenshots,errors},null,2),{mode:0o600});
 console.log(JSON.stringify({checks,screenshots,errors}));
}finally{await browser.close();}

// Browser-only local checks. Never activate a coupon or follow a purchase link.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {variantForCourse,variants} from '../../shared/course-promotions/go-pro-max/offer.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.COURSE_PROMO_URL||'http://localhost:8814';
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin),'Local preview only');
assert.equal(variantForCourse(305666),'go');assert.equal(variantForCourse(300562),'go');assert.equal(variantForCourse(135466),'general');
assert.deepEqual(variants,{general:{discount:10,code:'GOSHECHKAMAX'},go:{discount:20,code:'GOSHECHKAMAX20'}});
const dir='.local-publication/go-max-promotion-preview';
await mkdir(dir,{recursive:true,mode:0o700});
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],reducedMotion:'reduce'});
const page=await context.newPage(),errors=[],records=[];
page.on('pageerror',error=>errors.push(error.message));
const url=audience=>origin+'/shared/course-promotions/go-pro-max/card.html?audience='+audience;
async function scratch(page){
  const r=await page.locator('#scratch').boundingBox();
  await page.mouse.move(r.x+7,r.y+8);await page.mouse.down();
  for(let y=8;y<r.height;y+=16){
    await page.mouse.move(r.x+7,r.y+y);await page.mouse.move(r.x+r.width-7,r.y+y,{steps:8});
    if(await page.locator('#copy').isVisible())break;
  }
  await page.mouse.up();await page.locator('#copy').waitFor({state:'visible'});
}
try{
  for(const audience of ['general','go'])for(const width of [280,320,358,390,520,521,720,721,1000]){
    await page.setViewportSize({width,height:600});await page.goto(url(audience));
    await page.locator('#scratch[data-painted]').waitFor();
    assert.equal(await page.locator('#copy').isHidden(),true);
    assert.equal(await page.locator('#discount').textContent(),'−'+variants[audience].discount+'%');
    const before=await page.locator('.offer').boundingBox();
    assert.ok(before.height<430,JSON.stringify({width,height:before.height}));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);
    assert.equal(await page.locator('.course-cover').evaluate(img=>img.complete&&img.naturalWidth>0),true);
    await scratch(page);
    assert.equal(await page.locator('#promo').inputValue(),variants[audience].code);
    await page.locator('#copy').click();
    await page.waitForFunction(()=>document.querySelector('#copy span').textContent==='Скопировано ✓');
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),variants[audience].code);
    assert.equal((await page.locator('.offer').boundingBox()).height,before.height,'Reveal must not change height');
    assert.equal(await page.evaluate(()=>document.getAnimations().some(a=>a.playState==='running')),false,'Reduced motion');
    records.push({audience,width,height:before.height});
    if([358,1000].includes(width))await page.screenshot({path:dir+'/'+audience+'-'+width+'-revealed.png'});
  }
  await page.goto(url('go'));await page.locator('#scratch').press('Enter');
  assert.equal(await page.locator('#copy').evaluate(el=>el===document.activeElement),true);
  const denied=await context.newPage();
  await denied.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(Error('Denied'))}});document.execCommand=()=>false;});
  await denied.goto(url('general'));await denied.locator('#scratch').press('Space');await denied.locator('#copy').click();
  assert.equal(await denied.locator('#promo').evaluate(el=>el.selectionStart===0&&el.selectionEnd===el.value.length),true);
  assert.ok(!(await denied.locator('#status').textContent()).includes('Скопировано'));
  await denied.close();
  const touch=await browser.newContext({viewport:{width:358,height:600},isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce'});
  const touchPage=await touch.newPage();await touchPage.goto(url('go'));await touchPage.locator('#scratch[data-painted]').waitFor();
  const r=await touchPage.locator('#scratch').boundingBox(),cdp=await touch.newCDPSession(touchPage);
  for(let y=10;y<r.height&&await touchPage.locator('#copy').isHidden();y+=16){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+5,y:r.y+y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width-5,y:r.y+y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await touchPage.locator('#copy').waitFor({state:'visible',timeout:5000});await touch.close();
  for(const discount of [10,20])for(const width of [280,288,320,358,390,520,521,640,720,721,800,1024]){
    await page.setViewportSize({width,height:400});await page.goto(origin+'/shared/course-promotions/go-pro-max/offer-'+discount+'.html');
    await page.locator('#scratch[data-painted]').waitFor();
    const metrics=await page.evaluate(()=>({height:document.querySelector('.offer').getBoundingClientRect().height,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight}));
    assert.equal(metrics.height,400,JSON.stringify({width,discount,...metrics}));
    assert.ok(metrics.x<=1&&metrics.y<=1,JSON.stringify({width,discount,...metrics}));
    assert.equal(await page.locator('#discount').textContent(),'−'+discount+'%');
  }
  const noJS=await browser.newContext({javaScriptEnabled:false});const staticPage=await noJS.newPage();
  await staticPage.goto(origin+'/shared/course-promotions/go-pro-max/offer-20.html');
  assert.equal(await staticPage.locator('#discount').textContent(),'−20%');
  assert.equal(await staticPage.locator('#promo').inputValue(),'GOSHECHKAMAX20');await noJS.close();
  for(const width of [1280,390,320]){
    await page.setViewportSize({width,height:1000});await page.goto(origin);
    await page.locator('#course option').first().waitFor({state:'attached'});
    for(const course of ['135466','305666','300562']){
      await page.selectOption('#course',course);
      const frame=page.frameLocator('#offer-frame');
      await frame.locator('#scratch[data-painted]').waitFor();
      assert.equal(await frame.locator('#discount').textContent(),'−'+variants[variantForCourse(course)].discount+'%');
      await page.waitForFunction(()=>{const f=document.querySelector('iframe');return Math.abs(f.clientHeight-f.contentDocument.querySelector('.offer').getBoundingClientRect().height)<2;});
      assert.equal(await frame.locator('body').evaluate(()=>document.documentElement.scrollHeight>innerHeight+1),false,'Iframe overflow');
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:dir+'/preview-'+width+'.png',fullPage:true});
  }
  await page.setViewportSize({width:1000,height:600});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(url('general'));
  assert.equal(await page.evaluate(()=>document.getAnimations().some(a=>a.playState==='running')),true);
  await page.screenshot({path:dir+'/general-1000-covered.png'});
  await page.setViewportSize({width:358,height:600});await page.goto(url('go'));await page.screenshot({path:dir+'/go-358-covered.png'});
  assert.equal((await context.request.get(origin+'/.env.stepik-webhacker-session')).status(),404);
  assert.equal((await context.request.post(origin+'/api/preview-courses')).status(),405);
  assert.deepEqual(errors,[]);
  await writeFile(dir+'/checks.json',JSON.stringify({records,touch:true,keyboard:true,realClipboard:true,deniedClipboardFallback:true,iframeNoOverflow:true,stepikWrites:0,errors},null,2),{mode:0o600});
  console.log(JSON.stringify({widthCases:records.length,touch:true,keyboard:true,clipboard:true,noOverflow:true,stepikWrites:0,screenshots:dir}));
}finally{await browser.close();}

// Read-only native preview: response substitution is local to this browser.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {heightFor} from '../go-pro-max-introduction/config.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const folder='courses/305734-go-pro-max/promo';
const base='https://zak618.github.io/stepik-course-pages/';
const version='go-max-promo-20261120-1';
const token=JSON.parse(await readFile('.env.stepik-webhacker-session','utf8')).access_token;
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const context=await browser.newContext({reducedMotion:'reduce',bypassCSP:true,serviceWorkers:'block'});
await context.route(base+folder+'/**',async route=>{
  const file=new URL(route.request().url()).pathname.split('/').pop();
  assert.ok(['embed.html','styles.css','interactions.js'].includes(file));
  await route.fulfill({body:await readFile(folder+'/'+file),contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html'});
});
await context.route('https://stepik.org/api/**',async route=>{
  if(route.request().method()!=='GET')return route.abort();
  const response=await route.fetch({headers:{...route.request().headers(),authorization:'Bearer '+token}});
  if(new URL(route.request().url()).pathname.includes('/courses')){
    const data=await response.json();
    for(const course of data.courses||[])if(course.id===305734)course.description='<iframe src="'+base+folder+'/embed.html?v='+version+'" width="100%" height="12000" style="border:0;width:100%;height:12000px;"></iframe>';
    return route.fulfill({response,json:data});
  }
  return route.fulfill({response});
});
const page=await context.newPage();
try{
  await page.goto('https://stepik.org/course/305734/promo',{waitUntil:'domcontentloaded',timeout:60000});
  const element=page.locator('iframe[src*="'+folder+'/embed.html"]');
  await element.waitFor({timeout:45000});
  const frame=await(await element.elementHandle()).contentFrame();
  await frame.locator('h1').waitFor();
  const art=await context.newPage();
  await art.goto(base+folder+'/embed.html?v='+version);
  await art.locator('h1').waitFor();
  const widths=[320,360,390,430,480,540,600,640,700,760,768,800,900,1000,1024,1100,1200,1280,1366,1440,1600];
  const samples=[];
  async function measure(width){
    await page.setViewportSize({width,height:1000});await page.waitForTimeout(230);
    // Chrome defers offscreen cross-origin frame resize. Measure its native box,
    // then render the same asset in a top-level tab at that exact content width.
    const frameWidth=await element.evaluate(element=>element.clientWidth);
    await art.setViewportSize({width:frameWidth,height:1000});await art.waitForTimeout(80);
    const result=await art.evaluate(()=>({frameWidth:innerWidth,height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+16,x:document.documentElement.scrollWidth-innerWidth}));
    assert.ok(result.x<=1,'Horizontal overflow '+width);
    return {width,...result};
  }
  for(const width of widths)samples.push(await measure(width));
  console.log(JSON.stringify(samples));
  // Refine text-wrapping and breakpoint changes; endpoint maximum prevents clipping.
  for(let pass=0;pass<7;pass++){
    const additions=[];
    for(let i=1;i<samples.length;i++){
      const a=samples[i-1],b=samples[i];
      if(b.width-a.width>1 && Math.abs(a.height-b.height)>55)additions.push(Math.floor((a.width+b.width)/2));
    }
    if(!additions.length)break;
    for(const width of additions)samples.push(await measure(width));
    samples.sort((a,b)=>a.width-b.width);
  }
  const envelope=samples.map((sample,i)=>({...sample,height:Math.max(sample.height,samples[i-1]?.height||0,samples[i+1]?.height||0)}));
  // Keep abrupt responsive changes exact rather than averaging across a breakpoint.
  for(let i=1;i<samples.length;i++)if(samples[i].width-samples[i-1].width<=2){envelope[i-1].height=samples[i-1].height;envelope[i].height=samples[i].height;}
  const height=heightFor(envelope);
  const description='<div style="font-size:0;margin:0;"><iframe height="'+Math.max(...envelope.map(s=>s.height))+'" src="'+base+folder+'/embed.html?v='+version+'" style="border:0;width:100%;height:'+height+';margin:0;background:#fff;" width="100%"></iframe></div>';
  await writeFile(folder+'/publication.json',JSON.stringify({course:305734,version,samples,envelope,description},null,2));
  console.log('Native responsive layout measured; Stepik writes: 0');
}finally{await context.unrouteAll({behavior:'ignoreErrors'});await browser.close();}

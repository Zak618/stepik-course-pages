import assert from 'node:assert/strict';
const origin=process.env.STEPIK_FUNCTIONS_URL||'http://localhost:8779';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/stepik-v2-tools-M279ew/node_modules/playwright-core/index.mjs');
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
const p=await b.newPage({viewport:{width:1024,height:1100},reducedMotion:'reduce',bypassCSP:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
const open=async step=>{await p.goto(origin+'/functions?step='+step+'&panel=scene');await p.waitForSelector('.world');};
const click=async s=>{await p.click(s);await p.waitForFunction(s=>!document.querySelector(s).disabled,s);};
let checks=0;
try{
 await open(1);await click('#extract-fold');assert.equal(await p.locator('.is-call').count(),3);checks++;
 await click('#extract-fold');assert.equal(await p.locator('.is-call').count(),0);checks++;await p.locator('#extract-fold').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>!document.querySelector('#extract-fold').disabled);assert.equal(await p.locator('.is-call').count(),3);checks++;
 await open(5);await click('#return-direct');assert.equal(await p.locator('#return-engine h3').textContent(),'showQuery(query)');await click('#return-get');assert.equal(await p.locator('#return-engine h3').textContent(),'heading(query)');assert.ok((await p.locator('.scene-code').textContent()).includes('return "Поиск: "'));checks+=3;
 await open(13);await click('#copy-call');await click('#copy-assign');await click('#copy-call');assert.equal(await p.locator('#copy-original').textContent(),'5');assert.equal(await p.locator('#copy-result').textContent(),'6');assert.ok((await p.locator('.scene-code').textContent()).includes('page := 5'));checks+=3;
 await open(10);await p.fill('#sky-count','12');await click('#sky-run');assert.equal(await p.locator('.function-star').count(),12);checks++;for(const width of [320,390,768,1024]){await p.setViewportSize({width,height:1100});await p.waitForTimeout(70);const drift=await p.evaluate(()=>{const coords=[[12,45],[28,22],[43,40],[59,18],[75,47],[88,68],[64,75],[44,67],[24,81],[8,72],[81,20],[55,49]],box=document.querySelector('#sky-stars').getBoundingClientRect();return Math.max(...[...document.querySelectorAll('.star-link')].map((e,i)=>{const[x,y]=coords[i],[nx,ny]=coords[i+1];return Math.abs(parseFloat(e.style.width)-Math.hypot((nx-x)*box.width/100,(ny-y)*box.height/100));}));});assert.ok(drift<1,'Resized sky links');checks++;}
 assert.deepEqual(errors,[]);console.log({checks,errors});
}finally{await b.close();}

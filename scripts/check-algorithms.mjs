import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.STEPIK_PREVIEW_ORIGIN||'http://localhost:8768';
const screenshots=await mkdtemp('/tmp/stepik-algorithms-');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));let checks=0;
const equal=(a,b)=>{assert.equal(a,b);checks++;};
const text=selector=>page.locator(selector).textContent().then(s=>s.trim());
async function go(n,panel=false){await page.goto(`${origin}/go-mini-module-02-lesson-02-step-${String(n).padStart(2,'0')}.html${panel?'?panel=scene':''}`);await page.locator('.algorithm-scene').waitFor();}
async function submitQuiz(value){if(await page.locator('#quiz-number').count())await page.locator('#quiz-number').fill(value);else if(value!==null)await page.locator(`[name=answer][value="${value}"]`).check();await page.locator('#quiz-form').evaluate(f=>f.requestSubmit());}
async function setOrder(host,keys){for(let target=0;target<keys.length;target++){let index=(await page.locator(host+' li').evaluateAll(nodes=>nodes.map(n=>n.dataset.command))).indexOf(keys[target]);while(index>target){await page.locator(`${host} [data-move="${keys[target]}"][data-direction="-1"]`).click();index--;}}}
try{
  await go(1);equal(await page.locator('.search-lab').getAttribute('data-position'),'0');await page.locator('#trace-run').click();equal(await page.locator('.trace-record.matching').count(),2);equal(await page.locator('#trace-results p').count(),2);
  await page.locator('#trace-time').fill('3');equal(await page.locator('.trace-record.inspected').count(),2);equal(await page.locator('#trace-results p').count(),1);
  for(const [q,count]of[['ЦИКЛ',2],['функц',1],['пицца',0],['<img src=x>',0]]){await page.locator('#trace-query').fill(q);await page.locator('#trace-form').evaluate(f=>f.requestSubmit());equal(await page.locator('#trace-results p').count(),count);}
  equal(await page.locator('.search-lab img').count(),0);await page.locator('#trace-query').fill(' ');await page.locator('#trace-run').click();assert.match(await text('#trace-status'),/Введите тему/);checks++;
  await go(2);await page.locator('#coffee-run').click();equal(await page.locator('.coffee-stage.spilled').count(),1);assert.match(await text('#coffee-status'),/поддон/);checks++;
  await setOrder('#coffee-editor',['cup','serve','pour']);await page.locator('#coffee-run').click();assert.match(await text('#coffee-status'),/не наполнен/);checks++;
  await setOrder('#coffee-editor',['cup','pour','serve']);await page.locator('#coffee-run').click();equal(await page.locator('#coffee-stage').getAttribute('data-cup'),'served');equal(await page.locator('.coffee-stage.filled').count(),1);equal(await page.locator('.coffee-stage.spilled').count(),0);
  await page.locator('#coffee-reset').click();equal(await page.locator('#coffee-stage').getAttribute('data-cup'),'side');
  await go(3);await submitQuiz(null);equal(await page.locator('#quiz-feedback').getAttribute('data-result'),'empty');await submitQuiz('1');equal(await page.locator('#quiz-feedback').getAttribute('data-result'),'retry');await submitQuiz('0');equal(await page.locator('#quiz-feedback').getAttribute('data-result'),'success');
  await go(4);await page.locator('#branch-run').click();equal(await page.locator('.branch-lab').getAttribute('data-phase'),'done');equal(await page.locator('.glass-milk').evaluate(n=>getComputedStyle(n).opacity),'1');
  await page.locator('[name=milk][value=no]').check();await page.locator('#branch-run').click();equal(await page.locator('.glass-milk').evaluate(n=>getComputedStyle(n).opacity),'0');assert.match(await text('#branch-status'),/чёрный кофе/);checks++;
  await go(5);for(const count of [0,1,3,6]){await page.locator('#loop-count').fill(String(count));await page.locator('#loop-run').click();equal(await text('#loop-ready'),String(count));equal(await text('#loop-checks'),String(count+1));equal(await page.locator('.cup-slot.ready').count(),count);equal(await page.locator('#loop-next').isDisabled(),true);}
  await page.locator('#loop-count').fill('1');await page.locator('#loop-next').click();equal(await text('#loop-checks'),'1');equal(await text('#loop-ready'),'0');await page.locator('#loop-next').click();equal(await page.locator('.cup-slot.filling').count(),1);await page.locator('#loop-next').click();equal(await text('#loop-ready'),'1');await page.locator('#loop-next').click();equal(await text('#loop-checks'),'2');equal(await page.locator('#loop-next').isDisabled(),true);
  await go(6);for(const [answer,result]of[['','empty'],['3','retry'],['four','retry'],['4','success']]){await submitQuiz(answer);equal(await page.locator('#quiz-feedback').getAttribute('data-result'),result);}
  await go(7);await page.locator('#debug-run').click();equal(await text('#debug-current'),'1');equal(await text('#debug-checks'),'3');equal(await text('#debug-found'),'3');assert.match(await text('#debug-status'),/Показ на паузе/);checks++;
  await page.locator('#debug-fix').check();await page.locator('#debug-run').click();equal(await text('#debug-current'),'—');equal(await text('#debug-checks'),'4');equal(await text('#debug-found'),'2');equal(await text('#debug-badge'),'Завершён');
  await go(8);await page.locator('#assemble-run').click();equal(await page.locator('.test-case[data-result=success]').count(),0);await setOrder('#find-editor',['input','empty','init','loop','match','show']);await page.locator('#assemble-run').click();equal(await page.locator('.test-case[data-result=success]').count(),4);assert.match(await text('[data-case="2"] p'),/Записи не проверяем/);checks++;
  for(const order of [['input','init','empty','loop','match','show'],['init','input','empty','loop','match','show']]){await setOrder('#find-editor',order);await page.locator('#assemble-run').click();equal(await page.locator('.test-case[data-result=success]').count(),4);}
  await go(9);await submitQuiz('0');equal(await page.locator('#quiz-feedback').getAttribute('data-result'),'retry');await submitQuiz('1');equal(await page.locator('#quiz-feedback').getAttribute('data-result'),'success');
  // Full-width and iframe-only versions have the same real controls and data.
  for(const width of [320,390,650,768,1280])for(let n=1;n<=9;n++){
    await page.setViewportSize({width,height:1000});await go(n);
    if(n===1)await page.locator('#trace-run').click();
    if(n===2){await setOrder('#coffee-editor',['cup','pour','serve']);await page.locator('#coffee-run').click();}
    if(n===4)await page.locator('#branch-run').click();
    if(n===5){await page.locator('#loop-count').fill('6');await page.locator('#loop-run').click();}
    if(n===7){await page.locator('#debug-fix').check();await page.locator('#debug-run').click();}
    if(n===8){await setOrder('#find-editor',['input','empty','init','loop','match','show']);await page.locator('#assemble-run').click();}
    equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    equal(await page.locator('iframe').count(),0);
    assert.ok(await page.locator('.story').last().evaluate(n=>getComputedStyle(n).fontSize).then(s=>parseFloat(s)>=18));checks++;
    const gaps=await page.locator('.algorithm-flow').evaluate(flow=>{const blocks=[...flow.children];return blocks.slice(1).map((node,i)=>node.getBoundingClientRect().top-blocks[i].getBoundingClientRect().bottom);});assert.ok(gaps.every(gap=>gap>=0&&gap<=64),`Unexpected blank gap on step ${n}/${width}: ${gaps}`);checks++;
    const bounds=await page.locator('.lab-status').count()?await page.locator('.lab-status').evaluate(n=>({a:n.getBoundingClientRect().right,b:n.closest('.algorithm-scene').getBoundingClientRect().right})):null;if(bounds){assert.ok(bounds.a<=bounds.b+1);checks++;}
    if([390,1280].includes(width))await page.locator('.algorithm-scene').screenshot({path:`${screenshots}/step${n}-${width}.png`});
    await go(n,true);equal(await page.locator('.story').count(),0);equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  // Animation cancellation, repair during playback, and finite completion.
  await page.setViewportSize({width:1280,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
  await go(4);await page.locator('#branch-run').click();await page.waitForTimeout(650);await page.locator('[name=milk][value=no]').check();await page.waitForTimeout(1900);equal(await page.locator('.branch-lab').getAttribute('data-phase'),'ready');equal(await page.locator('.glass-milk').evaluate(n=>getComputedStyle(n).opacity),'0');
  await page.locator('#branch-run').click();await page.waitForFunction(()=>document.querySelector('.branch-lab').dataset.phase==='done');await page.locator('.algorithm-scene').screenshot({path:screenshots+'/branch-done.png'});
  await go(5);await page.locator('#loop-run').click();await page.waitForTimeout(700);await page.locator('#loop-count').fill('0');await page.waitForTimeout(800);equal(await text('#loop-ready'),'0');equal(await text('#loop-checks'),'0');
  await go(7);await page.locator('#debug-run').click();await page.waitForTimeout(350);await page.locator('#debug-stop').click();const before=await text('#debug-checks');await page.waitForTimeout(1200);equal(await text('#debug-checks'),before);equal(await text('#debug-badge'),'Пауза');
  await page.goto(origin+'/algorithms#01');await page.locator('#trace-run').click();await page.locator('#algorithm-nav a[href="#02"]').click();await page.locator('#coffee-run').waitFor();await page.waitForTimeout(1000);equal(await page.locator('#coffee-run').count(),1);equal(await page.locator('#algorithm-nav a[aria-current=step]').getAttribute('href'),'#02');
  await page.setViewportSize({width:390,height:1000});await page.selectOption('#algorithm-picker','08');await page.locator('#assemble-run').waitFor();equal(new URL(page.url()).hash,'#08');await page.setViewportSize({width:1440,height:1050});await page.locator('#algorithm-phone').click();equal(await page.locator('#algorithm-lesson').evaluate(n=>Math.round(n.getBoundingClientRect().width)),390);
  const native=JSON.parse(await readFile('.local-publication/algorithms-tasks.json','utf8'));equal(native.localOnly,true);equal(native.tasks.reduce((sum,t)=>sum+t.cost,0),30);equal(native.tasks.map(t=>t.block.name).join(','),'choice,number,choice');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors,screenshots},null,2));
}finally{await browser.close();}

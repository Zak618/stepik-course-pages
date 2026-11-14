import assert from 'node:assert/strict';
export const origin=process.env.STEPIK_PREVIEW_ORIGIN||'http://localhost:8768';
export const file=n=>`go-mini-module-02-lesson-02-step-${String(n).padStart(2,'0')}.html`;
export const browserOptions={executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']};
export async function closeDialogs(page){for(const d of await page.locator('dialog[open]').all())await d.locator('button').last().click();}
export async function setOrder(page,host,keys){for(let target=0;target<keys.length;target++){let index=(await page.locator(host+' li').evaluateAll(nodes=>nodes.map(n=>n.dataset.command))).indexOf(keys[target]);while(index>target){await page.locator(`${host} [data-move="${keys[target]}"][data-direction="-1"]`).click();index--;}}}
export async function exercise(page,step,check){
  if(step===1){
    for(const [query,count]of[['цикл',2],['функц',1],['и',4],['пицца',0],['А'.repeat(50),0],['',0]]){
      await page.locator('#trace-query').fill(query);await page.locator('#trace-form').evaluate(f=>f.requestSubmit());assert.equal(await page.locator('#trace-results p').count(),count);await check('query-'+(query||'empty'));
      if(query==='и'){await page.locator('#trace-open-results').click();await check('four-results-dialog');await closeDialogs(page);}
    }
    await page.locator('#trace-query').fill('цикл');for(let i=0;i<=6;i++){await page.locator('#trace-time').fill(String(i));await check('trace-'+i);}
  }
  if(step===2){
    await page.locator('#coffee-run').click();await check('spill');
    await setOrder(page,'#coffee-editor',['cup','serve','pour']);await page.locator('#coffee-run').click();await check('empty-cup');
    await setOrder(page,'#coffee-editor',['cup','pour','serve']);await page.locator('#coffee-run').click();assert.equal(await page.locator('#coffee-stage').getAttribute('data-cup'),'served');await check('served');
  }
  if(step===4){for(const milk of ['no','yes']){await page.locator(`[name=milk][value=${milk}]`).check();await page.locator('#branch-run').click();assert.equal(await page.locator('.branch-lab').getAttribute('data-phase'),'done');await check('milk-'+milk);}}
  if(step===5){
    for(const count of [0,1,3,6]){await page.locator('#loop-count').fill(String(count));await check('ordered-'+count);await page.locator('#loop-run').click();assert.equal(await page.locator('#loop-checks').textContent(),String(count+1));await check('prepared-'+count);}
    await page.locator('#loop-count').fill('1');for(let i=0;i<4;i++){await page.locator('#loop-next').click();await check('loop-step-'+i);}
  }
  if(step===7){await page.locator('#debug-run').click();await check('broken');await page.locator('#debug-fix').check();await page.locator('#debug-run').click();assert.equal(await page.locator('#debug-found').textContent(),'2');await check('fixed');}
  if(step===8){
    await page.locator('#assemble-run').click();await check('invalid-order');
    for(const order of [['input','empty','init','loop','match','show'],['input','init','empty','loop','match','show'],['init','input','empty','loop','match','show']]){
      await setOrder(page,'#find-editor',order);await page.locator('#assemble-run').click();await page.locator('dialog[open]').waitFor();assert.equal(await page.locator('.test-case[data-result=success]').count(),4);await check('cases-dialog');await closeDialogs(page);await check('valid-order');
    }
  }
}

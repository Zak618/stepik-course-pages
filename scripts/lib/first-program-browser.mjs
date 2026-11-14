import assert from 'node:assert/strict';
export const origin=process.env.STEPIK_FIRST_PROGRAM_ORIGIN||'http://localhost:8769';
export const file=n=>`go-mini-module-03-lesson-01-step-${String(n).padStart(2,'0')}.html`;
export const browserOptions={executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']};
export const frameSteps=[1,2,4,5,7];
export async function exercise(page,step,check){
  const run=async selector=>{await page.locator(selector).click();await page.waitForFunction(s=>!document.querySelector(s).disabled,selector);};
  if(step===1){
    for(const text of ['Привет, Go!','Новая версия','W'.repeat(24),'👋'.repeat(12)]){await page.locator('#greeting').fill(text);await run('#greeting-run');assert.equal(await page.locator('#greeting-output').textContent(),text+'\n');await check('greeting-'+text.length);}
    await page.locator('#greeting-reset').click();await check('reset');
  }
  if(step===2){
    for(let i=0;i<=4;i++){await page.locator('#model-time').fill(String(i));await check('stage-'+i);}await page.locator('#model-edit').click();await check('changed-source');await page.locator('#model-rebuild').click();await check('rebuilt');await page.locator('#model-next').click();await check('new-output');
  }
  if(step===4){
    for(const part of ['package','import','main','call','brace']){await page.locator(`[data-part=${part}]`).click();await check('part-'+part);}
    await page.locator('#anatomy-remove').check();await run('#anatomy-run');await check('missing-import');await page.locator('#anatomy-remove').uncheck();await run('#anatomy-run');await check('import-restored');
  }
  if(step===5){
    await run('#print-run');await check('printed');await page.locator('#print-newlines').check();await check('newlines');
    for(let i=0;i<3;i++){const kind=await page.locator(`[data-index="${i}"][data-kind]`).getAttribute('data-kind');if(kind!=='Println')await page.locator(`[data-index="${i}"][data-kind]`).click();}await run('#print-run');await check('three-lines');
    await page.locator('[data-print-move="2"][data-dir="-1"]').click();await run('#print-run');await check('reordered');
  }
  if(step===7){
    for(let i=0;i<3;i++){await page.locator(`[data-bug="${i}"]`).click();await run('#debug-run');await check('error-'+i);await page.locator('#debug-hint').click();await check('hint-'+i);await page.locator('#debug-source').fill('package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Привет, Go!")\n}\n');await run('#debug-run');assert.equal(await page.locator('#debug-indicator').getAttribute('data-solved'),'true');await check('fixed-'+i);}
  }
}

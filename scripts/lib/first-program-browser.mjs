import assert from 'node:assert/strict';
export const origin=process.env.STEPIK_FIRST_PROGRAM_ORIGIN||'http://localhost:8769';
export const file=n=>`go-mini-module-03-lesson-01-step-${String(n).padStart(2,'0')}.html`;
export const browserOptions={executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']};
export const frameSteps=[1,2,4,5,7];
export function sceneGeometry(){
  const root=document.querySelector('main'),scene=root.querySelector('.scene');let inkBottom=0;
  const walker=document.createTreeWalker(scene,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const text=walker.currentNode,parent=text.parentElement;if(!text.textContent.trim()||parent.closest('dialog,.sr-only,[hidden],script,style,textarea'))continue;
    const style=getComputedStyle(parent);if(style.visibility==='hidden'||style.opacity==='0'||!parent.getClientRects().length)continue;
    const range=document.createRange();range.selectNodeContents(text);for(const rect of range.getClientRects())if(rect.width&&rect.height)inkBottom=Math.max(inkBottom,rect.bottom);
  }
  for(const element of scene.querySelectorAll('button,input,textarea,select'))if(!element.closest('dialog,[hidden]')&&element.getClientRects().length)inkBottom=Math.max(inkBottom,element.getBoundingClientRect().bottom);
  return{height:innerHeight,main:Math.ceil(root.getBoundingClientRect().height),bottom:root.getBoundingClientRect().bottom,inkBottom,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,overflow:[...root.querySelectorAll('.lab-status,.anatomy-explanation,.printer-paper,.code-window pre')].filter(n=>n.scrollHeight>n.clientHeight+1).map(n=>n.className)};
}
async function closeDialogs(page){for(const dialog of await page.locator('dialog[open]').all())await dialog.locator('button[aria-label="Закрыть"]').click();}
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
    await page.locator('#anatomy-remove').check();await check('import-disabled');await run('#anatomy-run');await check('missing-import');await closeDialogs(page);await check('error-closed');await page.locator('#anatomy-remove').uncheck();await run('#anatomy-run');await check('import-restored');
  }
  if(step===5){
    await run('#print-run');await check('printed');await page.locator('#print-newlines').check();await check('newlines');
    for(let i=0;i<3;i++){const kind=await page.locator(`[data-index="${i}"][data-kind]`).getAttribute('data-kind');if(kind!=='Println')await page.locator(`[data-index="${i}"][data-kind]`).click();}await run('#print-run');await check('three-lines');
    await page.locator('[data-print-move="2"][data-dir="-1"]').click();await run('#print-run');await check('reordered');
  }
  if(step===7){
    for(let i=0;i<3;i++){await page.locator(`[data-bug="${i}"]`).click();await run('#debug-run');await check('error-'+i);await closeDialogs(page);await check('error-closed-'+i);await page.locator('#debug-hint').click();await check('hint-'+i);await closeDialogs(page);await check('hint-closed-'+i);await page.locator('#debug-source').fill('package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Привет, Go!")\n}\n');await run('#debug-run');assert.equal(await page.locator('#debug-indicator').getAttribute('data-solved'),'true');await check('fixed-'+i);}
  }
}

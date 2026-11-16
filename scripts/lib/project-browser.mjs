export const origin=process.env.STEPIK_PROJECT_URL||'http://localhost:8785';
export const version='project-20261115-publish-1';
export const target={course:305666,lesson:2706569,unit:2746584,account:647088271,title:'Итоговый проект'};
export const frameSteps=[1,3,6,9,11];
export const filename=n=>`courses/305666-go-mini/modules/06-project/lesson-01-step-${String(n).padStart(2,'0')}.html`;
export const files=['courses/305666-go-mini/modules/06-project/lesson-01-preview.html',...Array.from({length:12},(_,i)=>filename(i+1)),...['.css','-embed.css','.js','-content.js','-worlds.js'].map(s=>'assets/go-mini-project'+s),'assets/go-mini-conditions.css'];
export const browserOptions={executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']};
export function geometry(){
 const scene=document.querySelector('.world');let bottom=0;const walker=document.createTreeWalker(scene,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const t=walker.currentNode,p=t.parentElement;if(!t.textContent.trim()||p.closest('[hidden],script,style,svg,textarea,dialog')||!p.getClientRects().length||getComputedStyle(p).visibility==='hidden'||getComputedStyle(p).clipPath==='inset(50%)')continue;const range=document.createRange();range.selectNodeContents(t);for(const r of range.getClientRects())if(r.height&&r.width)bottom=Math.max(bottom,r.bottom);}
 for(const el of scene.querySelectorAll('button,input,select,textarea'))if(!el.closest('[hidden],dialog')&&el.getClientRects().length)bottom=Math.max(bottom,el.getBoundingClientRect().bottom);
 const buttons=[...scene.querySelectorAll('button')].filter(e=>e.getClientRects().length);
 let stageGap=0;for(const stage of scene.querySelectorAll('.extract-workbench,.plug-board,.return-routing,.execution-building,.copy-workshop,.return-corridor,.fn-find-machine')){const r=stage.getBoundingClientRect(),intervals=[...stage.children].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect()).sort((a,b)=>a.top-b.top);let end=r.top;for(const rect of intervals){stageGap=Math.max(stageGap,rect.top-end);end=Math.max(end,rect.bottom);}stageGap=Math.max(stageGap,r.bottom-end);}
 return{width:scene.getBoundingClientRect().width,sceneBottom:scene.getBoundingClientRect().bottom,inkBottom:bottom,stageGap,buttons:buttons.length,primaryButtons:buttons.filter(e=>!e.classList.contains('secondary')).length,viewport:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,clipped:[...scene.querySelectorAll('.scene-code,.fn-port,.fn-value,.code-strip')].filter(el=>el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2).map(el=>el.className)};
}
export async function exercise(page,n,measure){
 const click=async()=>{await page.click('.project-primary');await page.waitForFunction(()=>!document.querySelector('.project-primary').disabled);await measure('action');};
 if(n===1){await click();await page.selectOption('#desk-command','3');await click();await page.selectOption('#desk-command','1');await click();if(await page.locator('.reply-open').count()){await page.click('.reply-open');await measure('full reply dialog');await page.locator('.project-reply-dialog button').click();}await page.selectOption('#desk-command','2');await page.fill('#desk-value',' ');await click();await page.fill('#desk-value','Go');await click();await page.selectOption('#desk-command','3');await click();await page.selectOption('#desk-command','0');await click();await click();await page.selectOption('#desk-command','3');await page.fill('#desk-value','Щ'.repeat(32));await click();}
 if(n===3){for(const value of['Go','Циклы','нет',' ']){await page.fill('#search-value',value);await click();}}
 if(n===6){for(const value of['2','1','кот','0']){await page.fill('#route-command',value);await click();}await click();}
 if(n===9){await click();await click();await page.fill('#memory-title',' ');await click();await page.fill('#memory-title','Щ'.repeat(32));await click();if(await page.locator('.reply-open').count()){await page.click('.reply-open');await measure('full reply dialog');await page.locator('.project-reply-dialog button').click();}}
 if(n===11){for(let i=0;i<8;i++)await click();}
}

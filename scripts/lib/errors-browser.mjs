export const origin=process.env.STEPIK_ERRORS_URL||'http://localhost:8783';
export const version='errors-20261115-publish-1';
export const target={course:305666,lesson:2706568,unit:2746583,account:647088271,title:'Ошибки и проверка ввода'};
export const frameSteps=[1,3,6,9,12,15,17,19];
export const filename=n=>`courses/305666-go-mini/modules/05-functions-and-data/lesson-03-step-${String(n).padStart(2,'0')}.html`;
export const files=['courses/305666-go-mini/modules/05-functions-and-data/lesson-03-preview.html',...Array.from({length:22},(_,i)=>filename(i+1)),...['.css','-embed.css','.js','-content.js','-worlds.js'].map(s=>'assets/go-mini-errors'+s),'assets/go-mini-conditions.css'];
export const browserOptions={executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']};
export function geometry(){
 const scene=document.querySelector('.world');let bottom=0;const walker=document.createTreeWalker(scene,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const t=walker.currentNode,p=t.parentElement;if(!t.textContent.trim()||p.closest('[hidden],script,style,svg,textarea')||!p.getClientRects().length||getComputedStyle(p).visibility==='hidden'||getComputedStyle(p).clipPath==='inset(50%)')continue;const range=document.createRange();range.selectNodeContents(t);for(const r of range.getClientRects())if(r.height&&r.width)bottom=Math.max(bottom,r.bottom);}
 for(const el of scene.querySelectorAll('button,input,select,textarea'))if(!el.closest('[hidden]')&&el.getClientRects().length)bottom=Math.max(bottom,el.getBoundingClientRect().bottom);
 const buttons=[...scene.querySelectorAll('button')].filter(e=>e.getClientRects().length);
 let stageGap=0;for(const stage of scene.querySelectorAll('.extract-workbench,.plug-board,.return-routing,.execution-building,.copy-workshop,.return-corridor,.fn-find-machine')){const r=stage.getBoundingClientRect(),intervals=[...stage.children].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect()).sort((a,b)=>a.top-b.top);let end=r.top;for(const rect of intervals){stageGap=Math.max(stageGap,rect.top-end);end=Math.max(end,rect.bottom);}stageGap=Math.max(stageGap,r.bottom-end);}
 return{width:scene.getBoundingClientRect().width,sceneBottom:scene.getBoundingClientRect().bottom,inkBottom:bottom,stageGap,buttons:buttons.length,primaryButtons:buttons.filter(e=>!e.classList.contains('secondary')).length,viewport:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,clipped:[...scene.querySelectorAll('.scene-code,.fn-port,.fn-value,.code-strip')].filter(el=>el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2).map(el=>el.className)};
}
export async function exercise(page,n,measure){
 const click=async s=>{await page.click(s);await page.waitForFunction(s=>!document.querySelector(s).disabled,s);await measure(s);};
 if(n===1){await click('#clean-run');for(const value of['  первые  команды  ','Go'.repeat(20),' '.repeat(40)]){await page.fill('#clean-input',value);await click('#clean-run');}}
 if(n===3){for(const value of['12','кот','0','9999999999999999999999999999999999999999']){await page.fill('#machine-input',value);await click('#machine-run');}}
 if(n===6){await click('#lift-run');await page.fill('#lift-input','9');await click('#lift-run');await page.fill('#lift-input','два');await click('#lift-run');}
 if(n===9){for(let i=0;i<4;i++)await click('#mail-run');await page.selectOption('#mail-mode','broken');await click('#mail-run');await click('#mail-run');}
 if(n===12){await click('#belt-run');await page.selectOption('#belt-mode','continue');await click('#belt-run');}
 if(n===15){for(const value of['compile','runtime','logic']){await page.selectOption('#workshop-case',value);await click('#workshop-run');}}
 if(n===17){await click('#bakery-run');await page.fill('#bakery-input','9');await click('#bakery-run');await page.fill('#bakery-input','две');await click('#bakery-run');}
 if(n===19){await click('#find-run');await page.fill('#find-number','9');await click('#find-run');await page.fill('#find-query',' ');await click('#find-run');}
}

export const origin=process.env.STEPIK_FUNCTIONS_URL||'http://localhost:8779';
export const version='functions-20261115-compact-3';
export const target={course:305666,lesson:2706566,unit:2746581,account:647088271,title:'Функции'};
export const frameSteps=[1,3,5,7,10,13,15,19];
export const filename=n=>`courses/305666-go-mini/modules/05-functions-and-data/lesson-01-step-${String(n).padStart(2,'0')}.html`;
export const files=['courses/305666-go-mini/modules/05-functions-and-data/lesson-01-preview.html',...Array.from({length:22},(_,i)=>filename(i+1)),...['.css','-embed.css','.js','-content.js','-worlds.js'].map(s=>'assets/go-mini-functions'+s),'assets/go-mini-conditions.css'];
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
 if(n===1){await page.fill('#extract-title','Поиск готов');await click('#extract-run');await click('#extract-fold');await click('#extract-run');}
 if(n===3){await click('#arg-send');await click('#arg-swap');await click('#arg-send');}
 if(n===5){await click('#return-get');await click('#return-show');await page.fill('#return-query','Go');await click('#return-direct');}
 if(n===7){await click('#trace-play');await page.fill('#trace-position','0');await measure('rewind');await page.fill('#trace-position','5');await measure('second call');}
 if(n===10){await page.fill('#sky-count','12');await click('#sky-run');await page.fill('#sky-count','0');await click('#sky-run');}
 if(n===13){await click('#copy-call');await click('#copy-assign');}
 if(n===15){await click('#early-run');await page.fill('#early-query','');await click('#early-run');}
 if(n===19){await click('#find-run');await page.fill('#find-query','');await click('#find-run');}
}

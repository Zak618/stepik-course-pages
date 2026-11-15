export const origin=process.env.STEPIK_SLICES_URL||'http://localhost:8781';
export const version='slices-20261115-compact-2';
export const target={course:305666,lesson:2706567,unit:2746582,account:647088271,title:'Срезы и обработка данных'};
export const frameSteps=[1,3,5,7,10,13,15,19];
export const filename=n=>`go-mini-module-05-lesson-02-step-${String(n).padStart(2,'0')}.html`;
export const files=['go-mini-module-05-lesson-02-preview.html',...Array.from({length:22},(_,i)=>filename(i+1)),...['.css','-embed.css','.js','-content.js','-worlds.js'].map(s=>'assets/go-mini-slices'+s),'assets/go-mini-conditions.css'];
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
 if(n===1){await click('#library-run');await click('#library-run');}
 if(n===3){await page.fill('#jukebox-dial','4');await click('#jukebox-play');}
 if(n===5){await click('#append-add');await click('#append-add');await click('#append-clear');}
 if(n===7){for(let i=0;i<4;i++)await click('#courier-next');await page.check('#courier-empty');await measure('empty');}
 if(n===10){await click('#camera-action');await click('#camera-action');}
 if(n===13){await click('#garden-run');await page.fill('#garden-query','');await click('#garden-run');}
 if(n===15){await click('#film-write');await page.fill('#film-low','5');await measure('empty');await page.fill('#film-low','0');await measure('all');}
 if(n===19){await click('#find-run');await page.fill('#find-query','');await click('#find-run');}
}

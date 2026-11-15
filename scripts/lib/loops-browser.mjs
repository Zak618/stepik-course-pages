export const origin=process.env.STEPIK_LOOPS_URL||'http://localhost:8777';
export const version='loops-20261115-publish-1';
export const target={course:305666,lesson:2706564,unit:2746579,account:647088271,title:'Циклы'};
export const frameSteps=[1,3,5,9,11,13,15,19];
export const filename=n=>`go-mini-module-04-lesson-02-step-${String(n).padStart(2,'0')}.html`;
export const files=['go-mini-module-04-lesson-02-preview.html',...Array.from({length:20},(_,i)=>filename(i+1)),...['.css','-embed.css','.js','-content.js','-worlds.js'].map(s=>'assets/go-mini-loops'+s),'assets/go-mini-conditions.css'];
export const browserOptions={executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']};
export function geometry(){
 const scene=document.querySelector('.world');let bottom=0;const walker=document.createTreeWalker(scene,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const t=walker.currentNode,p=t.parentElement;if(!t.textContent.trim()||p.closest('[hidden],script,style,svg,textarea')||!p.getClientRects().length||getComputedStyle(p).visibility==='hidden')continue;const range=document.createRange();range.selectNodeContents(t);for(const r of range.getClientRects())if(r.height&&r.width)bottom=Math.max(bottom,r.bottom);}
 for(const el of scene.querySelectorAll('button,input,select,textarea'))if(!el.closest('[hidden]')&&el.getClientRects().length)bottom=Math.max(bottom,el.getBoundingClientRect().bottom);
 return{width:scene.getBoundingClientRect().width,inkBottom:bottom,viewport:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,clipped:[...scene.querySelectorAll('.scene-code,.phase-box,.metric')].filter(el=>el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2).map(el=>el.className)};
}
export async function exercise(page,n,measure){
 const click=async s=>{await page.click(s);await page.waitForFunction(s=>!document.querySelector(s).disabled,s);await measure(s);};
 if(n===1){await page.selectOption('#ticket-count','6');await page.fill('#ticket-label','WEB HACKER');await click('#ticket-run');await page.selectOption('#ticket-count','0');await click('#ticket-run');}
 if(n===3){await page.selectOption('#mech-count','5');await click('#mech-play');await page.fill('#mech-timeline','0');await measure('rewind');await page.selectOption('#mech-count','0');await click('#mech-play');}
 if(n===5){await page.selectOption('#park-op','<=');await click('#park-run');await page.selectOption('#park-start','1');await click('#park-run');}
 if(n===9){await page.selectOption('#charge-step','10');await click('#charge-play');await click('#charge-reset');await page.check('#charge-stuck');await click('#charge-play');}
 if(n===11){await click('#stream-next');await click('#stream-next');await click('#stream-next');await click('#stream-next');await click('#stream-close');await click('#stream-next');await page.fill('#stream-input','Последняя строка без переноса');await click('#stream-close');await click('#stream-next');}
 if(n===13){for(let i=0;i<5;i++)await click('#sort-next');}
 if(n===15){await page.selectOption('#stop-mode','continue');for(let i=0;i<9;i++)await click('#stop-next');await page.selectOption('#stop-mode','three');for(let i=0;i<6;i++)await click('#stop-next');}
 if(n===19){await click('#search-run');await page.fill('#search-query','');await click('#search-run');await page.fill('#search-query','Совпадений не будет');await click('#search-run');}
}

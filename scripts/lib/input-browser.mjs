export const origin=process.env.STEPIK_INPUT_URL||'http://localhost:8773';
export const version='input-20261114-publish-1';
export const target={course:305666,lesson:2706561,unit:2746576,account:647088271,title:'Ввод данных'};
export const frameSteps=[1,3,5,7,9,11];
export const filename=n=>`courses/305666-go-mini/modules/03-go-basics/lesson-03-step-${String(n).padStart(2,'0')}.html`;
export const files=['courses/305666-go-mini/modules/03-go-basics/lesson-03-preview.html',...Array.from({length:12},(_,i)=>filename(i+1)),...['.css','-embed-v2.css','-wide.css','-replacements.js','.js','-content.js','-worlds.js'].map(s=>'assets/go-mini-input'+s)];
export const browserOptions={executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']};
export function geometry(){
 const root=document.querySelector('main'),scene=root.querySelector('.world');let inkBottom=0;
 const walker=document.createTreeWalker(scene,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const t=walker.currentNode,p=t.parentElement;if(!t.textContent.trim()||p.closest('[aria-hidden=true],[hidden],script,style,svg'))continue;const style=getComputedStyle(p);if(style.visibility==='hidden'||style.opacity==='0'||!p.getClientRects().length)continue;const range=document.createRange();range.selectNodeContents(t);for(const r of range.getClientRects())if(r.width&&r.height)inkBottom=Math.max(inkBottom,r.bottom);}
 for(const n of scene.querySelectorAll('button,input'))if(!n.closest('[hidden]')&&n.getClientRects().length)inkBottom=Math.max(inkBottom,n.getBoundingClientRect().bottom);
 const bounds=scene.getBoundingClientRect();
 const clipped=[...scene.querySelectorAll('.line-paper,.line-result,.copy-card,.scanner-device,.variable-pocket')].filter(n=>n.scrollHeight>n.clientHeight+2).map(n=>n.className);
 return {main:Math.ceil(root.getBoundingClientRect().height),width:bounds.width,inkBottom:Math.ceil(inkBottom),viewport:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,clipped};
}
export async function exercise(page,n,measure){
 const click=async(s,wait)=>{await page.locator(s).click();if(wait)await page.waitForFunction(selector=>!document.querySelector(selector).disabled,wait);await measure(s);};
 if(n===1){for(const value of ['функции','','Go 👋','W'.repeat(24)]){await page.fill('#sky-input',value);await click('#sky-send','#sky-send');}}
 if(n===3){for(const value of ['первые команды Go','','W'.repeat(24)]){await page.fill('#harbor-input',value);await click('#harbor-send','#harbor-reset');await click('#harbor-reset');}}
 if(n===5){for(let i=0;i<3;i++)await click('#machine-next','#machine-reset');await click('#machine-reset');}
 if(n===7){for(const value of ['первые команды Go','Go  👋','','42','W'.repeat(32)]){await page.fill('#train-input',value);await click('#train-send','#train-send');}}
 if(n===9){await click('#history-save');for(const value of ['функции','','W'.repeat(24)]){await page.fill('#history-input',value);await click('#history-read','#history-reset');}await click('#history-reset');}
 if(n===11){for(const value of ['первая программа','','W'.repeat(24)]){await page.fill('#find-query',value);await page.fill('#find-collection',value);await click('#find-run');await click('[data-origin=query]');}}
}

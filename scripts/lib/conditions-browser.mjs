export const origin=process.env.STEPIK_CONDITIONS_URL||'http://localhost:8775';
export const version='conditions-20261115-publish-1';
export const target={course:305666,lesson:2706562,unit:2746577,account:647088271,title:'Условия и логика'};
export const frameSteps=[1,3,5,7,10,12,14,16,19];
export const filename=n=>`courses/305666-go-mini/modules/04-control-flow/lesson-01-step-${String(n).padStart(2,'0')}.html`;
export const files=['courses/305666-go-mini/modules/04-control-flow/lesson-01-preview.html',...Array.from({length:20},(_,i)=>filename(i+1)),...['.css','-embed.css','.js','-content.js','-worlds.js'].map(s=>'assets/go-mini-conditions'+s)];
export const browserOptions={executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']};
export function geometry(){
 const scene=document.querySelector('.world');let bottom=0;const walker=document.createTreeWalker(scene,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const t=walker.currentNode,p=t.parentElement;if(!t.textContent.trim()||p.closest('[hidden],script,style,svg')||!p.getClientRects().length||getComputedStyle(p).visibility==='hidden')continue;const range=document.createRange();range.selectNodeContents(t);for(const r of range.getClientRects())if(r.height&&r.width)bottom=Math.max(bottom,r.bottom);}
 for(const el of scene.querySelectorAll('button,input,select'))if(!el.closest('[hidden]')&&el.getClientRects().length)bottom=Math.max(bottom,el.getBoundingClientRect().bottom);
 return {width:scene.getBoundingClientRect().width,main:document.querySelector('main').getBoundingClientRect().height,inkBottom:bottom,viewport:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,clipped:[...scene.querySelectorAll('pre,.floor-screen,.rule,.find-result,.terminal')].filter(el=>el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2).map(el=>el.className)};
}
export async function exercise(page,n,measure){
 const click=async s=>{await page.locator(s).click();await measure(s);};
 if(n===1){for(const op of ['==','!=','<','<=','>','>=']){await page.selectOption('#compare-op',op);await measure(op);}await page.selectOption('#compare-type','text');await measure('text');await click('#compare-same');await page.fill('#compare-a','W'.repeat(100));await measure('long text');await page.selectOption('#compare-type','number');await measure('number');}
 if(n===3){for(const v of [true,false]){await page.locator('#rail-found').setChecked(v);await click('#rail-run');await page.waitForFunction(()=>!document.querySelector('#rail-run').disabled);await measure('arrived');}}
 if(n===5){for(const v of [0,19,20,29,30,40]){await page.locator('#temp-range').fill(String(v));await measure('temp '+v);}}
 if(n===7){for(const mode of ['and','or','not']){await click(`[data-mode=${mode}]`);for(const a of [false,true])for(const b of mode==='not'?[false]:[false,true]){await page.evaluate(({a,b,mode})=>{const one=document.querySelector('#lamp-a'),two=document.querySelector('#lamp-b');if(one.getAttribute('aria-pressed')!==String(a))one.click();if(mode!=='not'&&two.getAttribute('aria-pressed')!==String(b))two.click();},{a,b,mode});await measure(`${mode}/${a}/${b}`);await click('#lamp-trace');await page.waitForFunction(()=>!document.querySelector('#lamp-trace').disabled);await measure('trace');}}}
 if(n===10){for(const floor of ['1','2','3','0','ground','?'])await click(`[data-floor="${floor}"]`);}
 if(n===12){for(const v of [0,19,20,29,30,40]){await page.locator('#priority-temp').fill(String(v));await measure('temp '+v);await click('#priority-order');await measure('other order '+v);}}
 if(n===14){for(const v of ['text','blank','none']){await page.selectOption('#scanner-preset',v);await measure(v);await click('#scanner-next');await click('#scanner-next');}}
 if(n===16){for(const query of ['Go','go','','W'.repeat(100),'Первые команды Go'])for(const mode of ['part','exact']){await page.fill('#find-query',query);await page.selectOption('#find-mode',mode);await click('#find-run');}}
 if(n===19){for(const query of ['Go','','W'.repeat(100)])for(const mode of ['part','exact','other']){await page.fill('#final-query',query);await page.selectOption('#final-mode',mode);await click('#final-run');await measure('result');}}
}

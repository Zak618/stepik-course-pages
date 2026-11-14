export const origin=process.env.STEPIK_VARIABLES_URL||'http://localhost:8771';
export const version='variables-20261114-publish-1';
export const target={course:305666,lesson:2706560,unit:2746575,account:647088271,title:'Переменные, типы и операции'};
export const frameSteps=[1,3,5,7,9,11,13];
export const filename=n=>`go-mini-module-03-lesson-02-step-${String(n).padStart(2,'0')}.html`;
export const files=['go-mini-module-03-lesson-02-preview.html',...Array.from({length:16},(_,i)=>filename(i+1)),...['.css','-v2.css','-embed.css','.js','-content.js','-tasks.js','-worlds.js'].map(s=>'assets/go-mini-variables'+s)];
export const browserOptions={executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']};
export function geometry(){
  const root=document.querySelector('main'),scene=root.querySelector('.world');let inkBottom=0;
  const walker=document.createTreeWalker(scene,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){const text=walker.currentNode,parent=text.parentElement;if(!text.textContent.trim()||parent.closest('[aria-hidden=true],[hidden],script,style,dialog'))continue;const style=getComputedStyle(parent);if(style.visibility==='hidden'||style.opacity==='0'||!parent.getClientRects().length)continue;const range=document.createRange();range.selectNodeContents(text);for(const rect of range.getClientRects())if(rect.width&&rect.height)inkBottom=Math.max(inkBottom,rect.bottom);}
  for(const n of scene.querySelectorAll('button,input,select'))if(!n.closest('[hidden]')&&n.getClientRects().length)inkBottom=Math.max(inkBottom,n.getBoundingClientRect().bottom);
  return {main:Math.ceil(root.getBoundingClientRect().height),inkBottom:Math.ceil(inkBottom),viewport:innerHeight,x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight,overflow:[...scene.querySelectorAll('*')].filter(n=>{if(n.closest('[aria-hidden=true]')||n.tagName==='INPUT')return false;const s=getComputedStyle(n);return n.clientWidth&&s.visibility!=='hidden'&&s.display!=='none'&&n.scrollWidth>n.clientWidth+2&&!['clip','hidden','auto','scroll'].includes(s.overflowX);}).map(n=>n.className?.baseVal??n.className)};
}
export async function exercise(page,n,measure){
  const click=async(s,label=s)=>{await page.locator(s).click();await measure(label);};
  if(n===1){await click('#manual-replace','manual-stale');await click('#query-send','variable');for(const text of['циклы','функции','W'.repeat(18),'👋'.repeat(9),'']){await page.fill('#query-input',text);await measure('edited-'+text.length);await click('#query-send','run-'+text.length);}await click('#query-reset','reset');}
  if(n===3){await click('[data-prediction=same]','prediction');for(let i=1;i<=4;i++)await click('#trace-next','frame-'+i);await page.locator('#trace-time').fill('1');await measure('rewind');await click('#trace-reset','reset');}
  if(n===5){await click('[data-scale=strings]','strings');await click('[data-scale=numbers]','numbers');for(let t=0;t<6;t++){await click(`[data-token="${t}"]`,'token-'+t);for(const s of['query','found','exact'])await click(`[data-slot=${s}]`,'token-'+t+'-slot-'+s);}}
  if(n===7){for(let i=0;i<6;i++)await click('#count-next','record-'+i);await click('#count-reset','reset');for(const total of[1,12,24]){await page.locator('#remaining-total').fill(String(total));await measure('total-'+total);for(const checked of[0,total]){await page.locator('#remaining-checked').fill(String(checked));await measure('checked-'+checked);}}}
  if(n===9){await click('#copy-next','snapshot');await click('#copy-next','changed');await click('#copy-reset','reset');}
  if(n===11){for(let i=0;i<3;i++)await click(`[data-drawer="${i}"]`,'open-'+i);await click('#drawer-open','all');for(const s of['empty','space','word'])await click(`[data-empty=${s}]`,s);await click('#drawer-reset','reset');}
  if(n===13){for(const mode of['concat','arguments']){await click(`[data-print-mode=${mode}]`,mode);for(const space of[true,false]){await page.locator('#type-with-space').setChecked(space);await measure(mode+'-'+space);}}await click('#type-print','print');await click('#heading-change','changed-query');await click('#heading-rebuild','rebuilt-heading');}
}

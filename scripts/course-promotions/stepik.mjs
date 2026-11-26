import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

export async function createApi({apply=false,allow=()=>false}={}){
  const session=JSON.parse(await readFile('.stepik-accounts/647088271/session.json','utf8'));
  async function api(path,method='GET',body){
    assert.ok(method==='GET'||(apply&&allow(path,method,body)),'Write outside promotion plan: '+method+' '+path);
    const response=await fetch('https://stepik.org/api/'+path,{method,headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
    assert.ok(response.ok,method+' '+path.split('?')[0]+' HTTP '+response.status);
    return response.json();
  }
  assert.equal((await api('stepics/1')).stepics[0].user,647088271,'Wrong account or expired session. Refresh webhacker explicitly.');
  return api;
}

export async function readSources(api,lesson){
  const sources=[];
  for(let page=1;page<=40;page++){
    const data=await api('step-sources?lesson='+lesson+'&page='+page);
    sources.push(...data['step-sources']);
    if(!data.meta.has_next)return sources.sort((a,b)=>a.position-b.position);
  }
  throw Error('Step pagination limit');
}

export const pick=(value,keys)=>Object.fromEntries(keys.map(key=>[key,value[key]]));
export const sourceKeys=['id','lesson','block','cost','is_enabled','needs_plan','instruction','instruction_type','is_solutions_unlocked','solutions_unlocked_attempts','has_submissions_restrictions','max_submissions_count','variation','variations_count','discussion_threads'];
export const courseKeys=['id','title','owner','sections','child_courses','description','summary','acquired_skills','acquired_assets','is_public','is_enabled','is_paid','price','currency_code','is_certificate_issued','certificate_regular_threshold','certificate_distinction_threshold'];
export const lessonKeys=['id','title','owner','courses','units','cover_url','is_comments_enabled','is_exam_without_progress','is_public','language'];
export const unitKeys=['id','lesson','section','position','begin_date','end_date','soft_deadline','hard_deadline','grading_policy','is_active','is_exam','is_free'];

/* Buildless, browser-only interactions. No analytics or network requests. */
(() => {
  'use strict';
  const paths = {
    arrow:'M5 12h14M13 6l6 6-6 6',
    check:'m5 12 4 4L19 6',
    search:'m20 20-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    plane:'m21 3-7 18-4-7-7-4L21 3ZM10 14 21 3',
    people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    code:'m8 6-6 6 6 6M16 6l6 6-6 6m-3-15-2 18',
    compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-5-4-3 5-5 3 3-5 5-3Z',
    spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
    copy:'M9 9h11v12H9V9ZM15 9V3H3v12h6',
    heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    chat:'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 1 1 19 0Z',
    book:'M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15',
    clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
    flag:'M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0',
    plus:'M12 5v14M5 12h14',
    minus:'M5 12h14',
    close:'m6 6 12 12M6 18 18 6',
    bookmark:'M6 3h12v18l-6-4-6 4V3',
    link:'M15 3h6v6m0-6L11 13M10 3H3v18h18v-7'
  };
  const icon = name => '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (paths[name] || paths.spark) + '"/></svg>';
  document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); });
  const state = {
    read(key, fallback) { try { return JSON.parse(localStorage.getItem('go-mini-intro:' + key)) ?? fallback; } catch { return fallback; } },
    write(key, value) { try { localStorage.setItem('go-mini-intro:' + key, JSON.stringify(value)); } catch { /* State is optional inside embedded pages. */ } }
  };
  const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return; } catch { /* Try the embedded-document fallback. */ }
    }
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.style.cssText = 'position:fixed;left:-10000px;top:0;';
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand('copy');
    helper.remove();
    if (!copied) throw new Error('clipboard_unavailable');
  }

  function survey() {
    const options = [...document.querySelectorAll('input[name="source"]')];
    const detail = document.querySelector('#source-detail');
    const preview = document.querySelector('#answer-preview');
    const output = document.querySelector('#answer-text');
    const button = document.querySelector('#copy-answer');
    const status = document.querySelector('#survey-status');
    const visual = document.querySelector('.journey-visual');
    const saved = state.read('source', {});
    options.forEach(input => { input.checked = input.value === saved.source; });
    detail.value = typeof saved.detail === 'string' ? saved.detail : '';
    function update() {
      const choice = options.find(input => input.checked);
      const comment = detail.value.trim();
      preview.hidden = !choice && !comment;
      const label = choice?.dataset.answer || '';
      output.textContent = [label, comment].filter(Boolean).join('\n');
      visual.classList.toggle('has-choice', !!choice);
      document.querySelector('#journey-source').textContent = choice ? choice.dataset.label + ' → Go-шечка (mini)' : 'Go-шечка (mini)';
      status.textContent = '';
      button.innerHTML = icon('copy') + 'Скопировать ответ';
      state.write('source', {source:choice?.value || '', detail:detail.value});
    }
    options.forEach(input => input.addEventListener('change', update));
    detail.addEventListener('input', update);
    button.addEventListener('click', async () => {
      try {
        await copyText(output.textContent);
        button.innerHTML = icon('check') + 'Ответ скопирован';
        status.textContent = 'Вставьте ответ в поле Stepik под страницей — команда WEB HACKER его увидит.';
      } catch {
        status.textContent = 'Выделите текст ответа выше и скопируйте его вручную.';
      }
    });
    update();
  }

  function rules() {
    const button = document.querySelector('#agree-button');
    const card = document.querySelector('.agreement');
    const status = document.querySelector('#agreement-status');
    function render(accepted) {
      card.classList.toggle('accepted', accepted);
      button.setAttribute('aria-pressed', String(accepted));
      button.innerHTML = icon(accepted ? 'check' : 'heart') + (accepted ? 'Договорились' : 'Договорились?');
      status.textContent = accepted ? 'Отлично. Увидимся в комментариях.' : '';
    }
    render(state.read('agreement', false));
    button.addEventListener('click', () => {
      const accepted = button.getAttribute('aria-pressed') !== 'true';
      state.write('agreement', accepted);
      render(accepted);
    });
  }

  function launch() {
    const button = document.querySelector('#launch-button');
    const slider = document.querySelector('#continue-slider');
    let drag = null, progress = 0, completed = false;
    const travel = () => Math.max(1,slider.clientWidth-button.offsetWidth-12);
    function move(value) {
      progress=Math.max(0,Math.min(1,value));
      slider.style.setProperty('--drag',progress*travel()+'px');
      slider.style.setProperty('--progress',progress);
    }
    function complete() {
      if(completed)return;
      completed=true;drag=null;move(1);
      slider.classList.remove('is-dragging');slider.classList.add('is-complete');
      document.querySelector('#continue-label').textContent='Переходим…';
      button.innerHTML=icon('check');button.disabled=true;
      document.querySelector('#continue-link').click();
    }
    button.addEventListener('pointerdown',event=>{
      if(completed||event.button!==0)return;
      drag={x:event.clientX,start:progress,id:event.pointerId};
      button.setPointerCapture(event.pointerId);slider.classList.add('is-dragging');
    });
    button.addEventListener('pointermove',event=>{
      if(drag&&event.pointerId===drag.id)move(drag.start+(event.clientX-drag.x)/travel());
    });
    button.addEventListener('pointerup',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      const accepted=progress>=.94;
      drag=null;slider.classList.remove('is-dragging');
      if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);
      if(accepted)complete();else move(0);
    });
    function cancel() {if(!completed){drag=null;slider.classList.remove('is-dragging');move(0);}}
    button.addEventListener('pointercancel',cancel);
    button.addEventListener('lostpointercapture',()=>{if(drag)cancel();});
    button.addEventListener('click',event=>{if(event.detail===0)complete();});
    button.addEventListener('keydown',event=>{
      if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
        event.preventDefault();move(progress+(event.key==='ArrowRight'?.15:-.15));
      }else if(event.key==='Escape'||event.key==='Home'){event.preventDefault();move(0);}
    });
    window.addEventListener('resize',()=>{if(!completed)move(0);});
  }

  function roadmap() {
    const catalog = window.INTRO_CATALOG;
    const tracks = new Map(catalog.tracks.map(track => [track.id,track]));
    const courses = new Map(catalog.courses.map(course => [course.id,course]));
    const viewport = document.querySelector('#map-viewport');
    const world = document.querySelector('#map-world');
    const space = document.querySelector('#map-space');
    const list = document.querySelector('#catalog-list');
    const dialog = document.querySelector('#course-dialog');
    const search = document.querySelector('#course-search');
    const freeButton = document.querySelector('#free-filter');
    const savedRaw = state.read('route', []);
    let saved = new Set(Array.isArray(savedRaw) ? savedRaw.filter(id => courses.has(id)) : []);
    let trackId = 'all', view = 'map', freeOnly = false, scale = 1, size = {width:1340,height:790}, activeCourse = null, listPage = 0;
    const embedded = document.documentElement.classList.contains('embedded');
    const styles = track => '--track-color:'+track.color+';--track-tint:'+track.tint+';--track-line:'+track.line;
    const cover = course => '<span class="cover-frame"><img class="course-cover" src="assets/course-covers/'+course.id+(course.current?'.svg':'.png')+'" alt="" width="160" height="160" decoding="async"></span>';
    const marks = {go:'Go',web:'</>',backend:'{ }',tools:'⌘',ai:'✳',fullstack:'WH',other:'Aa'};
    const mark = track => '<span class="track-logo" aria-hidden="true">'+safe(marks[track.id])+'</span>';
    const featured = {go:[305666,300562,300560],web:[135466,191652,200517],backend:[181030,181092,290060],tools:[218158,184095,290054],ai:[276638,277096],fullstack:[183142,187189,187191],other:[290059]};
    const price = course => course.current ? '<span class="current-tag">Вы здесь</span>' : '<span class="course-price '+(course.free?'free':'')+'">'+(course.free?'Бесплатно':'Платный курс')+'</span>';
    const matches = course => (trackId === 'all' || course.track === trackId) && (!freeOnly || course.free) && course.title.toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru'));
    const filtered = () => catalog.courses.filter(matches);
    function line(x1,y1,x2,y2,color,dashed) {
      const middle=(y1+y2)/2;
      return '<path d="M '+x1+' '+y1+' C '+x1+' '+middle+' '+x2+' '+middle+' '+x2+' '+y2+'" stroke="'+color+'"'+(dashed?' stroke-dasharray="5 7"':'')+'/>';
    }
    function lines(pathsHtml) { return '<svg class="map-lines" width="'+size.width+'" height="'+size.height+'" aria-hidden="true">'+pathsHtml+'</svg>'; }
    function nodeCourse(course,x,y) {
      const track = tracks.get(course.track);
      return '<button type="button" class="map-node course-node" data-course="'+course.id+'" style="left:'+x+'px;top:'+y+'px;'+styles(track)+'">'+cover(course)+'<span class="course-copy"><strong>'+safe(course.title)+'</strong><small>'+price(course)+(saved.has(course.id)?'<span class="saved-indicator" aria-label="В моём маршруте">'+icon('check')+'</span>':'')+'</small></span></button>';
    }
    function renderOverview() {
      size={width:1320,height:900};
      const positions=[[45,35],[515,15],[985,35],[15,350],[1015,350],[250,665],[780,665]];
      let links='', nodes='<div class="map-node root-node overview-root" style="left:535px;top:355px"><span class="brand-mark" aria-hidden="true">W<span>H</span></span><strong>WEB HACKER</strong></div>';
      catalog.tracks.forEach((track,i) => {
        const [x,y]=positions[i], count=catalog.courses.filter(c=>c.track===track.id&&(!freeOnly||c.free)).length;
        links += line(660,435,x+145,y+104,track.color,!count);
        const previews=featured[track.id].map(id=>courses.get(id)).filter(c=>!freeOnly||c.free);
        nodes += '<button type="button" class="map-node track-node" data-track="'+track.id+'" style="left:'+x+'px;top:'+y+'px;'+styles(track)+'"><span class="track-heading">'+mark(track)+'<span><strong>'+safe(track.title)+'</strong><small>'+count+' '+plural(count,'курс','курса','курсов')+'</small></span></span><span class="cover-fan" aria-hidden="true">'+previews.map(cover).join('')+'</span><span class="node-arrow">'+icon('arrow')+'</span></button>';
      });
      world.innerHTML=lines(links)+nodes;
    }
    function renderBranch() {
      const track=tracks.get(trackId);
      const stages=track.stages.map(stage=>({...stage,courses:stage.courses.map(id=>courses.get(id)).filter(matches)})).filter(stage=>stage.courses.length);
      if(!stages.length) {
        size={width:600,height:400};
        world.innerHTML='<div class="empty-state" style="width:600px;padding-top:160px">В этой ветке пока нет бесплатных курсов.</div>';
        return;
      }
      size={width:Math.max(690,stages.length*360+40),height:Math.max(650,350+Math.max(...stages.map(s=>s.courses.length))*145)};
      let paths='', nodes='<button type="button" class="map-node root-node branch-root" data-track="all" style="left:40px;top:35px;'+styles(track)+'">'+mark(track)+'<strong>'+safe(track.title)+'</strong><span>← Вся карта</span></button>';
      stages.forEach((stage,i)=>{
        const x=40+i*360;
        if(i===0 || !['go','web','ai'].includes(track.id) || stage.optional) paths += line(190,170,x+150,225,track.color,stage.optional);
        else {
          let previous=i-1;
          while(previous>0 && stages[previous].optional) previous--;
          const fromX=40+previous*360+150;
          paths+='<path d="M '+fromX+' 225 V 200 Q '+fromX+' 190 '+(fromX+10)+' 190 H '+(x+140)+' Q '+(x+150)+' 190 '+(x+150)+' 200 V 225" stroke="'+track.color+'"/>';
        }
        nodes+='<div class="stage-title" style="left:'+x+'px;top:225px;'+styles(track)+'">'+safe(stage.title)+'<small>'+safe(stage.note)+'</small></div>';
        stage.courses.forEach((course,j)=>{
          const y=325+j*145;
          paths+='<path d="M '+(x-14)+' 265 V '+(y+57)+' H '+x+'" stroke="'+track.color+'"'+(stage.optional?' stroke-dasharray="5 6"':'')+'/>';
          if(j===0) paths+='<path d="M '+x+' 265 H '+(x-14)+'" stroke="'+track.color+'"/>';
          nodes+=nodeCourse(course,x,y);
        });
      });
      world.innerHTML=lines(paths)+nodes;
    }
    function plural(n,a,b,c) { const v=n%100;return v>=11&&v<=19?c:n%10===1?a:n%10>=2&&n%10<=4?b:c; }
    function setScale(next,center) {
      const old=scale;
      const oldX=Math.max(0,(viewport.clientWidth-size.width*old)/2), oldY=Math.max(0,(viewport.clientHeight-size.height*old)/2);
      const x=(viewport.scrollLeft+viewport.clientWidth/2-oldX)/old, y=(viewport.scrollTop+viewport.clientHeight/2-oldY)/old;
      scale=Math.max(.2,Math.min(1.5,next));
      const offsetX=Math.max(0,(viewport.clientWidth-size.width*scale)/2), offsetY=Math.max(0,(viewport.clientHeight-size.height*scale)/2);
      world.style.cssText='width:'+size.width+'px;height:'+size.height+'px;left:'+offsetX+'px;top:'+offsetY+'px;transform:scale('+scale+')';
      space.style.cssText='width:'+Math.max(viewport.clientWidth,size.width*scale)+'px;height:'+Math.max(viewport.clientHeight,size.height*scale)+'px';
      document.querySelector('#zoom-value').textContent=Math.round(scale*100)+'%';
      if(center) {viewport.scrollLeft=x*scale+offsetX-viewport.clientWidth/2;viewport.scrollTop=y*scale+offsetY-viewport.clientHeight/2;}
    }
    function fit() { setScale(Math.min((viewport.clientWidth-30)/size.width,(viewport.clientHeight-30)/size.height,1),false);viewport.scrollLeft=0;viewport.scrollTop=0; }
    function renderList() {
      const selected=filtered();
      const pageSize=embedded?(window.innerWidth<=480?3:6):Math.max(1,selected.length);
      const pages=Math.max(1,Math.ceil(selected.length/pageSize));
      listPage=Math.min(listPage,pages-1);
      const visible=selected.slice(listPage*pageSize,(listPage+1)*pageSize);
      list.innerHTML=selected.length?'<div class="list-grid">'+visible.map(course=>{
        const t=tracks.get(course.track);
        return '<button type="button" class="list-course" data-course="'+course.id+'" style="'+styles(t)+'">'+cover(course)+'<span class="list-copy"><span class="list-track">'+safe(t.title)+'</span><strong>'+safe(course.title)+'</strong><small class="'+(course.free?'free':'')+'">'+(course.current?'Вы здесь':course.free?'Бесплатно':'Платный курс')+(saved.has(course.id)?' · В маршруте':'')+'</small></span><span class="list-arrow" aria-hidden="true">'+icon('arrow')+'</span></button>';
      }).join('')+'</div>'+(pages>1?'<nav class="catalog-pagination" aria-label="Страницы каталога"><button type="button" data-catalog-page="'+(listPage-1)+'"'+(listPage===0?' disabled':'')+'>← Назад</button><span aria-live="polite">'+(listPage+1)+' / '+pages+'</span><button type="button" data-catalog-page="'+(listPage+1)+'"'+(listPage===pages-1?' disabled':'')+'>Дальше →</button></nav>':''):'<div class="empty-state">Ничего не нашлось. Попробуйте другое название или уберите фильтр.</div>';
      document.querySelector('#result-status').textContent='Найдено: '+selected.length+' '+plural(selected.length,'курс','курса','курсов');
    }
    function renderRoute() {
      document.querySelector('#saved-count').textContent=saved.size;
      document.querySelector('#saved-route').innerHTML=saved.size?[...saved].map(id=>'<button type="button" class="saved-chip" data-course="'+id+'">'+safe(courses.get(id).title)+icon('arrow')+'</button>').join(''):'<p class="note">Пока пусто.</p>';
    }
    function render(reset) {
      const isList=view==='list'||!!search.value.trim();
      viewport.hidden=isList;list.hidden=!isList;
      document.querySelector('#map-caption').hidden=isList;
      document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===(isList?'list':'map'))));
      document.querySelectorAll('#track-filters [data-track]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.track===trackId)));
      freeButton.setAttribute('aria-pressed',String(freeOnly));
      if(isList) renderList();
      else {
        if(trackId==='all') renderOverview();else renderBranch();
        if(reset) {
          const initial=trackId==='all'?Math.max(.48,Math.min((viewport.clientWidth-30)/size.width,(viewport.clientHeight-20)/size.height)):.9;
          setScale(initial,false);viewport.scrollLeft=0;viewport.scrollTop=0;
        } else setScale(scale,false);
      }
      renderRoute();
    }
    function openCourse(id) {
      const course=courses.get(Number(id));if(!course)return;
      activeCourse=course.id;
      dialog.style.cssText=styles(tracks.get(course.track));
      document.querySelector('#dialog-art').innerHTML=cover(course);
      document.querySelector('#dialog-title').textContent=course.title;
      document.querySelector('#dialog-description').textContent=course.description;
      document.querySelector('#dialog-track').textContent=tracks.get(course.track).title;
      const tag=document.querySelector('#dialog-price');
      tag.textContent=course.current?'Вы сейчас здесь':course.free?'Бесплатно':'Платный курс';tag.classList.toggle('free',course.free);
      document.querySelector('#course-link').href='https://stepik.org/course/'+course.id+'/promo';
      document.querySelector('#course-link').innerHTML=(course.current?'Открыть текущий курс':'Открыть курс')+icon('link');
      updateSaveButton();
      dialog.showModal();
    }
    function updateSaveButton() {
      const button=document.querySelector('#save-course');
      button.setAttribute('aria-pressed',String(saved.has(activeCourse)));
      button.innerHTML=icon(saved.has(activeCourse)?'check':'plus')+(saved.has(activeCourse)?'Убрать из маршрута':'В мой маршрут');
    }
    document.querySelector('#catalog-count').textContent=catalog.courses.length+' курсов · '+catalog.tracks.length+' направлений';
    document.addEventListener('error',event=>{
      if(event.target.matches?.('.course-cover')){
        event.target.hidden=true;
        event.target.parentElement.classList.add('cover-unavailable');
        event.target.parentElement.setAttribute('aria-label','Обложка недоступна');
      }
    },true);
    const tabs=document.querySelector('#track-filters');
    tabs.innerHTML='<button type="button" data-track="all" aria-pressed="true">Все направления</button>'+catalog.tracks.map(t=>'<button type="button" data-track="'+t.id+'" aria-pressed="false" style="'+styles(t)+'">'+safe(t.title)+'</button>').join('');
    document.addEventListener('click',event=>{
      const pagination=event.target.closest('[data-catalog-page]');
      if(pagination){listPage=Number(pagination.dataset.catalogPage);renderList();list.querySelector('.list-course')?.focus({preventScroll:true});return;}
      const course=event.target.closest('[data-course]');
      if(course){openCourse(course.dataset.course);return;}
      const track=event.target.closest('[data-track]');
      if(track){trackId=track.dataset.track;search.value='';listPage=0;render(true);}
    });
    document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;if(view==='map')search.value='';render(true);}));
    search.addEventListener('input',()=>{listPage=0;render(false);});
    freeButton.addEventListener('click',()=>{freeOnly=!freeOnly;listPage=0;render(true);});
    document.querySelector('#zoom-in').addEventListener('click',()=>setScale(scale+.15,true));
    document.querySelector('#zoom-out').addEventListener('click',()=>setScale(scale-.15,true));
    document.querySelector('#fit-map').addEventListener('click',fit);
    document.querySelector('#dialog-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>document.querySelector('[data-course="'+activeCourse+'"]')?.focus({preventScroll:true}));
    dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
    document.querySelector('#save-course').addEventListener('click',()=>{
      if(saved.has(activeCourse))saved.delete(activeCourse);else saved.add(activeCourse);
      state.write('route',[...saved]);updateSaveButton();render(false);
    });
    let drag=null;
    viewport.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='mouse'||event.button!==0||event.target.closest('button'))return;
      drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};
      viewport.setPointerCapture(event.pointerId);viewport.classList.add('dragging');
    });
    viewport.addEventListener('pointermove',event=>{if(drag){viewport.scrollLeft=drag.left-(event.clientX-drag.x);viewport.scrollTop=drag.top-(event.clientY-drag.y);}});
    const stop=()=>{drag=null;viewport.classList.remove('dragging');};
    viewport.addEventListener('pointerup',stop);viewport.addEventListener('pointercancel',stop);
    let resizeFrame;
    window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>render(true));});
    render(true);
  }
  const page=document.body.dataset.page;
  if(page==='survey')survey();
  if(page==='rules')rules();
  if(page==='roadmap')roadmap();
  if(page==='launch')launch();
})();

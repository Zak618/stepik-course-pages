(() => {
  const button = document.querySelector('#copy');
  const code = document.querySelector('#promo');
  const status = document.querySelector('#copy-status');
  const cover = document.querySelector('#cover');
  const area = document.querySelector('.ticket-code');
  const ctx = cover.getContext('2d', {willReadFrequently: true});
  let revealed = false;
  let pointer = null;
  let last = null;
  function reveal() {
    if (revealed) return;
    revealed = true;
    const keyboard = document.activeElement === cover && pointer === null;
    area.classList.add('revealed');
    code.removeAttribute('aria-hidden');
    code.tabIndex = 0;
    button.hidden = false;
    cover.tabIndex = -1;
    cover.setAttribute('aria-hidden', 'true');
    status.textContent = 'Промокод открыт';
    if (keyboard) button.focus({preventScroll: true});
  }
  function paint() {
    if (revealed || !ctx) return;
    const w = area.clientWidth, h = area.clientHeight;
    const scale = Math.min(devicePixelRatio || 1, 2);
    cover.width = Math.round(w * scale);
    cover.height = Math.round(h * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    const foil = ctx.createLinearGradient(0, 0, w, h);
    foil.addColorStop(0, '#d4d5ed');
    foil.addColorStop(.3, '#f2f0ff');
    foil.addColorStop(.55, '#c4cbe5');
    foil.addColorStop(.8, '#ebe6fc');
    foil.addColorStop(1, '#c4d9e8');
    ctx.fillStyle = foil;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffffff60';
    ctx.lineWidth = 1;
    for (let x = -h; x < w; x += 12) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#526586';
    ctx.font = '600 ' + (w < 200 ? 14 : 18) + 'px Arial';
    ctx.fillText('Сотрите покрытие', w / 2, h / 2);
  }
  function erase(event) {
    const r = cover.getBoundingClientRect();
    const point = {x: event.clientX - r.left, y: event.clientY - r.top};
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 42;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last?.x ?? point.x, last?.y ?? point.y);
    ctx.lineTo(point.x + .01, point.y);
    ctx.stroke();
    last = point;
  }
  function checkProgress() {
    const {data} = ctx.getImageData(0, 0, cover.width, cover.height);
    let clear = 0, total = 0;
    for (let y = 4; y < cover.height; y += 12) {
      for (let x = 4; x < cover.width; x += 12) {
        total++;
        if (data[(y * cover.width + x) * 4 + 3] < 80) clear++;
      }
    }
    if (total && clear / total >= .42) reveal();
  }
  if (ctx && typeof ResizeObserver !== 'undefined') {
    cover.hidden = false;
    code.tabIndex = -1;
    code.setAttribute('aria-hidden', 'true');
    paint();
    new ResizeObserver(paint).observe(area);
    cover.addEventListener('pointerdown', event => {
      if (revealed || pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      pointer = event.pointerId;
      last = null;
      cover.setPointerCapture(pointer);
      erase(event);
    });
    cover.addEventListener('pointermove', event => {
      if (event.pointerId !== pointer || revealed) return;
      erase(event);
      checkProgress();
    });
    const finish = event => {
      if (event.pointerId !== pointer) return;
      checkProgress();
      pointer = null;
      last = null;
    };
    cover.addEventListener('pointerup', finish);
    cover.addEventListener('pointercancel', finish);
    cover.addEventListener('lostpointercapture', finish);
    cover.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        reveal();
      }
    });
    cover.addEventListener('click', event => {
      if (event.detail === 0) reveal();
    });
  } else {
    reveal();
  }
  code.addEventListener('click', () => code.select());
  let copying = false;
  button.addEventListener('click', async () => {
    if (copying) return;
    copying = true;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code.value);
        copied = true;
      }
    } catch { /* Cross-origin frames may deny the modern clipboard API. */ }
    if (!copied) {
      code.focus();
      code.select();
      try { copied = document.execCommand('copy'); } catch { /* Keep manual selection. */ }
    }
    if (copied) {
      status.textContent = 'Скопировано!';
      button.innerHTML = 'Скопировать код <span aria-hidden="true">✓</span>';
      button.focus({preventScroll: true});
    } else {
      status.textContent = 'Выделите код и скопируйте его.';
      code.focus({preventScroll: true});
      code.select();
    }
    copying = false;
  });
})();

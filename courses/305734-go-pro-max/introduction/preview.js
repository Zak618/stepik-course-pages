const {pages} = await fetch('/api/go-pro-max-intro').then(response => {
  if (!response.ok) throw Error('Не удалось открыть локальный просмотр');
  return response.json();
});
const nav = document.querySelector('#steps');
const frame = document.querySelector('#lesson-frame');
const surface = document.querySelector('.preview-surface');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
let index = Math.max(0, pages.findIndex(page => page.part === location.hash.slice(1)));
let phone = false;
let currentPart;
const nativeResponse = document.querySelector('#native-response');
const reviewAnswers = new Map();
nativeResponse.addEventListener('input', () => reviewAnswers.set(currentPart, nativeResponse.value));
pages.forEach((page, number) => {
  const button = document.createElement('button');
  button.type = 'button';
  const label = document.createElement('span');
  label.textContent = String(number + 1);
  button.append(label, page.title);
  button.addEventListener('click', () => show(number));
  nav.append(button);
});
function sharedHeight() {
  if (pages[index].part === 'welcome') frame.height = phone || innerWidth < 600 ? '720' : '650';
  if (pages[index].part === 'map') frame.height = phone || innerWidth < 600 ? '900' : '820';
}
function show(number) {
  index = number;
  const page = pages[index];
  history.replaceState(null, '', location.pathname + location.search + '#' + page.part);
  [...nav.children].forEach((button, i) => {
    if (i === index) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('#step-label').textContent = 'Шаг ' + (index + 1) + '. ' + page.title;
  document.querySelector('#step-count').textContent = (index + 1) + ' из ' + pages.length;
  document.querySelector('#native-answer').hidden = page.type !== 'free-answer';
  previous.disabled = index === 0;
  next.disabled = index === pages.length - 1;
  if (currentPart !== page.part) {
    currentPart = page.part;
    nativeResponse.value = reviewAnswers.get(page.part) || '';
    frame.height = '650';
    frame.src = page.file + '?embed=1';
    frame.title = page.title + ' · Go-шечка Pro MAX';
  }
  sharedHeight();
}
previous.addEventListener('click', () => show(Math.max(0, index - 1)));
next.addEventListener('click', () => show(Math.min(pages.length - 1, index + 1)));
document.querySelectorAll('[data-width]').forEach(button => button.addEventListener('click', () => {
  phone = button.dataset.width === 'phone';
  surface.classList.toggle('phone', phone);
  document.querySelectorAll('[data-width]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  sharedHeight();
}));
addEventListener('resize', sharedHeight);
addEventListener('hashchange', () => {
  const number = pages.findIndex(page => page.part === location.hash.slice(1));
  if (number >= 0) show(number);
});
addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'go-pro-max-intro:height') return;
  const height = event.data.height;
  if (Number.isFinite(height) && height >= 100 && height < 5000) frame.height = String(height);
});
show(index);

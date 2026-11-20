// Source for this course only. Shared welcome/map are built from shared templates.
export const pages = [
  {part: 'welcome', title: 'Приветствие', file: '01-welcome.html', source: 12250852, type: 'text'},
  {part: 'telegram', title: 'На связи', file: '02-telegram.html', source: 12376579, type: 'text'},
  {part: 'map', title: 'Карта курсов', file: '03-course-map.html', source: 12376578, type: 'text'},
  {part: 'experience', title: 'Знакомство', file: '04-about-you.html', source: 12250853, type: 'free-answer'},
  {part: 'goal', title: 'Ваша цель', file: '05-your-goal.html', source: 12250854, type: 'free-answer'},
  {part: 'start', title: 'Что впереди', file: '06-start.html', source: 12376577, type: 'text'},
];

const heading = (first, accent, text = '') => `<header class="lesson-head"><h1>${first} <span>${accent}</span></h1>${text ? `<p>${text}</p>` : ''}</header>`;

const envelope = `<div class="post-scene" aria-hidden="true"><div class="post-orbit orbit-a"></div><div class="post-orbit orbit-b"></div><span class="post-star star-a">✦</span><span class="post-star star-b">✧</span><span class="post-star star-c">✦</span><div class="flying-note"><span id="note-mark">✦</span><strong id="note-label">Новости</strong><i></i><i></i><i></i></div><div class="envelope"><div class="envelope-back"></div><div class="envelope-front"></div><span class="envelope-seal">WH</span></div><div class="post-shadow"></div><span class="scene-caption">@webosnovy</span></div>`;

const bodies = {
  telegram: `${heading('Будем', 'на связи.', 'Курс здесь, в Stepik. А новости и полезные находки в нашем Telegram.')}
    <section class="post-layout">
      ${envelope}
      <div class="post-content"><p class="eyebrow">Канал команды WEB HACKER</p><h2>Ещё немного<br> полезного.</h2>
        <div class="choice-row" role="group" aria-label="Что есть в канале"><button type="button" data-post="news" aria-pressed="true">Новости</button><button type="button" data-post="materials" aria-pressed="false">Материалы</button><button type="button" data-post="updates" aria-pressed="false">Обновления</button></div>
        <p class="post-description" id="post-description" aria-live="polite">Рассказываем, что готовим и какие курсы уже вышли.</p>
        <a class="button" href="https://t.me/webosnovy" target="_blank" rel="noopener noreferrer">Открыть @webosnovy</a>
        <p class="small-note">Подписка не нужна для прохождения курса. Вопросы по заданиям задавайте под нужным шагом.</p>
      </div>
    </section>`,
  experience: `${heading('С чего', 'начнём?', 'Расскажите немного о себе. Не чтобы проверить знания, а чтобы познакомиться.')}
    <section class="experience-layout">
      <div class="experience-form"><fieldset><legend>Уже пробовали программировать?</legend><div class="experience-options">
        <button type="button" data-experience="first" aria-pressed="false"><span class="choice-symbol">✦</span><span><strong>Пока нет</strong><small>Начинаю с первых строк</small></span></button>
        <button type="button" data-experience="other" aria-pressed="false"><span class="choice-symbol">{ }</span><span><strong>Да, на другом языке</strong><small>Хочу освоить Go</small></span></button>
        <button type="button" data-experience="go" aria-pressed="false"><span class="choice-symbol">Go</span><span><strong>Уже пишу на Go</strong><small>Хочу пойти дальше</small></span></button>
      </div></fieldset>
      <div class="answer-question"><h2>Что уже пробовали?</h2><p>Расскажите, на чём писали и что получилось. Если это первый курс, так и напишите. Ещё нам интересно, как вы нас нашли.</p></div>
      </div>
      <aside class="passport" aria-label="Ваша точка старта"><div class="passport-top"><span>Go-шечка</span><b>PRO MAX</b></div><div class="passport-orbit"><i></i><i></i><i></i><div class="passport-core" id="experience-mark">?</div><span class="passport-spark">✦</span></div><p class="eyebrow">Ваша точка старта</p><h2 id="experience-title">У каждого своя.</h2><p id="experience-note" aria-live="polite">Выберите подходящий вариант. Go заранее знать не нужно.</p><div class="passport-bottom"><span>Один курс.</span><strong>Свой путь.</strong></div></aside>
    </section>`,
  goal: `${heading('Что хотите', 'собрать?', 'Выберите то, что вам ближе. Или напишите свою цель. Большой план не обязателен.')}
    <div class="goal-options choice-row" role="group" aria-label="Ваша цель"><button type="button" data-goal="api" aria-pressed="false">Свой API</button><button type="button" data-goal="database" aria-pressed="false">Работу с базой</button><button type="button" data-goal="service" aria-pressed="false">Приложение целиком</button><button type="button" data-goal="language" aria-pressed="false">Разобраться в Go</button></div>
    <section class="delivery-scene" data-focus="none" aria-label="Сервис доставки, который будем собирать на курсе">
      <svg class="delivery-art" viewBox="0 0 960 290" role="img" aria-label="Заказ проходит через Go API и базу данных, затем уходит в доставку"><defs><linearGradient id="ground" x2="1" y2="1"><stop stop-color="#e4f9ff"/><stop offset="1" stop-color="#f0eaff"/></linearGradient><linearGradient id="tower" x2="1" y2="1"><stop stop-color="#7066ef"/><stop offset="1" stop-color="#4647bc"/></linearGradient></defs>
        <ellipse cx="480" cy="241" rx="435" ry="39" fill="url(#ground)"/>
        <path class="delivery-road" d="M126 229 C240 277 300 176 426 219 S659 276 817 217"/>
        <path class="delivery-flow" d="M126 229 C240 277 300 176 426 219 S659 276 817 217"/>
        <g class="scene-shop"><path d="M67 130 140 86 210 130Z" fill="#ff9a83"/><rect x="79" y="130" width="120" height="101" rx="5" fill="#ffdab1"/><path d="M72 144h134v27H72Z" fill="#ff807a"/><path d="M72 144h22v27H72m44-27h23v27h-23m45-27h23v27h-23" fill="#fff5de"/><rect x="95" y="181" width="40" height="34" rx="5" fill="#82d8d1"/><rect x="153" y="182" width="28" height="49" rx="5" fill="#ba7f88"/><text x="140" y="119" text-anchor="middle">Заказ</text></g>
        <g class="scene-api"><path d="m333 112 71-24 72 24-72 25Z" fill="#b8b5ff"/><path d="M333 112v123l71 23V137Z" fill="#6d66e8"/><path d="M404 137v121l72-23V112Z" fill="url(#tower)"/><path d="m349 145 39 13m-39 16 39 13m-39 16 39 13" stroke="#cccaff" stroke-width="7"/><circle cx="432" cy="164" r="5" fill="#95ffe5"/><circle cx="432" cy="196" r="5" fill="#95ffe5"/><text x="405" y="63" text-anchor="middle">Go API</text></g>
        <g class="scene-database"><path d="M566 133v79c0 26 112 26 112 0v-79" fill="#64cdbf"/><ellipse cx="622" cy="133" rx="56" ry="20" fill="#b4f4e4"/><path d="M566 159c0 27 112 27 112 0m-112 28c0 27 112 27 112 0" fill="none" stroke="#effff9" stroke-width="3"/><text x="622" y="87" text-anchor="middle">PostgreSQL</text></g>
        <g class="scene-home"><path d="m744 133 60-49 63 49" fill="none" stroke="#7b70bb" stroke-width="15" stroke-linecap="round"/><path d="M751 134v96h109v-96l-56-43Z" fill="#c1b0ec"/><rect x="767" y="146" width="23" height="31" rx="4" fill="#fff1a1"/><rect x="817" y="146" width="23" height="31" rx="4" fill="#fff1a1"/><path d="M795 230v-33a12 12 0 0 1 24 0v33" fill="#8b78b7"/><text x="804" y="62" text-anchor="middle">Доставка</text></g>
        <g class="order-packet"><rect x="-20" y="-14" width="40" height="28" rx="8" fill="#ffb75e"/><path d="M-7-3h14m-14 7h9" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>
      </svg>
      <div class="delivery-legend" aria-hidden="true"><span>Заказ</span><span>Go API</span><span>PostgreSQL</span><span>Доставка</span></div>
      <div class="goal-description"><span class="goal-symbol" id="goal-symbol">✦</span><div><h2 id="goal-title">Соберём свой сервис.</h2><p id="goal-note" aria-live="polite">На курсе соединим язык, HTTP, базу данных и запуск приложения. Нажмите на цель выше.</p></div></div>
    </section>
    <div class="answer-question"><h2>А что хочется вам?</h2><p>Расскажите в ответе ниже. Можно выбрать одну цель, описать свой проект или просто написать, что хотите попробовать Go.</p></div>`,
  start: `${heading('От первой строки', 'до сервиса.')}
    <section class="build-scene" data-stage="0" aria-label="Как будет расти проект по ходу курса"><div class="build-heading"><span>Сервис доставки</span><span class="build-phase" id="build-phase">Всё начинается с кода</span></div>
      <div class="build-workbench"><div class="code-sheet"><div class="window-top"><i></i><i></i><i></i><span>main.go</span></div><pre><span class="code-purple">package</span> main

<span class="code-purple">func</span> main() {
    <span class="code-mint">// Начнём здесь</span>
}</pre><div class="code-bracket">{ }</div></div>
      <div class="build-links" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="project-window"><div class="window-top"><i></i><i></i><i></i><span>Доставка</span></div><div class="project-order"><span class="order-icon">▤</span><div><strong>Новый заказ</strong><span>Каталог · Корзина · Доставка</span></div></div><div class="project-services"><span>Go</span><span>HTTP</span><span>PostgreSQL</span></div><div class="project-result"><span>✓</span> Всё работает вместе</div></div></div>
      <ol class="build-stages"><li>Основы Go</li><li>Тесты и HTTP</li><li>Git, SQL, Docker</li><li>Сервис доставки</li></ol>
      <div class="build-control"><button class="button" type="button" id="build-project">Посмотреть сборку</button><p class="sr-only" id="build-status" role="status" aria-live="polite"></p></div>
    </section>`,
};

export function renderPage(part) {
  if (!bodies[part]) throw Error('Unknown Go MAX introduction part');
  const title = pages.find(page => page.part === part).title;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Go-шечка Pro MAX</title><link rel="stylesheet" href="introduction.css"><script defer src="introduction.js"></script></head><body data-page="${part}"><main class="lesson">${bodies[part]}</main><noscript><p class="no-js">Для анимаций включите JavaScript. Вопросы можно прочитать и без него.</p></noscript></body></html>`;
}

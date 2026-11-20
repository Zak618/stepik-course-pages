// Editorial source. Counts checked against the current Stepik syllabus.
export const facts = {modules:28,lessons:158,vueLessons:45,checked:'2026-11-20'};
export const topics = [
  ['Go','Первые программы на Go','Установим Go и запустим первую программу. Разберём переменные, строки, условия, циклы, коллекции и функции. Потом перейдём к структурам, методам и интерфейсам.'],
  ['HTTP','Сервер, ошибки и тесты','Научимся читать файлы, работать с ошибками и проверять код тестами. Разберём горутины и каналы. Напишем HTTP API, которое принимает запросы и возвращает JSON.'],
  ['SQL','Git, SQL и Docker','Будем сохранять историю кода в Git, писать SQL и работать с PostgreSQL из Go. Научимся запускать приложение и базу через Docker Compose.'],
  ['Go','Сервис доставки на Go','Добавим каталог, регистрацию и вход, корзину и оформление заказа. Разберём права доступа, статусы и транзакции. Проверим, что будет при ошибках и повторных запросах.'],
  ['Vue','Интерфейс на Vue','Начнём с небольшого меню. Разберём реактивность, компоненты, формы и страницы. Научимся хранить общее состояние в Pinia и делить код на понятные части.'],
  ['Go + Vue','Приложение целиком','Подключим интерфейс к Go API. Сделаем каталог, корзину, историю заказов и кабинет оператора. Добавим тесты и соберём приложение с Vue, Go и PostgreSQL.'],
];
export const fields = {
  summary:'Изучите Go, Vue, SQL, Git и Docker. Начните с первых программ и соберите сервис доставки целиком: сервер на Go, базу PostgreSQL и интерфейс на Vue. Внутри объяснения, интерактивные примеры, задачи и работа над проектом.',
  workload:'Около 5 часов в неделю. Можно учиться в своём темпе.',
  acquired_skills:[
    'Писать, запускать и собирать программы на Go.',
    'Работать с функциями, коллекциями, структурами, интерфейсами и ошибками.',
    'Писать тесты и разбираться в конкурентном выполнении Go-кода.',
    'Создавать HTTP API, принимать JSON и проверять входные данные.',
    'Сохранять изменения проекта в Git и работать с ветками.',
    'Писать SQL, подключать PostgreSQL к Go и использовать транзакции.',
    'Создавать компоненты, формы и страницы на Vue.',
    'Работать с Vue Router, Pinia и запросами к Go API.',
    'Проверять логику, компоненты и полный путь пользователя тестами.',
    'Собирать и запускать приложение с помощью Docker.',
  ],
  target_audience:[
    'Тем, кто хочет изучить Go и дойти до своего приложения.',
    'Тем, кто уже писал на другом языке и хочет освоить Go.',
    'Тем, кто знает отдельные инструменты, но пока не понимает, как соединить интерфейс, сервер и базу данных.',
    'Начинающим, которые готовы разбирать примеры и регулярно писать код.',
  ],
  requirements:[
    'Компьютер с Windows, macOS или Linux, интернет и возможность устанавливать программы.',
    'Знать Go заранее не нужно. Установку Go, Git, Docker и работу с базой разбираем в курсе.',
    'Для части с Vue полезно знать основы HTML, CSS и JavaScript. Нужные конструкции JavaScript повторим в начале этого раздела.',
    'Для Git, Docker и итогового проекта понадобится компьютер. Одного телефона недостаточно.',
  ],
  learning_format:[
    'Текстовые объяснения, примеры кода, интерактивы и практические задания. В отдельных разделах есть видео.',
    'Задачи на Go и SQL проверяет Stepik. Код интерфейса и итоговый проект проверяете на компьютере по инструкциям и с помощью тестов.',
    'В проекте есть заготовки, этапы работы и проверки. Вы дописываете нужные части и разбираетесь, как они работают вместе.',
    'Можно учиться в своём темпе. Вопросы по материалам задавайте под нужным шагом.',
  ],
  acquired_assets:[
    'Учебный сервис доставки с интерфейсом на Vue, сервером на Go и базой PostgreSQL.',
    'Каталог, вход, корзину, оформление заказа, историю и кабинет оператора в одном проекте.',
    'Заготовки, инструкции по этапам и тесты для проверки своей работы.',
    'Опыт работы с Git, HTTP API, PostgreSQL и Docker.',
  ],
};

export const faq = [
  ['Нужно ли уже знать Go?','Нет. Начнём с установки и первых программ. Опыт с переменными, условиями и циклами поможет освоиться быстрее. Для части с Vue полезны основы HTML, CSS и JavaScript.'],
  ['Будет только сервер или интерфейс тоже?','Соберём обе части. Сначала Go API и базу PostgreSQL, затем интерфейс на Vue. В проекте будут каталог, корзина, заказы и кабинет оператора.'],
  ['Если уже проходил другие ваши курсы?','Малая часть базовых объяснений встречается в наших курсах версий Pro и ниже. Они оставлены здесь, чтобы нужные основы были под рукой.'],
  ['Можно ли пройти всё с телефона?','С телефона можно читать объяснения. Для работы с Git, Docker, базой данных и проектом нужен компьютер.'],
];

const escape = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const paragraphs = values => values.map(value=>`<p>${escape(value)}</p>`).join('');
export const list = values => `<ul>${values.map(value=>`<li>${escape(value)}</li>`).join('')}</ul>`;

export function projectArt() {
  return `<div class="project-visual" data-stage="0">
    <div class="project-top"><span class="mini-label">Учебный проект</span><span class="project-stack">Vue <i>+</i> Go <i>+</i> PostgreSQL</span></div>
    <div class="project-windows">
      <div class="app-window"><div class="window-bar"><span class="window-dots"><i></i><i></i><i></i></span><span>Доставка</span><span class="vue-label">Vue</span></div>
        <div class="app-heading"><span>Что закажем?</span><span class="app-cart">Корзина <b>2</b></span></div>
        <div class="food-list"><div class="food-item"><div class="food-art food-pizza"><i></i><i></i><i></i></div><span><strong>Пицца</strong><small>В вашем заказе</small></span><b>1</b></div><div class="food-item"><div class="food-art food-salad"><i></i><i></i><i></i></div><span><strong>Салат</strong><small>В вашем заказе</small></span><b>1</b></div></div>
        <div class="app-order"><span class="order-mark">✓</span><span id="app-order-text">Заказ готов к отправке</span></div>
      </div>
      <div class="request-bridge" aria-hidden="true"><span></span><i></i><span></span></div>
      <div class="server-window"><div class="server-top"><span>Go API</span><span class="go-label">Go</span></div><div class="server-line"><code>POST /orders</code><span id="server-request">Запрос</span></div><div class="server-check"><span>✓</span> Проверка данных</div><div class="database"><svg viewBox="0 0 72 64" aria-hidden="true"><path d="M9 14v35c0 17 54 17 54 0V14" fill="#4abfa8"/><ellipse cx="36" cy="14" rx="27" ry="11" fill="#a6f4d5"/><path d="M9 31c0 16 54 16 54 0M9 44c0 16 54 16 54 0" fill="none" stroke="#d4ffed" stroke-width="2"/></svg><div><strong>PostgreSQL</strong><span>Пользователи и заказы</span></div></div><div class="server-response"><code>201 Created</code><span>Заказ сохранён</span></div></div>
    </div>
    <div class="demo-control"><button class="button" id="run-demo" type="button">Показать путь заказа</button><p id="demo-status" role="status" aria-live="polite">Интерфейс, сервер и база работают вместе.</p></div>
  </div>`;
}

export function renderDescription() {
  return `<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="course-label">Go-шечка <b>Pro MAX</b></p><h1 id="hero-title">Сначала Go.<br><span>Потом своё приложение.</span></h1><p class="hero-lede">Напишем сервер на Go, подключим PostgreSQL и добавим интерфейс на Vue. Соберём доставку с каталогом, корзиной и заказами.</p><div class="hero-actions"><a class="button" href="#project">Что будем собирать</a><a class="text-link" href="#program">Посмотреть темы</a></div><div class="tech-tags" aria-label="Основные технологии"><span>Go</span><span class="vue-tag">Vue</span><span>PostgreSQL</span><span>Docker</span></div></div><div class="hero-art" aria-hidden="true"><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div><div class="hero-core"><span>Go</span><b>+</b><span class="vue-core">Vue</span></div><div class="float-card float-api"><span>{ }</span><strong>Сервер</strong><small>Go</small></div><div class="float-card float-ui"><span>▦</span><strong>Интерфейс</strong><small>Vue</small></div><div class="float-card float-db"><span>▤</span><strong>Данные</strong><small>PostgreSQL</small></div><span class="hero-spark spark-one">✦</span><span class="hero-spark spark-two">✦</span></div></section>
    <div class="course-facts"><div><strong>${facts.modules}</strong><span>модулей</span></div><div><strong>${facts.lessons}</strong><span>уроков</span></div><p>От первой программы<br> до интерфейса и сервера.</p></div>
    <section class="project-section section" id="project"><header class="section-head"><p class="eyebrow">Ваш проект</p><h2>Ваш сервис доставки.<br><span>С интерфейсом и сервером.</span></h2><p>Покупатель выбирает еду, оформляет заказ и видит его статус. Оператор принимает заказ и отправляет его в доставку. Обе стороны работают с одним сервисом.</p></header>${projectArt()}<div class="project-parts"><div><h3>Каталог и корзина</h3><p>Товары, поиск и количество. Корзина хранится на сервере.</p></div><div><h3>Вход и заказы</h3><p>Сессии, права, история и кабинет оператора.</p></div><div><h3>Проверка ошибок</h3><p>Товар закончился, запрос повторился или ответ потерялся. Разберём и такие случаи.</p></div></div></section>
    <section class="program-section section" id="program"><header class="section-head"><p class="eyebrow">Что изучим</p><h2>Каждая тема<br><span>пригодится в проекте.</span></h2><p>Сначала разберём основы. Затем соединим язык, базу данных и интерфейс.</p></header><div class="program-list">${topics.map(([mark,title,text],index)=>`<details class="topic"${index===0?' open':''}><summary><span class="topic-mark${mark==='Vue'?' mint':''}">${escape(mark)}</span><span>${escape(title)}</span><i aria-hidden="true"></i></summary><div class="topic-body"><p>${escape(text)}</p></div></details>`).join('')}</div></section>
    <section class="practice-section section"><div class="practice-heading"><p class="eyebrow">Как проходит обучение</p><h2>Здесь нужно<br> писать код.</h2><p>После объяснения сразу перейдём к практике. Часть задач проверит Stepik, а работу приложения будете проверять на своём компьютере.</p></div><div class="practice-list"><div><span class="practice-icon">{ }</span><section><h3>Объяснения и интерактивы</h3><p>Разбираем новые вещи на примерах. Можно менять значения и смотреть на результат.</p></section></div><div><span class="practice-icon">✓</span><section><h3>Задачи на Go и SQL</h3><p>Решения проверяет Stepik. Можно исправить ошибку и отправить код ещё раз.</p></section></div><div><span class="practice-icon">▦</span><section><h3>Работа над приложением</h3><p>В проекте есть заготовки и этапы. Дописываете нужные части и проверяете их тестами на компьютере.</p></section></div></div></section>
    <section class="audience-section section"><header class="section-head"><p class="eyebrow">С чего начать</p><h2>Go заранее<br><span>знать не нужно.</span></h2><p>Начнём с установки и первых программ. Если уже писали на другом языке, знакомые конструкции помогут освоиться быстрее.</p></header><aside class="requirements-note"><span class="computer-art" aria-hidden="true">⌘</span><h3>Для практики нужен компьютер.</h3><p>Windows, macOS или Linux. Для части с Vue пригодятся основы HTML, CSS и JavaScript.</p><span>Около 5 часов в неделю. В своём темпе.</span></aside></section>
    <section class="faq-section section"><header class="section-head"><h2>Перед началом.</h2></header><div class="faq-list">${faq.map(([title,text])=>`<details><summary>${escape(title)}<i aria-hidden="true"></i></summary><p>${escape(text)}</p></details>`).join('')}</div></section>
    `;
}

export function nativeDescription() {
  const heading = text => `<h2 style="color:#4f64ca;font-size:28px;">${text}</h2>`;
  const frame='<iframe height="360" src="https://zak618.github.io/stepik-course-pages/courses/305734-go-pro-max/promo/project.html?v=go-max-promo-20261120-2" style="border:0;width:100%;height:360px;margin:0;" width="100%"></iframe>';
  return heading('Сначала Go. Потом своё приложение.') + paragraphs(['Напишем сервер на Go, подключим PostgreSQL и добавим интерфейс на Vue. Соберём доставку с каталогом, корзиной и заказами.']) + `<p><strong style="color:#7758d7;">${facts.modules} модулей · ${facts.lessons} уроков</strong></p>` + heading('Ваш сервис доставки') + paragraphs(['Покупатель выбирает еду, оформляет заказ и видит его статус. Оператор принимает заказ и отправляет его в доставку. Обе стороны работают с одним сервисом.']) + '<div style="font-size:0;margin:0;">'+frame+'</div>' + heading('Что изучим') + topics.map(([,title,text])=>`<details style="margin:12px 0;"><summary style="color:#238b87;"><strong>${escape(title)}</strong></summary><p>${escape(text)}</p></details>`).join('') + heading('Как будем учиться') + paragraphs(['Разбираем тему на примерах и сразу пишем код. В интерактивах можно менять значения и смотреть на результат.','Задачи на Go и SQL проверяет Stepik. Код интерфейса и итоговый проект проверяете на компьютере по инструкциям и с помощью тестов.','В проекте есть заготовки и этапы работы. Вы дописываете нужные части, проверяете их и собираете приложение целиком.']) + '<p style="color:#65748d;">'+escape(faq[2][1])+'</p>';
}

export const fieldSections = [
  ['summary','Краткое описание'],['acquired_skills','Чему вы научитесь'],['target_audience','Для кого этот курс'],['requirements','Что понадобится'],['learning_format','Формат обучения'],['acquired_assets','Что получите'],['workload','Нагрузка'],
];

export function document(title,body,active) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escape(fields.summary)}"><title>${escape(title)} · Go-шечка Pro MAX</title><link rel="stylesheet" href="styles.css"><script defer src="interactions.js"></script></head><body><header class="preview-bar"><a class="preview-brand" href="index.html">Go-шечка <b>Pro MAX</b></a><nav aria-label="Просмотр описания"><a href="index.html"${active==='promo'?' aria-current="page"':''}>Страница курса</a><a href="fields.html"${active==='fields'?' aria-current="page"':''}>Поля Stepik</a></nav><span>Локальный просмотр</span></header><main class="promo-page">${body}</main></body></html>`;
}

export function renderFields() {
  return document('Поля описания',`<header class="fields-head"><p class="eyebrow">Описание Go Pro MAX</p><h1>Все поля Stepik.</h1><p>Большое описание находится на вкладке «Страница курса». Ниже остальные тексты для карточки курса.</p></header><div class="fields-list">${fieldSections.map(([key,title])=>`<section class="field-section" data-field="${key}"><h2>${escape(title)}</h2>${Array.isArray(fields[key]) ? list(fields[key]) : `<p>${escape(fields[key])}</p>`}</section>`).join('')}</div>`,'fields');
}

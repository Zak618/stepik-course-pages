/* Public Stepik catalogue checked 2026-11-13. Drafts excluded, except the current course. */
window.INTRO_CATALOG = {
  checkedAt: '2026-11-13',
  tracks: [
    {id:'go',title:'Go',symbol:'go',color:'#178ba9',tint:'#eaf8fc',line:'#cce8ef',description:'От первой программы к собственному сервису.',stages:[
      {title:'Ваш первый Go-код',note:'Начните здесь',courses:[305666]},
      {title:'Углубление и практика',note:'Продолжение после основ',courses:[300562]},
      {title:'Другой формат практики',note:'Дополнительный маршрут, по желанию',optional:true,courses:[300560]}
    ]},
    {id:'web',title:'Frontend',symbol:'</>',color:'#6175db',tint:'#eff1ff',line:'#dce1fb',description:'Сначала страницы, затем логика и интерфейсы.',stages:[
      {title:'HTML и CSS',note:'Выберите подходящую программу',courses:[214176,187918,135466,193612,177582,170115,289356]},
      {title:'JavaScript',note:'После уверенных HTML и CSS',courses:[158971,191652]},
      {title:'TypeScript',note:'Дополнение после JavaScript',optional:true,courses:[290426]},
      {title:'React',note:'Выберите формат после основ JavaScript',courses:[218079,216887,200517,290177]}
    ]},
    {id:'backend',title:'Backend',symbol:'{ }',color:'#278c67',tint:'#edf8f1',line:'#cfeadb',description:'Выберите язык. Освоив основы, переходите к приложениям.',stages:[
      {title:'Python',note:'Основы → практика → продолжение',courses:[181030,181396,300361]},
      {title:'PHP',note:'Самостоятельная ветка',courses:[181092]},
      {title:'C#',note:'Основы, затем отдельные специализации',courses:[290060,290330,290261,290423]}
    ]},
    {id:'tools',title:'Инструменты и база',symbol:'⌘',color:'#b57b24',tint:'#fff7e9',line:'#f2e3c7',description:'Подключайте эти навыки по мере работы над проектами.',stages:[
      {title:'Контроль версий',note:'Выберите вводный или полный формат',courses:[218158,179698]},
      {title:'Данные и запуск',note:'SQL — для данных, Docker — для окружения',courses:[184095,290054]},
      {title:'Инженерное мышление',note:'После основ программирования и ООП',courses:[290248,290057]}
    ]},
    {id:'ai',title:'Искусственный интеллект',symbol:'✳',color:'#9168cf',tint:'#f6effd',line:'#e8d9f8',description:'От знакомства с ИИ к применению в своих идеях.',stages:[
      {title:'Попробовать ИИ',note:'Вводная программа',courses:[276638]},
      {title:'Прикладные задачи',note:'Продолжение по вашим целям',courses:[277096]}
    ]},
    {id:'fullstack',title:'Комплексные программы',symbol:'↗',color:'#ca725e',tint:'#fff1eb',line:'#f4dcd1',description:'Готовые программы и пакеты вместо сборки отдельных курсов.',stages:[
      {title:'Полный маршрут',note:'Альтернатива отдельным курсам',courses:[183142,187192]},
      {title:'Профильные пакеты',note:'Выберите нужное направление',courses:[187189,187191]}
    ]},
    {id:'other',title:'Другие интересы',symbol:'Aa',color:'#b46d94',tint:'#fcf0f6',line:'#f0dbe7',description:'Отдельная ветка, не связанная с порядком изучения программирования.',stages:[
      {title:'Немецкий язык',note:'Начало с нуля',courses:[290059]}
    ]}
  ],
  courses: [
    {id:305666,title:'Go-шечка (mini)',track:'go',free:true,current:true,description:'Вы сейчас здесь. Начнём с первых команд, переменных, условий, циклов и функций.'},
    {id:300562,title:'Go-шечка (pro)',track:'go',free:false,description:'Практика Go: от первых программ до сервиса с HTTP, SQL, Docker и микросервисами.'},
    {id:300560,title:'GO Exclusive',track:'go',free:true,description:'Ещё один формат изучения Go: инженерная история, задания, мастерские и самостоятельные миссии. Не обязательная ступень после pro.'},
    {id:214176,title:'Веб-разработка для начинающих',track:'web',free:true,description:'Один из вводных маршрутов в веб-разработку. Подходит для знакомства с направлением.'},
    {id:187918,title:'HTML CSS (mini)',track:'web',free:true,description:'Вводный формат знакомства со структурой страниц и их оформлением.'},
    {id:135466,title:'HTML CSS JS',track:'web',free:true,description:'Как HTML, CSS и JavaScript вместе превращают идею в работающую веб-страницу.'},
    {id:193612,title:'HTML CSS JS (lite)',track:'web',free:true,description:'Ещё один вводный формат веб-разработки. Сравните программу с другими курсами этого этапа.'},
    {id:177582,title:'HTML CSS (lite)',track:'web',free:false,description:'Основы структуры и оформления веб-страниц. Альтернатива другим вводным программам по HTML и CSS.'},
    {id:170115,title:'HTML CSS (pro)',track:'web',free:false,description:'HTML, CSS, адаптивная вёрстка и инструменты работы над страницами.'},
    {id:289356,title:'HTML Exclusive',track:'web',free:false,description:'Отдельная программа по HTML. Выбирайте подходящий формат по программе и своему опыту.'},
    {id:158971,title:'JavaScript (lite)',track:'web',free:false,description:'Основы JavaScript и интерактивные веб-страницы. Перед стартом пригодятся HTML и CSS.'},
    {id:191652,title:'JavaScript (pro)',track:'web',free:false,description:'Практика JavaScript для разработки веб-приложений. Выбирайте глубину после знакомства с основами веба.'},
    {id:290426,title:'TypeScript (mini)',track:'web',free:false,description:'Типы и инструменты TypeScript для тех, кто уже уверенно работает с JavaScript ES6+.'},
    {id:218079,title:'React (mini)',track:'web',free:false,description:'Один из форматов изучения React. До старта разберитесь с JavaScript, HTML и CSS.'},
    {id:216887,title:'React (lite)',track:'web',free:false,description:'Курс по React. Сравните программу с mini, pro и Exclusive и выберите подходящий формат.'},
    {id:200517,title:'React (pro)',track:'web',free:false,description:'Программа по разработке интерфейсов на React. Понадобятся уверенные основы JavaScript.'},
    {id:290177,title:'React Exclusive',track:'web',free:false,description:'Современный React, компоненты и хуки. Курс предполагает твёрдые знания JavaScript ES6+.'},
    {id:181030,title:'Python',track:'backend',free:false,description:'Начальный курс Python для знакомства с логикой программирования и написанием программ.'},
    {id:181396,title:'Python Exclusive',track:'backend',free:false,description:'Практика Python и простые проекты. По требованиям курса пригодятся базовые знания языка.'},
    {id:300361,title:'Python Exclusive: путешествие по Уралу',track:'backend',free:false,description:'Продолжение путешествия с Python: задачи с данными, базами данных и итоговым приложением. Нужны условия, циклы, коллекции и функции.'},
    {id:181092,title:'PHP (pro)',track:'backend',free:false,description:'Основы PHP и создание динамических веб-приложений. Это отдельная языковая ветка.'},
    {id:290060,title:'C#: Основы',track:'backend',free:false,description:'От переменных и циклов к классам, интерфейсам и структурам. Стартовая точка ветки C#.'},
    {id:290330,title:'C#: Основы LINQ',track:'backend',free:false,description:'Запросы, фильтрация, сортировка и группировка коллекций. После базового C#.'},
    {id:290261,title:'C#: Сайт на ASP.NET',track:'backend',free:false,description:'Веб-приложения на ASP.NET Core. Понадобятся уверенный C# и базовое понимание HTTP.'},
    {id:290423,title:'C#: Работа с базами данных в .NET',track:'backend',free:false,description:'Работа с данными через Entity Framework Core. До курса пригодятся уверенный C# и основы SQL.'},
    {id:218158,title:'GitHub (mini)',track:'tools',free:true,description:'Компактный вводный формат знакомства с GitHub. Можно изучать параллельно с первым языком.'},
    {id:179698,title:'Git и GitHub',track:'tools',free:false,description:'Контроль версий: установка, настройка, репозитории, ветвление и совместная работа.'},
    {id:184095,title:'SQL (lite)',track:'tools',free:false,description:'Основы SQL и работы с базами данных MySQL. Полезно для серверных приложений и ветки .NET.'},
    {id:290054,title:'Docker (mini)',track:'tools',free:false,description:'Знакомство с контейнерами. Подключайте, когда появится задача запускать и переносить проекты.'},
    {id:290248,title:'Алгоритмы и структуры данных',track:'tools',free:false,description:'Поиск, сортировки и структуры данных. Сначала освойте циклы, функции и коллекции на любом языке.'},
    {id:290057,title:'Паттерны ООП',track:'tools',free:false,description:'Решения типовых задач проектирования. Для тех, кто уже работает с классами, объектами и основами ООП.'},
    {id:276638,title:'ИИ для всех: с нуля до своего продукта',track:'ai',free:true,description:'Вводный курс об искусственном интеллекте и применении инструментов к своим идеям.'},
    {id:277096,title:'ИИ для всех: от идеи до заработка',track:'ai',free:false,description:'Программа о прикладном использовании ИИ. Сравните содержание с вводным курсом и своими целями.'},
    {id:183142,title:'FullStack Pro MAX',track:'fullstack',free:false,description:'Комплексная программа: Frontend на HTML, CSS, JavaScript и Backend на PHP, SQL и инструментах разработки.'},
    {id:187192,title:'Пакет FullStack-Разработчик',track:'fullstack',free:false,description:'Пакет программ по клиентской и серверной разработке. Проверяйте состав, чтобы не дублировать отдельные покупки.'},
    {id:187189,title:'Пакет Frontend-Разработчик',track:'fullstack',free:false,description:'Пакет по HTML, CSS, JavaScript и инструментам frontend-разработчика. Альтернатива подбору отдельных курсов.'},
    {id:187191,title:'Пакет Backend-Разработчик',track:'fullstack',free:false,description:'Пакет по PHP, SQL, Git и инструментам серверной разработки. Выбирайте по составу программы.'},
    {id:290059,title:'Немецкий язык',track:'other',free:false,description:'Немецкий с нуля: чтение, базовая грамматика и первые предложения. Отдельная ветка для интересующихся языками.'}
  ]
};

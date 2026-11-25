export const moduleTitle='Подводим итоги';
export const telegram='https://t.me/webosnovy';
export const courses=[
 {id:200517,title:'React (pro)',tag:'Больше возможностей во frontend',mark:'React',color:'#5268d7',text:'Понравилось собирать интерфейс на Vue? Попробуйте React и посмотрите, как те же задачи решаются в другой библиотеке. В программе есть вёрстка по макетам, JavaScript, Tailwind, Sass и проекты на React.',note:'Большая программа, в которую входят и основы HTML, CSS и JavaScript. Сравните темы со своим опытом.'},
 {id:183142,title:'FullStack Pro MAX',tag:'Собирать сайты на другом наборе технологий',mark:'FullStack',color:'#8060ca',text:'Хотите работать не только с Go и Vue? Здесь другой маршрут от макета до сайта. HTML, CSS, Figma и JavaScript для интерфейса, PHP и MySQL для серверной части. Есть отдельные разделы с проектами.',note:'Курс начинается с основ. Темы Git и SQL вам уже знакомы, а PHP и MySQL дают другой вариант серверной разработки.'},
];
export const pages=[
 {slug:'01-summary',title:'Подводим итоги',tab:'Ваш результат',blocks:[
  {p:'Вот и добрались до финала. Помните, как начинали с первой программы на Go? Теперь за плечами не только сам язык. Вы разобрали HTTP, тесты, Git, Docker и работу с базой, а затем добавили к серверу интерфейс на Vue. Эти части больше не существуют отдельно друг от друга.'},
  {widget:'project'},
  {p:'Вот как эти части работают вместе. Vue отправляет заказ, Go проверяет данные, PostgreSQL сохраняет запись. Ответ возвращается в интерфейс, и заказ появляется в истории. Раньше каждую из этих частей мы разбирали отдельно. Теперь вы знаете, как их соединить.'},
  {p:'Если какая-то часть проекта пока не готова, к ней можно вернуться. Дойти до последнего урока и уверенно собрать всё самому не всегда получается в один день. Сохраните код в репозитории, проверьте запуск по README и допишите, как поднять приложение с нуля. Так к своей работе будет проще вернуться и вам, и человеку, которому захотите её показать.'},
  {p:'Спасибо, что прошли этот путь с нами. Мы старались не просто перечислить команды, а показать, как из них получается работающее приложение. Теперь хочется узнать, что оказалось полезным именно для вас.'},
 ]},
 {slug:'02-feedback',title:'Что понравилось, а что улучшить?',tab:'Ваш отзыв',type:'free-answer',blocks:[
  {p:'Расскажите, как вам курс. Что помогло разобраться? Где объяснение оказалось слишком коротким? А может, хотелось больше практики или другого примера? Нам нужны не только хорошие оценки, но и конкретные замечания.'},
  {p:'Необязательно отвечать на всё. Можно написать про один урок, задачу или часть проекта. Если встретили ошибку, добавьте ссылку на шаг и опишите, что не получилось. Так мы поймём, что стоит поправить, а что развивать дальше.'},
 ]},
 {slug:'03-telegram',title:'Не теряемся',tab:'Telegram',blocks:[
  {p:'Урок закончился, а связь с нами остаётся. Новости курсов, обновления и новые материалы публикуем в Telegram. Если хотите знать, что готовим дальше, заглядывайте в @webosnovy.'},
  {widget:'telegram'},
  {telegram:true},
  {p:'Вопросы по конкретной задаче лучше оставлять под нужным шагом в Stepik. Там будут и ваш код, и условие, и обсуждение с другими учениками.'},
 ]},
 {slug:'04-next',title:'Что делать дальше',tab:'Следующий шаг',blocks:[
  {p:'Свой сервис уже даёт вам основу для следующего проекта. Теперь можно глубже заняться интерфейсами или попробовать другой набор технологий. Мы выбрали две большие программы для тех, кто хочет продолжить учиться с нами.'},
  {p:'Выбирайте направление, которое хочется применять в работе. На страницах курсов есть полная программа и актуальные условия. Часть основ будет знакома, поэтому посмотрите, какие темы станут новыми именно для вас.'},
  {courses:true},
  {map:true},
  {p:'Спасибо, что учились с нами. Будем рады увидеть, что вы соберёте дальше.'},
 ]},
];

export const widgets={
  "project": "<section class=\"project-demo\" data-stage=\"0\" data-outcome=\"idle\" aria-label=\"Vue отправляет заказ, Go проверяет данные, PostgreSQL сохраняет запись. Ответ возвращается в историю заказов.\"><div class=\"scene-head\"><span>Ваше приложение</span><span class=\"stack-label\">Vue + Go + PostgreSQL</span></div><div class=\"system-scene\" aria-hidden=\"true\"><svg class=\"wires\" viewBox=\"0 0 800 130\" preserveAspectRatio=\"none\"><path class=\"wire\" d=\"M130 60H670\"/><path class=\"signal\" d=\"M130 60H670\"/></svg><div class=\"system-node node-vue\"><div class=\"node-art ui-art\"><i></i><span></span><span></span><b></b></div><strong>Vue</strong><small data-ui-state>Готов</small></div><div class=\"system-node node-go\"><div class=\"node-art server-art\"><i></i><i></i><i></i><b>Go</b></div><strong>Go API</strong><small data-api-state>Готов</small></div><div class=\"system-node node-sql\"><div class=\"node-art db-art\"><i></i><i></i><i></i></div><strong>PostgreSQL</strong><small data-db-state>Ожидает</small></div><div class=\"request-token\"></div></div><div class=\"response-panel\" aria-hidden=\"true\"><span class=\"response-led\"></span><p data-result>Один заказ, весь путь</p><code data-http>POST /orders</code></div></section>",
  "telegram": "<section class=\"telegram-scene\" aria-label=\"Новости, материалы и обновления в Telegram\"><div class=\"telegram-halo\" aria-hidden=\"true\"></div><div class=\"telegram-core\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"m22 2-7 20-4-9-9-4 20-7Z\"/><path d=\"M22 2 11 13\"/></svg></div><div class=\"telegram-topics\"><span class=\"news-card\">Новости</span><span class=\"news-card\">Обновления</span><span class=\"news-card\">Материалы</span></div></section>"
};

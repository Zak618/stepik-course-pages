/**
 * Local lesson data only; no execution, network requests or publication.
 * Eight Go tasks and one single-choice quiz, each planned for 10 points.
 * requirements are lightweight regex hints, NOT a robust Stepik grader.
 * Each variant replaces `from` with `to` once in a fresh copy of learner code;
 * variants are independent, not cumulative. Never execute arbitrary learner
 * code without the preview server's dedicated syntax validation and isolation.
 * Language references: https://go.dev/ref/spec#Variable_declarations
 * https://go.dev/ref/spec#Assignments and https://pkg.go.dev/fmt#Println
 */
export const tasks = {
  2: {
    title: 'Текст или значение переменной?',
    type: 'code', cost: 10, language: 'go',
    brief: `<p>В одном вызове выведем имя как обычный текст, а в другом — сохранённый запрос. Объявите внутри <code>main</code> переменную <code>query := "циклы"</code>. Выведите сначала слово <code>query</code>, а следующей строкой — значение переменной.</p>
      <p>Для первой строки передайте в <code>fmt.Println</code> текст в кавычках, для второй — имя без кавычек. Сохраните имя <code>query</code>: дальше мы будем менять её значение. Читать что-либо с клавиатуры не нужно.</p>`,
    starter: `package main

import "fmt"

func main() {
	// Сохраните запрос, затем напечатайте имя и значение.
}
`,
    expected: 'query\nциклы\n',
    solution: `package main

import "fmt"

func main() {
	query := "циклы"
	fmt.Println("query")
	fmt.Println(query)
}
`,
    hints: [
      'Создайте переменную до команд вывода: query := "циклы".',
      'fmt.Println("query") напечатает слово query. В следующем вызове уберите кавычки вокруг имени.',
    ],
    explanation: `<p>Кавычки меняют смысл записи. <code>"query"</code> — готовая строка из пяти букв. Go не ищет переменную с таким именем: он просто печатает этот текст.</p>
      <p>Запись <code>query</code> без кавычек обращается к переменной. На этой строке в ней хранится <code>"циклы"</code>, поэтому второй вызов выводит именно запрос. Если поменять значение при объявлении, изменится вторая строка, но не первая.</p>`,
    requirements: [
      { pattern: '\\bquery\\s*:=', message: 'Объявите query с помощью :=, как просит условие.' },
      { pattern: 'fmt\\s*\\.\\s*Println\\s*\\(\\s*query\\s*\\)', message: 'Выведите значение query без кавычек через fmt.Println(query).' },
    ],
    variants: [
      { from: '"циклы"', to: '"функции"', expected: 'query\nфункции\n' },
      { from: '"циклы"', to: '"Go и поиск"', expected: 'query\nGo и поиск\n' },
    ],
  },
  4: {
    title: 'Запрос изменился.',
    type: 'code', cost: 10, language: 'go',
    brief: `<p>Пользователь сначала искал «циклы», потом заменил запрос на «функции». В программе уже есть оба значения и две команды вывода, но второй раз переменную пытаются объявить заново. Найдите и исправьте эту строку.</p>
      <p>Сохраните одну переменную <code>query</code> в том же теле <code>main</code>: сначала выведите её старое значение, затем присвойте новое через <code>=</code> и выведите ещё раз. Менять слова, добавлять вложенные блоки или печатать ответы вместо переменной не нужно.</p>`,
    starter: `package main

import "fmt"

func main() {
	query := "циклы"
	fmt.Println(query)
	query := "функции"
	fmt.Println(query)
}
`,
    expected: 'циклы\nфункции\n',
    solution: `package main

import "fmt"

func main() {
	query := "циклы"
	fmt.Println(query)
	query = "функции"
	fmt.Println(query)
}
`,
    hints: [
      'В первой строке query ещё нет — там := на своём месте. После первого вывода переменная уже существует.',
      'Во второй записи query := "функции" уберите двоеточие. Знак = заменит значение существующей переменной.',
    ],
    explanation: `<p>В первом объявлении <code>:=</code> создаёт <code>query</code> и сохраняет «циклы». Но во второй такой же записи в этом блоке нового имени нет. Поэтому Go останавливает сборку: повторить объявление одной той же переменной таким способом нельзя.</p>
      <p>Присваивание <code>query = "функции"</code> меняет уже существующее значение. Первая команда вывода успела напечатать «циклы»; назад она не выполняется и её результат не переписывается. Вторая команда читает обновлённый запрос.</p>`,
    requirements: [
      { pattern: '\\bquery\\s*=(?!=)', message: 'Для смены уже объявленного query используйте =, а не второе :=.' },
    ],
    variants: [
      { from: '"циклы"', to: '"строки"', expected: 'строки\nфункции\n' },
      { from: '"функции"', to: '"переменные"', expected: 'циклы\nпеременные\n' },
    ],
  },
  6: {
    title: 'Три настройки Find.',
    type: 'code', cost: 10, language: 'go',
    brief: `<p>Подготовим настройки: <code>title</code> хранит название <code>"Go-шечка Find"</code>, <code>limit</code> — число <code>5</code>, а <code>exact</code> — значение <code>false</code>. Последняя настройка будет отвечать за точный поиск; пока мы только сохраняем и показываем её.</p>
      <p>Объявите эти три переменные и выведите каждую отдельной строкой в порядке <code>title</code>, <code>limit</code>, <code>exact</code>. Подписи не добавляйте. У числа и логического значения кавычек быть не должно: это <code>int</code> и <code>bool</code>, а не строки.</p>`,
    starter: `package main

import "fmt"

func main() {
	// Объявите title, limit и exact, затем выведите их значения.
}
`,
    expected: 'Go-шечка Find\n5\nfalse\n',
    solution: `package main

import "fmt"

func main() {
	title := "Go-шечка Find"
	limit := 5
	exact := false
	fmt.Println(title)
	fmt.Println(limit)
	fmt.Println(exact)
}
`,
    hints: [
      'Начните с title := "Go-шечка Find". Объявления limit и exact устроены так же, но их значения пишутся без кавычек.',
      'Используйте три вызова fmt.Println: сначала передайте title, затем limit, затем exact.',
    ],
    explanation: `<p>Go определяет тип по начальному значению: название в кавычках даёт <code>string</code>, целое число <code>5</code> в таком объявлении — <code>int</code>, а <code>false</code> — <code>bool</code>. Для тех же переменных можно явно указать эти типы с помощью <code>var</code>.</p>
      <p>По одному выводу нельзя отличить число <code>5</code> от строки <code>"5"</code>: выглядеть они будут одинаково. Разница проявится в действиях с ними. Поэтому здесь важно не только получить три строки, но и сохранить значения подходящих типов.</p>`,
    requirements: [
      { pattern: '\\b(?:title\\s*:=|var\\s+title\\b)', message: 'Сохраните название в переменной title.' },
      { pattern: '\\blimit\\s*(?::=|(?:int\\s*)?=)\\s*5\\b', message: 'Начальное значение limit — целое число 5 без кавычек.' },
      { pattern: '\\bexact\\s*(?::=|(?:bool\\s*)?=)\\s*false\\b', message: 'Начальное значение exact — false без кавычек.' },
    ],
    variants: [
      { from: '"Go-шечка Find"', to: '"Find: мои заметки"', expected: 'Find: мои заметки\n5\nfalse\n' },
      { from: '5', to: '8', expected: 'Go-шечка Find\n8\nfalse\n' },
      { from: 'false', to: 'true', expected: 'Go-шечка Find\n5\ntrue\n' },
    ],
  },
  8: {
    title: 'Ещё одно совпадение.',
    type: 'code', cost: 10, language: 'go',
    brief: `<p>В коллекции <code>total := 12</code> записей. Уже проверены <code>checked := 5</code>, среди них нашлось <code>found := 2</code> совпадения. Исправим подсчёт: одна из этих пяти записей тоже подходит. Увеличьте <code>found</code> на единицу выражением <code>found = found + 1</code>; число проверенных записей не меняйте.</p>
      <p>Затем объявите <code>remaining</code> и вычислите его как <code>total - checked</code>. Выведите сначала обновлённое <code>found</code>, затем <code>remaining</code>, каждое с новой строки. Не подставляйте готовые числа <code>3</code> и <code>7</code>: результат должен считаться из переменных.</p>`,
    starter: `package main

import "fmt"

func main() {
	total := 12
	checked := 5
	found := 2
	// Учтите ещё одно совпадение и вычислите остаток.
}
`,
    expected: '3\n7\n',
    solution: `package main

import "fmt"

func main() {
	total := 12
	checked := 5
	found := 2
	found = found + 1
	remaining := total - checked
	fmt.Println(found)
	fmt.Println(remaining)
}
`,
    hints: [
      'В found = found + 1 правая часть сначала читает старое значение found. Результат заменяет его новым.',
      'remaining := total - checked создаёт переменную остатка. После этого напечатайте found и remaining двумя вызовами fmt.Println.',
    ],
    explanation: `<p>Правая часть присваивания вычисляется до изменения переменной. При <code>found = found + 1</code> мы берём текущее число <code>2</code>, прибавляем единицу и сохраняем <code>3</code>. Это не математическое равенство, а действие программы.</p>
      <p>Остаток равен числу всех записей минус число проверенных: <code>12 - 5 = 7</code>. Уточнение одного совпадения не означает проверку ещё одной записи, поэтому <code>checked</code> остаётся равным пяти. Если коллекция изменится, выражение пересчитает остаток без ручной правки ответа.</p>`,
    requirements: [
      { pattern: '\\bfound\\s*=\\s*found\\s*\\+\\s*1\\b', message: 'Для этого упражнения запишите обновление как found = found + 1.' },
      { pattern: '\\bremaining\\s*(?::=|(?:int\\s*)?=)\\s*total\\s*-\\s*checked\\b', message: 'Вычислите remaining из total - checked, не записывайте готовый ответ.' },
    ],
    variants: [
      { from: 'total := 12', to: 'total := 20', expected: '3\n15\n' },
      { from: 'checked := 5', to: 'checked := 12', expected: '3\n0\n' },
      { from: 'found := 2', to: 'found := 0', expected: '1\n7\n' },
    ],
  },
  12: {
    title: 'Find ещё ничего не искал.',
    type: 'code', cost: 10, language: 'go',
    brief: `<p>Поиск только открылся: запроса ещё нет, совпадения не подсчитаны, точный режим не включён. Объявите три переменные без начальных значений: <code>var query string</code>, <code>var found int</code> и <code>var exact bool</code>. Пусть Go сам задаст им нулевые значения.</p>
      <p>Выведите <code>query</code> между квадратными скобками без пробелов внутри: для этого подойдёт <code>fmt.Print("[", query, "]\\n")</code>. Следующими двумя строками выведите <code>found</code> и <code>exact</code>. Ничего не присваивайте этим переменным после объявления.</p>`,
    starter: `package main

import "fmt"

func main() {
	// Объявите три переменные без начальных значений.
	// Покажите пустой запрос в скобках, число и логическое значение.
}
`,
    expected: '[]\n0\nfalse\n',
    solution: `package main

import "fmt"

func main() {
	var query string
	var found int
	var exact bool
	fmt.Print("[", query, "]\\n")
	fmt.Println(found)
	fmt.Println(exact)
}
`,
    hints: [
      'У объявления var query string нет знака =. Аналогично объявите found с типом int и exact с типом bool.',
      'fmt.Print("[", query, "]\\n") покажет пустую строку как []. Два следующих fmt.Println выведут found и exact.',
    ],
    explanation: `<p>Без начального значения <code>string</code> получает пустую строку <code>""</code>, <code>int</code> — <code>0</code>, а <code>bool</code> — <code>false</code>. Это определённые значения Go, а не случайное содержимое памяти. Тип всё равно нужен: по пустому объявлению компилятор не сможет его угадать.</p>
      <p>Скобки позволяют заметить пустую строку: между ними ничего нет, но сама строка существует. Для скобок мы использовали <code>Print</code>, который не вставляет пробелы между этими строковыми аргументами. В конце явно добавили <code>\\n</code>; обычные число и логическое значение вывели через <code>Println</code>.</p>`,
    requirements: [
      { pattern: '\\bvar\\s+query\\s+string\\s*(?:;|\\r?\\n)', message: 'Объявите var query string без начального значения.' },
      { pattern: '\\bvar\\s+found\\s+int\\s*(?:;|\\r?\\n)', message: 'Объявите var found int без начального значения.' },
      { pattern: '\\bvar\\s+exact\\s+bool\\s*(?:;|\\r?\\n)', message: 'Объявите var exact bool без начального значения.' },
    ],
  },
  14: {
    title: 'Заголовок с пробелом.',
    type: 'code', cost: 10, language: 'go',
    brief: `<p>Данные уже готовы: <code>query := "циклы"</code>, <code>found := 3</code>. Соберите переменную <code>heading</code> из строки <code>"Поиск: "</code> и значения <code>query</code> с помощью <code>+</code>. Выведите готовый заголовок первой строкой. Пробел после двоеточия входит в строку.</p>
      <p>Вторую строку выведите одним вызовом <code>fmt.Println("Найдено:", found)</code>. Здесь после двоеточия пробел внутри кавычек не нужен: <code>Println</code> добавит его между двумя аргументами. В итоге в каждой строке между подписью и значением должен быть ровно один пробел.</p>`,
    starter: `package main

import "fmt"

func main() {
	query := "циклы"
	found := 3
	// Соберите heading и выведите две строки.
}
`,
    expected: 'Поиск: циклы\nНайдено: 3\n',
    solution: `package main

import "fmt"

func main() {
	query := "циклы"
	found := 3
	heading := "Поиск: " + query
	fmt.Println(heading)
	fmt.Println("Найдено:", found)
}
`,
    hints: [
      'heading := "Поиск: " + query склеит две строки. Оператор + не вставляет пробел сам.',
      'Для второй строки передайте "Найдено:" и found через запятую в один fmt.Println. Число не нужно превращать в строку.',
    ],
    explanation: `<p>В <code>heading := "Поиск: " + query</code> оба значения — строки. Оператор <code>+</code> соединяет их как есть: пробел сохраняется только потому, что записан после двоеточия внутри первой строки. Если его убрать, получится «Поиск:циклы».</p>
      <p>В <code>fmt.Println("Найдено:", found)</code> ничего склеивать не нужно: функция получает два аргумента, сама выводит их через пробел и завершает строку. Строку и число нельзя сложить через <code>+</code>, но можно передать вместе в <code>Println</code>.</p>`,
    requirements: [
      { pattern: '\\bheading\\s*(?::=|(?:string\\s*)?=)\\s*"Поиск: "\\s*\\+\\s*query\\b', message: 'Сохраните в heading результат "Поиск: " + query.' },
      { pattern: 'fmt\\s*\\.\\s*Println\\s*\\(\\s*"Найдено:"\\s*,\\s*found\\s*\\)', message: 'Выведите подпись и число одним вызовом fmt.Println("Найдено:", found).' },
    ],
    variants: [
      { from: '"циклы"', to: '"строки и числа"', expected: 'Поиск: строки и числа\nНайдено: 3\n' },
      { from: 'found := 3', to: 'found := 0', expected: 'Поиск: циклы\nНайдено: 0\n' },
    ],
  },
  15: {
    title: 'Три правки до запуска.',
    type: 'code', cost: 10, language: 'go',
    brief: `<p>В этом файле три проблемы: счётчик <code>found</code> объявлен строкой вместо числа; следующая строка пытается заново объявить то же имя; запрос <code>query</code> сохранён, но нигде не используется. Исправьте каждую проблему, не удаляя переменные и увеличение счётчика.</p>
      <p>Go не разрешает оставить объявленную внутри функции переменную неиспользованной. Компилятор может написать <code>declared and not used</code> — «объявлена и не используется». Нам нужен запрос на экране, поэтому используем его в команде вывода.</p>
      <p>Сохраните исходные данные «циклы» и число <code>2</code>. После объявления увеличьте счётчик на единицу через <code>found = found + 1</code>. Перед выводом счётчика добавьте вывод <code>query</code>, чтобы программа напечатала запрос, затем число совпадений — двумя строками без подписей.</p>`,
    starter: `package main

import "fmt"

func main() {
	query := "циклы"
	found := "2"
	found := found + 1
	fmt.Println(found)
}
`,
    expected: 'циклы\n3\n',
    solution: `package main

import "fmt"

func main() {
	query := "циклы"
	found := 2
	found = found + 1
	fmt.Println(query)
	fmt.Println(found)
}
`,
    hints: [
      'Сначала уберите кавычки вокруг 2. Затем во второй записи found замените := на =: счётчик уже объявлен.',
      'Перед fmt.Println(found) добавьте fmt.Println(query). Это и выведет запрос, и устранит ошибку неиспользуемой переменной.',
    ],
    explanation: `<p>Кавычки превращали <code>"2"</code> в строку, к которой нельзя прибавить число <code>1</code>. После замены на <code>2</code> у <code>found</code> тип <code>int</code>, и сложение становится допустимым. Замена второго <code>:=</code> на <code>=</code> исправляет отдельную проблему повторного объявления.</p>
      <p>Локальную переменную нельзя объявить и оставить неиспользованной. Нам действительно нужен запрос на экране, поэтому используем его в <code>fmt.Println(query)</code>, а не удаляем или прячем. Здесь три исправления: тип, присваивание и использование запроса; компилятор может сообщить о них не все сразу.</p>`,
    requirements: [
      { pattern: '\\bfound\\s*(?::=|(?:int\\s*)?=)\\s*2\\b', message: 'Начальное значение found должно быть числом 2, не строкой "2".' },
      { pattern: '\\bfound\\s*=\\s*found\\s*\\+\\s*1\\b', message: 'Сохраните увеличение счётчика: found = found + 1.' },
      { pattern: 'fmt\\s*\\.\\s*Println\\s*\\(\\s*query\\s*\\)', message: 'Используйте query в команде вывода, не удаляйте запрос.' },
    ],
    variants: [
      { from: '"циклы"', to: '"ошибки"', expected: 'ошибки\n3\n' },
      { from: '2', to: '6', expected: 'циклы\n7\n' },
    ],
  },
  16: {
    title: 'Экран Go-шечки Find.',
    type: 'code', cost: 10, language: 'go',
    brief: `<p>Соберём всё вместе. Исходные данные уже в редакторе. Сразу после объявления <code>query</code> сохраните его значение в <code>saved</code>, затем замените <code>query</code> на <code>"функции"</code>. После объявлений счётчиков вычислите <code>remaining</code> как <code>total - checked</code> и увеличьте <code>found</code> через <code>found = found + 1</code>. Названия переменных и исходные значения сохраните.</p>
      <p>Выведите пять строк: название приложения; <code>Было:</code> и сохранённый запрос; <code>Поиск:</code> и текущий запрос; <code>Найдено:</code>, число совпадений, <code>Осталось:</code> и остаток; <code>Точный поиск:</code> и значение <code>exact</code>. Для каждой строки используйте один <code>fmt.Println</code> с нужными аргументами через запятую. Это пока экран с подготовленными данными, а не поиск по настоящей коллекции.</p>`,
    starter: `package main

import "fmt"

func main() {
	app := "Go-шечка Find"
	query := "циклы"
	// Здесь сохраните старый запрос и замените текущий.
	total := 12
	checked := 5
	found := 2
	exact := false
	// Вычислите остаток, увеличьте found и выведите экран.
}
`,
    expected: 'Go-шечка Find\nБыло: циклы\nПоиск: функции\nНайдено: 3 Осталось: 7\nТочный поиск: false\n',
    solution: `package main

import "fmt"

func main() {
	app := "Go-шечка Find"
	query := "циклы"
	saved := query
	query = "функции"
	total := 12
	checked := 5
	remaining := total - checked
	found := 2
	found = found + 1
	exact := false
	fmt.Println(app)
	fmt.Println("Было:", saved)
	fmt.Println("Поиск:", query)
	fmt.Println("Найдено:", found, "Осталось:", remaining)
	fmt.Println("Точный поиск:", exact)
}
`,
    hints: [
      'До query = "функции" запишите saved := query. Остаток считайте из total и checked, а не записывайте готовое число.',
      'Четвёртая строка: fmt.Println("Найдено:", found, "Осталось:", remaining). Println вставит пробелы между всеми аргументами.',
    ],
    explanation: `<p>Переменные хранят разные части состояния Find. <code>saved := query</code> копирует прежний запрос, поэтому после <code>query = "функции"</code> строка «Было» всё ещё показывает «циклы». Числа тоже получены из данных: <code>remaining</code> равен семи, обновлённый <code>found</code> — трём.</p>
      <p>Вывод больше не зависит от вручную набранного ответа. Замените начальный запрос, количество записей или логическую настройку — соответствующие строки экрана изменятся. Мы ещё не проверяем записи и не читаем ввод: сейчас задача экрана — честно показать значения, которые программа сохранила и вычислила.</p>`,
    requirements: [
      { pattern: '\\bsaved\\s*(?::=|(?:string\\s*)?=)\\s*query\\b', message: 'Сохраните прежнее значение query в saved до смены запроса.' },
      { pattern: '\\bquery\\s*=\\s*"функции"', message: 'После сохранения запроса присвойте query строку "функции".' },
      { pattern: '\\bremaining\\s*(?::=|(?:int\\s*)?=)\\s*total\\s*-\\s*checked\\b', message: 'Остаток должен вычисляться как total - checked.' },
      { pattern: '\\bfound\\s*=\\s*found\\s*\\+\\s*1\\b', message: 'Обновите счётчик выражением found = found + 1.' },
    ],
    variants: [
      { from: '"циклы"', to: '"строки"', expected: 'Go-шечка Find\nБыло: строки\nПоиск: функции\nНайдено: 3 Осталось: 7\nТочный поиск: false\n' },
      { from: '"функции"', to: '"пакеты"', expected: 'Go-шечка Find\nБыло: циклы\nПоиск: пакеты\nНайдено: 3 Осталось: 7\nТочный поиск: false\n' },
      { from: 'total := 12', to: 'total := 18', expected: 'Go-шечка Find\nБыло: циклы\nПоиск: функции\nНайдено: 3 Осталось: 13\nТочный поиск: false\n' },
      { from: 'checked := 5', to: 'checked := 12', expected: 'Go-шечка Find\nБыло: циклы\nПоиск: функции\nНайдено: 3 Осталось: 0\nТочный поиск: false\n' },
      { from: 'found := 2', to: 'found := 0', expected: 'Go-шечка Find\nБыло: циклы\nПоиск: функции\nНайдено: 1 Осталось: 7\nТочный поиск: false\n' },
      { from: 'false', to: 'true', expected: 'Go-шечка Find\nБыло: циклы\nПоиск: функции\nНайдено: 3 Осталось: 7\nТочный поиск: true\n' },
    ],
  },
};

export const quiz = {
  10: {
    title: 'Проверим знания', nav: 'Какой запрос сохранился?',
    type: 'choice', cost: 10,
    prompt: '<p>Сначала запрос скопировали в <code>saved</code>, затем изменили <code>query</code>. Что выведет программа? Порядок строк важен.</p>',
    code: `package main

import "fmt"

func main() {
	query := "циклы"
	saved := query
	query = "функции"
	fmt.Println(saved)
	fmt.Println(query)
}
`,
    options: [
      'функции\nфункции',
      'циклы\nфункции',
      'циклы\nциклы',
      'Ошибка сборки: saved нельзя присвоить значение другой переменной.',
    ],
    correct: 1,
    hints: [
      'Вспомните значение query именно в тот момент, когда выполняется saved := query.',
      'Присваивание копирует текущее значение строки. Последующая смена query сама по себе не изменяет saved.',
    ],
    explanation: `<p>Когда выполняется <code>saved := query</code>, в <code>query</code> находится строка «циклы». Именно это значение получает <code>saved</code>. Это не инструкция каждый раз заглядывать в <code>query</code> и не связь, по которой изменения переходят в другую переменную.</p>
      <p>Следующая строка меняет только <code>query</code>. Поэтому первый вывод показывает «циклы», второй — «функции». Никакой ошибки сборки здесь нет: значение одной строковой переменной можно присвоить другой.</p>`,
  },
};

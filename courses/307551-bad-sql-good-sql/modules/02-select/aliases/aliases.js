import {projected, commaResult} from './models.mjs';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const e = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function table(data) {return '<table class="data-table"><thead><tr>' + data.columns.map(column => '<th>' + e(column) + '</th>').join('') + '</tr></thead><tbody>' + data.rows.map(row => '<tr>' + row.map(value => '<td>' + e(value) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';}
function animateHeader(node) {if (!reduced()) node.animate([{opacity:.15,transform:'translateY(-10px) scale(.95)',filter:'blur(2px)'},{opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0)'}],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)'});}
const rename = document.querySelector('[data-rename]');
if (rename) {
  const select = rename.querySelector('select'), aliases = {product_name:'product_name',title:'title',name:'name'};
  rename.querySelector('[data-original]').innerHTML = table(projected('products', ['name']));
  rename.querySelector('[data-renamed]').innerHTML = table(projected('products', ['name'], [select.value]));
  const render = animate => {
    const alias = aliases[select.value], header = rename.querySelector('[data-renamed] th');
    header.textContent = alias;
    rename.querySelector('[data-rename-query]').textContent = alias === 'name' ? 'SELECT name\nFROM products;' : 'SELECT name AS ' + alias + '\nFROM products;';
    rename.querySelector('[data-rename-status]').textContent = alias === 'name' ? 'Заголовок совпадает с полем name.' : 'В products остаётся поле name.';
    if (animate) animateHeader(header);
  };
  select.addEventListener('change', () => render(true)); render(false);
}
const comma = document.querySelector('[data-comma]');
if (comma) {
  let fixed = false;
  const render = () => {
    comma.querySelector('[data-comma-query]').innerHTML = fixed ? 'SELECT name<span class="comma-mark">,</span> price\nFROM products;' : 'SELECT name price\nFROM products;';
    comma.querySelector('[data-read-as]').textContent = fixed ? 'name и price' : 'name AS price';
    comma.querySelector('[data-comma-result]').innerHTML = table(commaResult(fixed));
    comma.querySelector('button').textContent = fixed ? 'Убрать запятую' : 'Вернуть запятую';
    comma.querySelector('[data-comma-status]').textContent = fixed ? 'Два столбца. Названия и настоящие цены.' : 'Один столбец price. Внутри названия товаров, не цены.';
  };
  comma.querySelector('button').addEventListener('click', () => {fixed = !fixed; render(); if (!reduced()) [...comma.querySelectorAll('th,tbody tr')].forEach((node,i)=>node.animate([{opacity:.2,transform:'translateX(12px)'},{opacity:1,transform:'translateX(0)'}],{duration:430,delay:i*35,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}));}); render();
}
for (const form of document.querySelectorAll('[data-alias-task]')) form.addEventListener('submit', async event => {
  event.preventDefault(); const button = form.querySelector('button'), feedback = form.querySelector('[data-feedback]'); if (button.disabled) return;
  button.disabled = true; feedback.textContent = 'Проверяю запрос…'; delete feedback.dataset.correct; form.querySelector('[data-sql-result]').innerHTML = '';
  try {
    const response = await fetch('/api/sql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:form.dataset.aliasTask,sql:form.querySelector('textarea').value})}), result = await response.json();
    feedback.textContent = result.message; feedback.dataset.correct = String(result.correct === true);
    if (result.columns?.length) form.querySelector('[data-sql-result]').innerHTML = '<div class="table-box result-box">' + table(result) + '</div>';
  } catch {feedback.textContent = 'Не удалось проверить запрос. Попробуйте ещё раз.'; feedback.dataset.correct = 'false';} finally {button.disabled = false;}
});

import {tables, project, schemaResults} from './models.mjs';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function table(data, {source = false, selected = [], added = false} = {}) {
  const weights = {id: 14, name: 34, price: 28, stock: 24, delivery_days: 26}, sum = data.columns.reduce((value, column) => value + (weights[column] ?? 25), 0);
  return '<table class="data-table' + (source ? ' source-table' : '') + '"><thead><tr>' + data.columns.map(column => '<th data-field="' + column + '" style="width:' + (weights[column] ?? 25) / sum * 100 + '%"' + (added && column === 'delivery_days' ? ' class="new-column"' : '') + '>' + (source ? '<button type="button" class="column-toggle" data-column="' + column + '" aria-pressed="' + selected.includes(column) + '" aria-label="Столбец ' + column + '"><span class="check" aria-hidden="true"></span>' + column + '</button>' : escape(column)) + '</th>').join('') + '</tr></thead><tbody>' + (data.rows.length ? data.rows.map(row => '<tr>' + row.map((value, i) => '<td data-field="' + data.columns[i] + '" data-selected="' + selected.includes(data.columns[i]) + '"' + (added && data.columns[i] === 'delivery_days' ? ' class="new-column"' : '') + '>' + escape(value) + '</td>').join('') + '</tr>').join('') : '<tr class="placeholder"><td colspan="' + data.columns.length + '">0 строк</td></tr>') + '</tbody></table>';
}
function pulse(nodes, axis = 'y') {
  if (reduced()) return;
  [...nodes].forEach((node, i) => node.animate([{opacity: .3, transform: axis === 'x' ? 'translateX(14px)' : 'translateY(9px)'}, {opacity: 1, transform: 'translate(0)'}], {duration: 380, delay: i * 32, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards'}));
}
function fly(lab, column, from) {
  if (reduced() || !from) return;
  const to = lab.querySelector('[data-result] th[data-field="' + column + '"]');
  if (!to) return;
  const origin = lab.getBoundingClientRect(), end = to.getBoundingClientRect(), token = document.createElement('span');
  token.className = 'flight-token'; token.textContent = column; token.setAttribute('aria-hidden', 'true');
  token.style.left = from.left - origin.left + 'px'; token.style.top = from.top - origin.top + 'px'; lab.append(token);
  const animation = token.animate([{opacity: 0, transform: 'translate(0,0) scale(.9)'}, {opacity: 1, offset: .2}, {opacity: 0, transform: `translate(${end.left - from.left}px,${end.top - from.top}px) scale(1.06)`}], {duration: 630, easing: 'cubic-bezier(.3,.1,.25,1)'});
  animation.finished.then(() => token.remove(), () => token.remove());
}

const projection = document.querySelector('[data-projection]');
if (projection) {
  let columns = ['name', 'price'], caseIndex = 0;
  const render = () => {
    projection.querySelector('[data-source]').innerHTML = table(project('products', tables.products.columns, caseIndex), {source: true, selected: columns});
    const query = projection.querySelector('[data-query]');
    query.textContent = columns.length ? 'SELECT ' + columns.join(', ') + '\nFROM products;' : '';
    projection.querySelector('[data-query-box]').hidden = !columns.length;
    projection.querySelector('[data-result]').innerHTML = columns.length ? table(project('products', columns, caseIndex)) : '<table class="data-table"><tbody><tr class="placeholder"><td>Выберите хотя бы один столбец</td></tr></tbody></table>';
    projection.querySelector('[data-shape]').textContent = columns.length ? columns.length + ' из 4 столбцов' : '';
    const rowCount = tables.products.cases[caseIndex].length;
    projection.querySelector('[data-status]').textContent = columns.length ? (caseIndex === 3 ? 'Таблица пуста. Названия выбранных столбцов на месте.' : rowCount + (rowCount === 1 ? ' строка.' : ' строки.') + ' Данные в products не изменились.') : 'Без списка полей запрос не сформирован.';
  };
  projection.querySelector('[data-source]').addEventListener('click', event => {
    const button = event.target.closest('[data-column]'); if (!button) return;
    const column = button.dataset.column, wasSelected = columns.includes(column), from = button.getBoundingClientRect();
    columns = wasSelected ? columns.filter(value => value !== column) : [...columns, column]; render();
    projection.querySelector('[data-column="' + column + '"]').focus({preventScroll: true});
    pulse(projection.querySelectorAll('[data-result] tbody tr'));
    if (!wasSelected) fly(projection, column, from);
  });
  projection.querySelector('select').addEventListener('change', event => {caseIndex = Number(event.target.value); render(); pulse(projection.querySelectorAll('[data-result] tbody tr'));});
  render();
}

const schema = document.querySelector('[data-schema-lab]');
if (schema) {
  let added = false;
  const render = () => {
    const data = schemaResults(added);
    schema.querySelector('[data-schema-fields]').textContent = added ? '5 столбцов' : '4 столбца';
    schema.querySelector('[data-star-result]').innerHTML = table(data.star, {added});
    schema.querySelector('[data-explicit-result]').innerHTML = table(data.explicit);
    schema.querySelector('[data-schema-action]').textContent = added ? 'Вернуть прежнюю таблицу' : 'Добавить delivery_days';
    schema.querySelector('[data-schema-status]').textContent = added ? 'Со звёздочкой 5 столбцов. С явным списком по-прежнему 2.' : 'В products 4 столбца. Сравните результаты двух запросов.';
  };
  schema.querySelector('[data-schema-action]').addEventListener('click', () => {added = !added; render(); pulse(schema.querySelectorAll('.new-column'), 'x');});
  render();
}

for (const form of document.querySelectorAll('[data-column-task]')) {
  const button = form.querySelector('button'), feedback = form.querySelector('[data-feedback]');
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (button.disabled) return; button.disabled = true;
    feedback.textContent = 'Проверяю запрос…'; delete feedback.dataset.correct; form.querySelector('[data-sql-result]').innerHTML = '';
    try {
      const response = await fetch('/api/sql', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: form.dataset.columnTask, sql: form.querySelector('textarea').value})});
      const result = await response.json();
      feedback.textContent = result.message; feedback.dataset.correct = String(result.correct === true);
      if (result.columns?.length) form.querySelector('[data-sql-result]').innerHTML = '<div class="table-box result-box">' + table(result) + '</div>';
    } catch {feedback.textContent = 'Не удалось проверить запрос. Попробуйте ещё раз.'; feedback.dataset.correct = 'false';}
    finally {button.disabled = false;}
  });
}

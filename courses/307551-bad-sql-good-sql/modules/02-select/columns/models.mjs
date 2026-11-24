import {tables, rowKey} from '../../01-first-query/select/models.mjs';
import {tasks} from './copy.mjs';
export {tables};

export function project(tableName, columns, caseIndex = 0) {
  const table = tables[tableName];
  if (!table || !Number.isInteger(caseIndex) || !table.cases[caseIndex]) throw Error('Unknown dataset');
  if (!columns.length || columns.some(column => !table.columns.includes(column))) throw Error('Unknown columns');
  return {columns: [...columns], types: columns.map(column => table.types[table.columns.indexOf(column)]),
    rows: table.cases[caseIndex].map(row => columns.map(column => row[table.columns.indexOf(column)]))};
}

export function taskFor(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) throw Error('Неизвестное задание.');
  return task;
}

export function solutionFor(task) {return 'SELECT ' + task.columns.join(', ') + '\nFROM ' + task.table + ';';}

export function matches(task, caseIndex, result) {
  const expected = project(task.table, task.columns, caseIndex);
  return JSON.stringify(result.columns) === JSON.stringify(expected.columns) &&
    JSON.stringify(result.rows.map(row => rowKey(row, expected.types)).sort()) ===
    JSON.stringify(expected.rows.map(row => rowKey(row, expected.types)).sort());
}

export function schemaResults(added = false) {
  const initial = project('products', tables.products.columns);
  return {star: added ? {columns: [...initial.columns, 'delivery_days'], rows: initial.rows.map((row, i) => [...row, [2, 1, 3, 2][i]])} : initial,
    explicit: project('products', ['name', 'price'])};
}

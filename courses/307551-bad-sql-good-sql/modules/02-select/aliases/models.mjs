import {tables, rowKey} from '../../01-first-query/select/models.mjs';
import {tasks} from './copy.mjs';
export {tables};
export function projected(tableName, columns, aliases = columns, caseIndex = 0) {
  const table = tables[tableName];
  if (!table || !Number.isInteger(caseIndex) || !table.cases[caseIndex] || aliases.length !== columns.length || columns.some(column => !table.columns.includes(column))) throw Error('Unknown projection');
  return {columns: [...aliases], types: columns.map(column => table.types[table.columns.indexOf(column)]), rows: table.cases[caseIndex].map(row => columns.map(column => row[table.columns.indexOf(column)]))};
}
export function taskFor(id) {const task = tasks.find(item => item.id === id); if (!task) throw Error('Неизвестное задание.'); return task;}
export function solutionFor(task) {return 'SELECT ' + task.columns.map((column, i) => column + ' AS ' + task.aliases[i]).join(', ') + '\nFROM ' + task.table + ';';}
export function matches(task, caseIndex, actual) {
  const expected = projected(task.table, task.columns, task.aliases, caseIndex);
  return JSON.stringify(actual.columns) === JSON.stringify(expected.columns) && JSON.stringify(actual.rows.map(row => rowKey(row, expected.types)).sort()) === JSON.stringify(expected.rows.map(row => rowKey(row, expected.types)).sort());
}
export function commaResult(fixed = false, caseIndex = 0) {return fixed ? projected('products', ['name', 'price'], ['name', 'price'], caseIndex) : projected('products', ['name'], ['price'], caseIndex);}

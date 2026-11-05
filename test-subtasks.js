import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isValidSubtask,
  isValidSubtaskList,
  getSubtasks,
  sanitizeSubtasks,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
  getSubtaskProgress,
  formatSubtaskProgress,
  subtasksToText,
  textToSubtasks
} from './src/utils/subtaskUtils.js';
import { isValidTask } from './src/utils/taskUtils.js';
import {
  exportTasksToCSV,
  exportTasksToJSON,
  validateTaskRecord,
  parseAndValidateCSV,
  parseAndValidateJSON
} from './src/utils/exportImportUtils.js';

const oldTask = { id: 't1', text: 'Old task', dueDate: '2026-11-20', priority: 'medium', completed: false, completedAt: null };

function withSubtasks() {
  let task = addSubtask(oldTask, 'First');
  task = addSubtask(task, 'Second');
  task = addSubtask(task, 'Third');
  return task;
}

test('a task saved before subtasks existed still works', () => {
  assert.equal(isValidTask(oldTask), true);
  assert.deepEqual(getSubtasks(oldTask), []);
  assert.deepEqual(getSubtaskProgress(oldTask), { done: 0, total: 0 });
  assert.equal(formatSubtaskProgress(oldTask), '');
  assert.equal(sanitizeSubtasks(oldTask), oldTask);
});

test('addSubtask appends an unfinished subtask and does not touch the original', () => {
  const next = addSubtask(oldTask, '  Book venue  ');
  assert.equal('subtasks' in oldTask, false);
  assert.equal(next.subtasks.length, 1);
  assert.equal(next.subtasks[0].text, 'Book venue');
  assert.equal(next.subtasks[0].done, false);
  assert.equal(typeof next.subtasks[0].id, 'string');
  assert.equal(next.text, 'Old task');
});

test('addSubtask ignores blank text', () => {
  assert.equal(addSubtask(oldTask, '   '), oldTask);
  assert.equal(addSubtask(oldTask, undefined), oldTask);
});

test('subtask ids are unique within a task', () => {
  const ids = withSubtasks().subtasks.map(item => item.id);
  assert.equal(new Set(ids).size, 3);
});

test('toggleSubtask flips only the chosen subtask', () => {
  const task = withSubtasks();
  const target = task.subtasks[1].id;
  const toggled = toggleSubtask(task, target);
  assert.deepEqual(toggled.subtasks.map(item => item.done), [false, true, false]);
  assert.deepEqual(task.subtasks.map(item => item.done), [false, false, false]);
  assert.deepEqual(toggleSubtask(toggled, target).subtasks.map(item => item.done), [false, false, false]);
});

test('deleteSubtask removes only the chosen subtask', () => {
  const task = withSubtasks();
  const next = deleteSubtask(task, task.subtasks[0].id);
  assert.deepEqual(next.subtasks.map(item => item.text), ['Second', 'Third']);
  assert.equal(task.subtasks.length, 3);
  assert.deepEqual(deleteSubtask(oldTask, 'nope').subtasks, []);
});

test('progress counts finished subtasks and formats as done/total', () => {
  let task = withSubtasks();
  assert.equal(formatSubtaskProgress(task), '0/3');
  task = toggleSubtask(task, task.subtasks[0].id);
  task = toggleSubtask(task, task.subtasks[2].id);
  assert.deepEqual(getSubtaskProgress(task), { done: 2, total: 3 });
  assert.equal(formatSubtaskProgress(task), '2/3');
});

test('isValidTask accepts a missing or valid subtasks field and rejects a bad one', () => {
  assert.equal(isValidTask({ ...oldTask, subtasks: [] }), true);
  assert.equal(isValidTask(withSubtasks()), true);
  assert.equal(isValidTask({ ...oldTask, subtasks: 'nope' }), false);
  assert.equal(isValidTask({ ...oldTask, subtasks: [{ id: 'a', text: 'x' }] }), false);
  assert.equal(isValidSubtaskList(undefined), true);
  assert.equal(isValidSubtask({ id: 'a', text: '', done: false }), false);
});

test('sanitizeSubtasks drops broken entries and keeps the task', () => {
  const dirty = {
    ...oldTask,
    subtasks: [
      { id: 'a', text: ' Keep me ', done: true },
      { id: 'b', text: '   ', done: false },
      null,
      'text',
      { text: 'No id', done: 'yes' }
    ]
  };
  const clean = sanitizeSubtasks(dirty);
  assert.equal(isValidTask(clean), true);
  assert.equal(clean.subtasks.length, 2);
  assert.deepEqual(clean.subtasks[0], { id: 'a', text: 'Keep me', done: true });
  assert.equal(clean.subtasks[1].text, 'No id');
  assert.equal(clean.subtasks[1].done, false);
  assert.ok(clean.subtasks[1].id);
  assert.equal('subtasks' in sanitizeSubtasks({ ...oldTask, subtasks: 5 }), false);
});

test('JSON export keeps subtasks and import round-trips them', () => {
  const task = toggleSubtask(withSubtasks(), withSubtasks().subtasks[0].id);
  const exported = exportTasksToJSON([task]);
  assert.match(exported, /"subtasks"/);
  const result = parseAndValidateJSON(exported);
  assert.equal(result.success, true);
  assert.deepEqual(result.tasks[0].subtasks, task.subtasks);
});

test('JSON import of an old backup without subtasks gives plain tasks', () => {
  const old = JSON.stringify([{ text: 'A', dueDate: '', priority: 'low', completed: false, completedAt: null }]);
  const result = parseAndValidateJSON(old);
  assert.equal(result.success, true);
  assert.equal('subtasks' in result.tasks[0], false);
});

test('JSON import without subtask ids gets new ids', () => {
  const json = JSON.stringify([{
    text: 'A', dueDate: '', priority: 'low', completed: false, completedAt: null,
    subtasks: [{ text: 'one', done: true }, { text: 'two', done: false }]
  }]);
  const result = parseAndValidateJSON(json);
  assert.equal(result.success, true);
  assert.equal(isValidTask(result.tasks[0]), true);
  assert.deepEqual(result.tasks[0].subtasks.map(item => item.text), ['one', 'two']);
});

test('import rejects a malformed subtasks field', () => {
  const base = { text: 'A', dueDate: '', priority: 'low', completed: false, completedAt: null };
  assert.equal(validateTaskRecord({ ...base, subtasks: 'x' }, 0).valid, false);
  assert.equal(validateTaskRecord({ ...base, subtasks: [{ text: '', done: false }] }, 0).valid, false);
  assert.equal(validateTaskRecord({ ...base, subtasks: [{ text: 'ok', done: 'no' }] }, 0).valid, false);
  assert.match(validateTaskRecord({ ...base, subtasks: [1] }, 0).error, /invalid subtask #1/);
  assert.equal(validateTaskRecord({ ...base, subtasks: [] }, 0).valid, true);
  assert.equal(parseAndValidateJSON(JSON.stringify([{ ...base, subtasks: 'x' }])).success, false);
});

test('CSV export adds a subtasks column only when a task has subtasks', () => {
  const plain = exportTasksToCSV([oldTask]);
  assert.equal(plain.split('\r\n')[0], 'text,dueDate,priority,completed,completedAt');

  const task = toggleSubtask(withSubtasks(), withSubtasks().subtasks[0].id);
  const csv = exportTasksToCSV([task, oldTask]);
  assert.equal(csv.split('\r\n')[0], 'text,dueDate,priority,completed,completedAt,subtasks');
});

test('CSV round-trips subtasks, including commas and quotes', () => {
  let task = addSubtask(oldTask, 'Buy milk, eggs');
  task = addSubtask(task, 'Say "hi" to Sam');
  task = { ...task, subtasks: task.subtasks.map((item, i) => (i === 0 ? { ...item, done: true } : item)) };
  const result = parseAndValidateCSV(exportTasksToCSV([task, oldTask]));
  assert.equal(result.success, true);
  assert.deepEqual(result.tasks[0].subtasks.map(({ text, done }) => ({ text, done })), [
    { text: 'Buy milk, eggs', done: true },
    { text: 'Say "hi" to Sam', done: false }
  ]);
  assert.equal('subtasks' in result.tasks[1], false);
  assert.equal(isValidTask({ ...result.tasks[0], id: 'x' }), true);
});

test('CSV import of an old file without the subtasks column still works', () => {
  const csv = 'text,dueDate,priority,completed,completedAt\r\n"Task A","2026-10-30","high",false,""';
  const result = parseAndValidateCSV(csv);
  assert.equal(result.success, true);
  assert.equal('subtasks' in result.tasks[0], false);
});

test('subtasksToText and textToSubtasks agree and tolerate loose input', () => {
  assert.equal(subtasksToText([{ text: 'a', done: true }, { text: 'b\nc', done: false }]), '[x] a\n[ ] b c');
  const parsed = textToSubtasks('[x] done one\n\n[ ] open one\nplain line\n[X] shouty');
  assert.deepEqual(parsed.map(({ text, done }) => ({ text, done })), [
    { text: 'done one', done: true },
    { text: 'open one', done: false },
    { text: 'plain line', done: false },
    { text: 'shouty', done: true }
  ]);
  assert.deepEqual(textToSubtasks(''), []);
  assert.deepEqual(subtasksToText(undefined), '');
});

test('sanitizeSubtasks gives repeated ids a new id and keeps the first', () => {
  const task = {
    text: 'Backup',
    subtasks: [
      { id: 'same', text: 'One', done: true },
      { id: 'same', text: 'Two', done: false },
      { id: 'same', text: 'Three', done: false }
    ]
  };

  const cleaned = sanitizeSubtasks(task);
  const ids = cleaned.subtasks.map(sub => sub.id);

  assert.equal(ids[0], 'same');
  assert.equal(new Set(ids).size, 3);

  const toggled = toggleSubtask(cleaned, ids[1]);
  assert.deepEqual(toggled.subtasks.map(sub => sub.done), [true, true, false]);
});

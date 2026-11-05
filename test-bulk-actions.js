import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyBulkAction,
  getNewlyCompleted,
  getDeletedItems,
  toggleSelection
} from './src/utils/bulkActions.js';
import {
  MAX_UNDO_ENTRIES,
  pushDeleted,
  pushDeletedGroup,
  popDeleted,
  restoreEntry,
  undoMessage
} from './src/utils/undoDelete.js';
import { getVisibleTasks } from './src/utils/taskUtils.js';

const mk = (id, extra = {}) => ({
  id,
  text: `task ${id}`,
  dueDate: '2027-01-01',
  priority: 'medium',
  completed: false,
  completedAt: null,
  ...extra
});

const NOW = '2026-11-05T10:00:00.000Z';

// Same thing App.jsx does on a bulk delete.
function bulkDelete(tasks, stack, ids) {
  const selected = new Set(ids);
  return {
    tasks: applyBulkAction(tasks, selected, { type: 'delete' }),
    stack: pushDeletedGroup(stack, getDeletedItems(tasks, selected))
  };
}

function undo(tasks, stack) {
  const { entry, stack: next } = popDeleted(stack);
  return { tasks: restoreEntry(tasks, entry), stack: next };
}

test('complete marks only the selected tasks and sets completedAt', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(id => mk(id));
  const out = applyBulkAction([a, b, c], new Set(['a', 'c']), { type: 'complete' }, NOW);
  assert.deepEqual(out.map(t => t.completed), [true, false, true]);
  assert.equal(out[0].completedAt, NOW);
  assert.equal(out[1], b);
});

test('complete keeps the original completedAt of a task that was already done', () => {
  const done = mk('a', { completed: true, completedAt: '2026-01-01T00:00:00.000Z' });
  const out = applyBulkAction([done], new Set(['a']), { type: 'complete' }, NOW);
  assert.equal(out[0], done);
});

test('priority changes only the selected tasks', () => {
  const [a, b] = ['a', 'b'].map(id => mk(id));
  const out = applyBulkAction([a, b], new Set(['b']), { type: 'priority', priority: 'high' });
  assert.equal(out[0], a);
  assert.equal(out[1].priority, 'high');
});

test('an unknown priority or action changes nothing', () => {
  const tasks = [mk('a')];
  const ids = new Set(['a']);
  assert.equal(applyBulkAction(tasks, ids, { type: 'priority', priority: 'urgent' }), tasks);
  assert.equal(applyBulkAction(tasks, ids, { type: 'nope' }), tasks);
});

test('delete removes only the selected tasks and keeps the order', () => {
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(id => mk(id));
  assert.deepEqual(applyBulkAction([a, b, c, d], new Set(['b', 'd']), { type: 'delete' }), [a, c]);
});

test('bulk actions do not mutate the input', () => {
  const tasks = [mk('a'), mk('b')];
  const copy = structuredClone(tasks);
  const ids = new Set(['a']);
  applyBulkAction(tasks, ids, { type: 'complete' }, NOW);
  applyBulkAction(tasks, ids, { type: 'priority', priority: 'low' });
  applyBulkAction(tasks, ids, { type: 'delete' });
  assert.deepEqual(tasks, copy);
});

test('an empty selection leaves the tasks as they are', () => {
  const tasks = [mk('a')];
  for (const action of [{ type: 'complete' }, { type: 'delete' }, { type: 'priority', priority: 'low' }]) {
    assert.deepEqual(applyBulkAction(tasks, new Set(), action, NOW), tasks);
  }
});

test('getNewlyCompleted skips tasks that are already done, so no double points', () => {
  const a = mk('a');
  const b = mk('b', { completed: true, completedAt: NOW });
  const c = mk('c');
  assert.deepEqual(getNewlyCompleted([a, b, c], new Set(['a', 'b'])), [a]);
});

test('getDeletedItems gives positions in the full array', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(id => mk(id));
  assert.deepEqual(getDeletedItems([a, b, c], new Set(['a', 'c'])), [
    { task: a, index: 0 },
    { task: c, index: 2 }
  ]);
});

test('toggleSelection adds and removes an id and returns a new Set', () => {
  const start = new Set(['a']);
  const added = toggleSelection(start, 'b');
  assert.deepEqual([...added].sort(), ['a', 'b']);
  assert.deepEqual([...toggleSelection(added, 'a')], ['b']);
  assert.deepEqual([...start], ['a']);
});

test('one undo restores a whole bulk delete at the original positions', () => {
  const list = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => mk(id));
  let s = bulkDelete(list, [], ['b', 'c', 'e']);
  assert.deepEqual(s.tasks.map(t => t.id), ['a', 'd', 'f']);
  assert.equal(s.stack.length, 1);
  s = undo(s.tasks, s.stack);
  assert.deepEqual(s.tasks, list);
  assert.deepEqual(s.stack, []);
});

test('restores the first and last task and tasks hidden by a filter stay where they were', () => {
  const list = [mk('a'), mk('done1', { completed: true }), mk('b'), mk('done2', { completed: true }), mk('c')];
  const s = bulkDelete(list, [], ['a', 'c']);
  assert.deepEqual(undo(s.tasks, s.stack).tasks, list);
});

test('the order items are selected in does not matter', () => {
  const list = ['a', 'b', 'c', 'd'].map(id => mk(id));
  const stack = pushDeletedGroup([], [{ task: list[3], index: 3 }, { task: list[0], index: 0 }, { task: list[2], index: 2 }]);
  assert.deepEqual(undo([list[1]], stack).tasks, list);
});

test('a bulk delete of every task can be undone', () => {
  const list = ['a', 'b', 'c'].map(id => mk(id));
  const s = bulkDelete(list, [], ['a', 'b', 'c']);
  assert.deepEqual(s.tasks, []);
  assert.deepEqual(undo(s.tasks, s.stack).tasks, list);
});

test('more tasks than MAX_UNDO_ENTRIES in one bulk delete all come back', () => {
  const list = Array.from({ length: MAX_UNDO_ENTRIES * 3 }, (_, i) => mk(`t${i}`));
  const s = bulkDelete(list, [], list.map(t => t.id));
  assert.equal(s.stack.length, 1);
  assert.deepEqual(undo(s.tasks, s.stack).tasks, list);
});

test('single and bulk deletes mixed are undone newest first and keep their order', () => {
  const list = ['a', 'b', 'c', 'd', 'e'].map(id => mk(id));
  const [, b] = list;
  let s = { tasks: list.filter(t => t !== b), stack: pushDeleted([], b, 1) };
  s = bulkDelete(s.tasks, s.stack, ['c', 'e']);
  assert.deepEqual(s.tasks.map(t => t.id), ['a', 'd']);
  s = undo(s.tasks, s.stack);
  assert.deepEqual(s.tasks.map(t => t.id), ['a', 'c', 'd', 'e']);
  s = undo(s.tasks, s.stack);
  assert.deepEqual(s.tasks, list);
});

test('a group counts as one entry for the stack cap', () => {
  let stack = [];
  for (let i = 0; i < MAX_UNDO_ENTRIES + 2; i++) {
    stack = pushDeletedGroup(stack, [{ task: mk(`t${i}`), index: 0 }]);
  }
  assert.equal(stack.length, MAX_UNDO_ENTRIES);
  assert.equal(stack[stack.length - 1].group[0].task.id, `t${MAX_UNDO_ENTRIES + 1}`);
});

test('pushing an empty group adds nothing, so no empty toast', () => {
  const stack = [];
  assert.equal(pushDeletedGroup(stack, []), stack);
});

test('restoreEntry does not add a task twice and handles no entry', () => {
  const a = mk('a');
  assert.deepEqual(restoreEntry([a], { group: [{ task: a, index: 0 }] }), [a]);
  const tasks = [a];
  assert.equal(restoreEntry(tasks, null), tasks);
});

test('undoMessage names one task and counts several', () => {
  const a = mk('a');
  assert.equal(undoMessage({ task: a, index: 0 }), 'Deleted "task a"');
  assert.equal(undoMessage({ group: [{ task: a, index: 0 }] }), 'Deleted "task a"');
  assert.equal(undoMessage({ group: [{ task: a, index: 0 }, { task: mk('b'), index: 1 }] }), 'Deleted 2 tasks');
});

test('getVisibleTasks applies the filter and the search, case insensitive', () => {
  const a = mk('a', { text: 'Buy milk' });
  const b = mk('b', { text: 'buy eggs', completed: true });
  const c = mk('c', { text: 'Old', dueDate: '2000-01-01' });
  const tasks = [a, b, c];
  assert.deepEqual(getVisibleTasks(tasks, 'all', ''), tasks);
  assert.deepEqual(getVisibleTasks(tasks, 'active', ''), [a, c]);
  assert.deepEqual(getVisibleTasks(tasks, 'done', ''), [b]);
  assert.deepEqual(getVisibleTasks(tasks, 'overdue-task', ''), [c]);
  assert.deepEqual(getVisibleTasks(tasks, 'all', 'BUY'), [a, b]);
  assert.deepEqual(getVisibleTasks(tasks, 'active', 'buy'), [a]);
});

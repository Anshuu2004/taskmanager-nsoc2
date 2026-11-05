import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canReorder,
  moveTask,
  getDropPlace,
  getMoveMessage
} from './src/utils/reorderUtils.js';
import { pushDeleted, popDeleted, restoreTask } from './src/utils/undoDelete.js';

const mk = (id, completed = false) => ({ id, text: `task ${id}`, completed });
const ids = (tasks) => tasks.map(t => t.id).join('');

// Same thing App.jsx does on delete, with the neighbour.
function del(tasks, stack, task) {
  const index = tasks.indexOf(task);
  return {
    tasks: tasks.filter(t => t !== task),
    stack: pushDeleted(stack, task, index, tasks[index - 1]?.id)
  };
}

function undo(tasks, stack) {
  const { entry, stack: next } = popDeleted(stack);
  return { tasks: restoreTask(tasks, entry), stack: next };
}

test('moves a task before or after another one', () => {
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(id => mk(id));
  const list = [a, b, c, d];
  assert.equal(ids(moveTask(list, d, b, 'before')), 'adbc');
  assert.equal(ids(moveTask(list, a, c, 'after')), 'bcad');
});

test('moves to the very start and the very end', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(id => mk(id));
  assert.equal(ids(moveTask([a, b, c], c, a, 'before')), 'cab');
  assert.equal(ids(moveTask([a, b, c], a, c, 'after')), 'bca');
});

test('moving up or down by one swaps with the neighbour', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(id => mk(id));
  assert.equal(ids(moveTask([a, b, c], b, a, 'before')), 'bac');
  assert.equal(ids(moveTask([a, b, c], b, c, 'after')), 'acb');
});

test('hidden completed tasks stay where they are when an active task moves', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(id => mk(id));
  const [x, y] = ['x', 'y'].map(id => mk(id, true));
  const list = [a, x, b, y, c];
  const out = moveTask(list, c, b, 'before');
  assert.equal(ids(out), 'axcby');
  assert.equal(ids(out.filter(t => !t.completed)), 'acb');
  assert.equal(ids(out.filter(t => t.completed)), 'xy');
});

test('a move that changes nothing returns the same array', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(id => mk(id));
  const list = [a, b, c];
  assert.equal(moveTask(list, b, b, 'before'), list);
  assert.equal(moveTask(list, a, b, 'before'), list);
  assert.equal(moveTask(list, b, a, 'after'), list);
});

test('a task or target that is not in the list changes nothing', () => {
  const [a, b] = ['a', 'b'].map(id => mk(id));
  const list = [a, b];
  assert.equal(moveTask(list, mk('z'), a), list);
  assert.equal(moveTask(list, a, mk('z')), list);
});

test('moveTask does not mutate the input and keeps the same task objects', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(id => mk(id));
  const list = [a, b, c];
  const out = moveTask(list, c, a, 'before');
  assert.equal(ids(list), 'abc');
  assert.equal(out[0], c);
});

test('the new order survives a JSON round trip, which is what a refresh does', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(id => mk(id));
  const out = moveTask([a, b, c], c, a, 'before');
  assert.equal(ids(JSON.parse(JSON.stringify(out))), 'cab');
});

test('reordering is on in the default view, which is the Active filter', () => {
  assert.equal(canReorder('active', '', 'default'), true);
});

test('reordering is off with a search, another sort, or another filter', () => {
  assert.equal(canReorder('active', 'milk', 'default'), false);
  assert.equal(canReorder('active', '', 'priority-desc'), false);
  for (const filter of ['all', 'done', 'overdue-task']) {
    assert.equal(canReorder(filter, '', 'default'), false, filter);
  }
});

test('the upper half of a row drops before it, the lower half after it', () => {
  const rect = { top: 100, height: 40 };
  assert.equal(getDropPlace(100, rect), 'before');
  assert.equal(getDropPlace(119, rect), 'before');
  assert.equal(getDropPlace(120, rect), 'after');
  assert.equal(getDropPlace(139, rect), 'after');
});

test('the announcement counts active tasks only', () => {
  const [a, b] = ['a', 'b'].map(id => mk(id));
  const done = mk('x', true);
  assert.equal(getMoveMessage([done, b, a], a), 'Moved "task a" to position 2 of 2');
});

test('undo after a move puts the task back behind the same neighbour', () => {
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(id => mk(id));
  let s = del([a, b, c, d], [], b);
  assert.equal(ids(s.tasks), 'acd');
  s.tasks = moveTask(s.tasks, d, a, 'before');
  assert.equal(ids(s.tasks), 'dac');
  // Going by the saved index alone would give dbac.
  assert.equal(ids(undo(s.tasks, s.stack).tasks), 'dabc');
});

test('undo of a task that was first goes back to the start after a move', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(id => mk(id));
  let s = del([a, b, c], [], a);
  s.tasks = moveTask(s.tasks, c, b, 'before');
  assert.equal(ids(undo(s.tasks, s.stack).tasks), 'acb');
});

test('moving first and deleting after still restores the moved position', () => {
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(id => mk(id));
  const moved = moveTask([a, b, c, d], d, a, 'before');
  const s = del(moved, [], a);
  assert.equal(ids(s.tasks), 'dbc');
  assert.equal(ids(undo(s.tasks, s.stack).tasks), 'dabc');
});

test('several deletes with moves in between are all restored, newest first', () => {
  const [a, b, c, d, e] = ['a', 'b', 'c', 'd', 'e'].map(id => mk(id));
  let s = del([a, b, c, d, e], [], b);
  s = del(s.tasks, s.stack, d);
  s.tasks = moveTask(s.tasks, e, a, 'before');
  assert.equal(ids(s.tasks), 'eac');
  s = undo(s.tasks, s.stack);
  assert.equal(ids(s.tasks), 'eacd');
  s = undo(s.tasks, s.stack);
  assert.equal(ids(s.tasks), 'eabcd');
});

test('deleting the neighbour too still restores both in order', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(id => mk(id));
  let s = del([a, b, c], [], b);
  s = del(s.tasks, s.stack, a);
  s = undo(s.tasks, s.stack);
  s = undo(s.tasks, s.stack);
  assert.equal(ids(s.tasks), 'abc');
});

test('if the neighbour is gone for good the saved index is used', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(id => mk(id));
  const out = restoreTask([a, c], { task: b, index: 1, afterId: 'gone' });
  assert.equal(ids(out), 'abc');
});

test('old entries without a neighbour still restore by index', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(id => mk(id));
  assert.equal(ids(restoreTask([a, c], { task: b, index: 1 })), 'abc');
});

test('undo never adds a task twice after a move', () => {
  const [a, b] = ['a', 'b'].map(id => mk(id));
  assert.equal(ids(restoreTask([b, a], { task: a, index: 1, afterId: 'b' })), 'ba');
});

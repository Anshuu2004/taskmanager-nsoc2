import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_UNDO_ENTRIES,
  pushDeleted,
  popDeleted,
  pausedAfterUndo,
  restoreTask
} from './src/utils/undoDelete.js';

const mk = (id) => ({ id, text: `task ${id}`, completed: false });

// Same thing App.jsx does on delete: remember the index, filter by identity.
function del(tasks, stack, task) {
  const index = tasks.indexOf(task);
  return { tasks: tasks.filter(t => t !== task), stack: pushDeleted(stack, task, index) };
}

function undo(tasks, stack) {
  const { entry, stack: next } = popDeleted(stack);
  return { tasks: restoreTask(tasks, entry), stack: next };
}

test('restores a task at its original position', () => {
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(mk);
  let state = del([a, b, c, d], [], c);
  assert.deepEqual(state.tasks, [a, b, d]);
  state = undo(state.tasks, state.stack);
  assert.deepEqual(state.tasks, [a, b, c, d]);
  assert.equal(state.tasks[2], c);
});

test('restores the first and the last task', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(mk);
  let s = del([a, b, c], [], a);
  s = undo(s.tasks, s.stack);
  assert.deepEqual(s.tasks, [a, b, c]);
  s = del(s.tasks, s.stack, c);
  s = undo(s.tasks, s.stack);
  assert.deepEqual(s.tasks, [a, b, c]);
});

test('several deletes in a row are undone newest first and keep their order', () => {
  const list = ['a', 'b', 'c', 'd', 'e'].map(mk);
  const [a, b, c, d, e] = list;
  let s = { tasks: list, stack: [] };
  s = del(s.tasks, s.stack, b);
  s = del(s.tasks, s.stack, d);
  s = del(s.tasks, s.stack, a);
  assert.deepEqual(s.tasks, [c, e]);
  assert.equal(s.stack.length, 3);

  s = undo(s.tasks, s.stack);
  assert.deepEqual(s.tasks, [a, c, e]);
  s = undo(s.tasks, s.stack);
  assert.deepEqual(s.tasks, [a, c, d, e]);
  s = undo(s.tasks, s.stack);
  assert.deepEqual(s.tasks, [a, b, c, d, e]);
  assert.equal(s.stack.length, 0);
});

test('deleting neighbours back to back restores the right slots', () => {
  const list = ['a', 'b', 'c', 'd'].map(mk);
  const [a, b, c, d] = list;
  let s = del(list, [], b);
  s = del(s.tasks, s.stack, c);
  s = undo(s.tasks, s.stack);
  assert.deepEqual(s.tasks, [a, c, d]);
  s = undo(s.tasks, s.stack);
  assert.deepEqual(s.tasks, [a, b, c, d]);
});

test('a task added after the delete does not shift the restored one', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(mk);
  const added = mk('new');
  let s = del([a, b, c], [], b);
  const withNew = [...s.tasks, added];
  s = undo(withNew, s.stack);
  assert.deepEqual(s.tasks, [a, b, c, added]);
});

test('index past the end of a shorter list puts the task last', () => {
  const [a, b] = ['a', 'b'].map(mk);
  const gone = mk('gone');
  assert.deepEqual(restoreTask([a, b], { task: gone, index: 9 }), [a, b, gone]);
  assert.deepEqual(restoreTask([], { task: gone, index: 3 }), [gone]);
  assert.deepEqual(restoreTask([a], { task: gone, index: -4 }), [gone, a]);
});

test('restoring a task that is already back does not duplicate it', () => {
  const [a, b] = ['a', 'b'].map(mk);
  const copy = { ...b };
  assert.deepEqual(restoreTask([a, b], { task: copy, index: 1 }), [a, b]);
});

test('popDeleted on an empty stack returns null and leaves tasks alone', () => {
  const tasks = [mk('a')];
  const { entry, stack } = popDeleted([]);
  assert.equal(entry, null);
  assert.deepEqual(stack, []);
  assert.equal(restoreTask(tasks, entry), tasks);
});

test('the stack is capped and the oldest entries fall off', () => {
  let stack = [];
  for (let i = 0; i < MAX_UNDO_ENTRIES + 3; i += 1) stack = pushDeleted(stack, mk(i), i);
  assert.equal(stack.length, MAX_UNDO_ENTRIES);
  assert.equal(stack[0].task.id, 3);
  assert.equal(stack[stack.length - 1].task.id, MAX_UNDO_ENTRIES + 2);
});

test('pushDeleted and popDeleted do not mutate the stack they are given', () => {
  const original = pushDeleted([], mk('a'), 0);
  const frozen = Object.freeze([...original]);
  pushDeleted(frozen, mk('b'), 1);
  popDeleted(frozen);
  assert.equal(frozen.length, 1);
});

test('undo keeps the pause while other entries are still pending', () => {
  // toast is hovered / focused, 3 deletes pending, user hits Undo
  assert.equal(pausedAfterUndo(true, 2), true);
  assert.equal(pausedAfterUndo(true, 1), true);
});

test('undo resets the pause when the last entry is gone', () => {
  // toast unmounts without mouseleave / blur, so a stale pause must not stick
  assert.equal(pausedAfterUndo(true, 0), false);
});

test('undo never turns a pause on by itself', () => {
  assert.equal(pausedAfterUndo(false, 2), false);
  assert.equal(pausedAfterUndo(false, 0), false);
});

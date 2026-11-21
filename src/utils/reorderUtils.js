/**
 * Pure helpers for changing the task order. No React, so they can be tested
 * with `node --test`.
 *
 * The order is simply the order of the full tasks array. The list on screen is
 * usually a part of it, because the default view hides completed tasks. So a
 * move is always "put this task next to that task", never "go to index N", and
 * hidden tasks stay where they are.
 */

/**
 * Reordering only makes sense where the screen shows stored order and dragging
 * has a clear meaning: the Active list, with no search and the Default sort.
 * All is grouped by month, the other filters hide most of the list.
 */
export function canReorder(currentFilter, searchQuery, currentSort) {
  return currentFilter === 'active' && !searchQuery && currentSort === 'default';
}

/**
 * Moves a task right before or after another one.
 * @param {Array} tasks the full tasks array
 * @param {object} task the task to move
 * @param {object} target the task to put it next to
 * @param {'before'|'after'} place
 * @returns {Array} a new array, or the same array if the order did not change
 */
export function moveTask(tasks, task, target, place = 'before') {
  if (task === target || !tasks.includes(task)) return tasks;

  const rest = tasks.filter(t => t !== task);
  const targetIndex = rest.indexOf(target);
  if (targetIndex === -1) return tasks;

  const at = place === 'after' ? targetIndex + 1 : targetIndex;
  const next = [...rest.slice(0, at), task, ...rest.slice(at)];
  return next.every((t, i) => t === tasks[i]) ? tasks : next;
}

/**
 * Which half of a row the pointer is over decides the side of the drop.
 * @param {number} pointerY
 * @param {{top: number, height: number}} rect the row
 * @returns {'before'|'after'}
 */
export function getDropPlace(pointerY, rect) {
  return pointerY < rect.top + rect.height / 2 ? 'before' : 'after';
}

/**
 * What screen readers hear after a move. Positions count the Active list,
 * the only place tasks can be moved.
 */
export function getMoveMessage(tasks, task) {
  const active = tasks.filter(t => !t.completed);
  return `Moved "${task.text}" to position ${active.indexOf(task) + 1} of ${active.length}`;
}

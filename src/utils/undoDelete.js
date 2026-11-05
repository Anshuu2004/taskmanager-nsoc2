/**
 * Pure helpers for the "Undo delete" stack. Kept free of React so they can be
 * tested with `node --test`.
 *
 * An entry is `{ task, index }` where `index` is the position the task had in
 * the full tasks array (not the filtered list) at the moment it was deleted.
 */

// How many deletes we remember. Older ones fall off the bottom of the stack.
export const MAX_UNDO_ENTRIES = 10;

// How long the toast stays up before the pending undos are dropped.
export const UNDO_TIMEOUT_MS = 8000;

/**
 * Push a deleted task onto the stack (newest last).
 * @param {Array<{task: object, index: number}>} stack
 * @param {object} task
 * @param {number} index position of the task in the full tasks array
 * @returns {Array<{task: object, index: number}>} a new stack
 */
export function pushDeleted(stack, task, index) {
  const next = [...stack, { task, index }];
  return next.length > MAX_UNDO_ENTRIES ? next.slice(next.length - MAX_UNDO_ENTRIES) : next;
}

/**
 * Remove the newest entry. Undoing newest-first means every entry's saved index
 * is still correct, because everything deleted after it has already come back.
 * @returns {{ entry: object|null, stack: Array }}
 */
export function popDeleted(stack) {
  if (stack.length === 0) return { entry: null, stack };
  return { entry: stack[stack.length - 1], stack: stack.slice(0, -1) };
}

/**
 * Whether the expiry timer should stay paused after an undo. If entries are
 * still pending the same toast (and the same button) stays mounted, so no new
 * mouseenter / focus will fire: keep the pause the user already triggered. If
 * the stack is empty the toast unmounts without a mouseleave / blur, so reset.
 * @param {boolean} paused pause state before the undo
 * @param {number} remaining entries left on the stack after the undo
 * @returns {boolean}
 */
export function pausedAfterUndo(paused, remaining) {
  return paused && remaining > 0;
}

/**
 * Put a deleted task back at its old position. If the list is shorter now
 * (tasks were added or imported since) the task goes at the end. A task whose
 * id is already in the list is not added twice.
 * @returns {Array} a new tasks array
 */
export function restoreTask(tasks, entry) {
  if (!entry) return tasks;
  const { task, index } = entry;
  if (task.id && tasks.some(t => t.id === task.id)) return tasks;
  const at = Math.max(0, Math.min(index, tasks.length));
  return [...tasks.slice(0, at), task, ...tasks.slice(at)];
}

/**
 * Push tasks deleted in one go as a single entry, so one Undo brings all of
 * them back and a big bulk delete cannot push older entries (or itself) off the
 * stack. Items are kept lowest index first, see restoreEntry.
 * @param {Array<{task: object, index: number}>} stack
 * @param {Array<{task: object, index: number}>} items
 * @returns {Array} a new stack
 */
export function pushDeletedGroup(stack, items) {
  if (items.length === 0) return stack;
  const group = [...items].sort((a, b) => a.index - b.index);
  const next = [...stack, { group }];
  return next.length > MAX_UNDO_ENTRIES ? next.slice(next.length - MAX_UNDO_ENTRIES) : next;
}

/**
 * Undo one stack entry, single or group. A group goes back lowest index first:
 * by the time a task is put back, everything that was in front of it already
 * is, so its saved index is right again.
 * @returns {Array} a new tasks array
 */
export function restoreEntry(tasks, entry) {
  if (!entry || !entry.group) return restoreTask(tasks, entry);
  return entry.group.reduce(restoreTask, tasks);
}

/**
 * The text of the undo toast for a stack entry.
 * @returns {string}
 */
export function undoMessage(entry) {
  if (entry.group && entry.group.length > 1) return `Deleted ${entry.group.length} tasks`;
  const { task } = entry.group ? entry.group[0] : entry;
  return `Deleted "${task.text}"`;
}

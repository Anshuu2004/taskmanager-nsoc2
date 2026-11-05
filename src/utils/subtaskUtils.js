/**
 * Helpers for the subtask checklist on a task.
 * A subtask is { id, text, done } and lives in task.subtasks (an array).
 * Older saved tasks have no subtasks field, so every helper treats a missing
 * field as an empty list. Nothing here mutates its input.
 */

function makeSubtaskId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * True for a stored subtask: a non-empty id and text, and a boolean done flag.
 */
export function isValidSubtask(subtask) {
  return Boolean(
    subtask &&
    typeof subtask === 'object' &&
    !Array.isArray(subtask) &&
    typeof subtask.id === 'string' &&
    subtask.id !== '' &&
    typeof subtask.text === 'string' &&
    subtask.text.trim() !== '' &&
    typeof subtask.done === 'boolean'
  );
}

/**
 * True when the field is missing (old task) or an array of valid subtasks.
 */
export function isValidSubtaskList(subtasks) {
  if (subtasks === undefined) return true;
  return Array.isArray(subtasks) && subtasks.every(isValidSubtask);
}

/**
 * Returns the subtasks of a task as an array, [] when the field is missing.
 */
export function getSubtasks(task) {
  return task && Array.isArray(task.subtasks) ? task.subtasks : [];
}

/**
 * Cleans a stored task's subtasks so one broken entry does not cost the whole
 * task: entries without usable text are dropped, a missing id gets a new one,
 * and a missing done flag counts as not done. A task without the field comes
 * back untouched, and a field that is not an array is removed.
 */
export function sanitizeSubtasks(task) {
  if (!task || typeof task !== 'object' || !('subtasks' in task)) return task;
  const { subtasks, ...rest } = task;
  if (!Array.isArray(subtasks)) return rest;

  // toggle and delete match by id, so a repeated id from an edited backup would
  // act on every copy. The first one keeps its id, the rest get a new one.
  const seenIds = new Set();
  const cleaned = subtasks
    .filter(item => item && typeof item === 'object' && typeof item.text === 'string' && item.text.trim() !== '')
    .map(item => {
      const hasUsableId = typeof item.id === 'string' && item.id !== '' && !seenIds.has(item.id);
      const id = hasUsableId ? item.id : makeSubtaskId();
      seenIds.add(id);
      return { id, text: item.text.trim(), done: item.done === true };
    });
  return { ...rest, subtasks: cleaned };
}

/**
 * Returns a copy of the task with a new unfinished subtask at the end.
 * Blank text is ignored and the same task object is returned.
 */
export function addSubtask(task, text) {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) return task;
  return {
    ...task,
    subtasks: [...getSubtasks(task), { id: makeSubtaskId(), text: trimmed, done: false }]
  };
}

/**
 * Returns a copy of the task with one subtask's done flag flipped.
 */
export function toggleSubtask(task, subtaskId) {
  return {
    ...task,
    subtasks: getSubtasks(task).map(item =>
      item.id === subtaskId ? { ...item, done: !item.done } : item
    )
  };
}

/**
 * Returns a copy of the task without the given subtask.
 */
export function deleteSubtask(task, subtaskId) {
  return {
    ...task,
    subtasks: getSubtasks(task).filter(item => item.id !== subtaskId)
  };
}

/**
 * Counts finished and total subtasks, e.g. { done: 3, total: 5 }.
 */
export function getSubtaskProgress(task) {
  const list = getSubtasks(task);
  return { done: list.filter(item => item.done).length, total: list.length };
}

/**
 * Progress as the "3/5" text shown next to the title. Empty when the task has
 * no subtasks.
 */
export function formatSubtaskProgress(task) {
  const { done, total } = getSubtaskProgress(task);
  return total === 0 ? '' : `${done}/${total}`;
}

/**
 * Writes subtasks as one line each, "[x] text" or "[ ] text", for the CSV
 * backup column. Line breaks inside a subtask are flattened to spaces.
 */
export function subtasksToText(subtasks) {
  return (Array.isArray(subtasks) ? subtasks : [])
    .map(item => `[${item.done ? 'x' : ' '}] ${String(item.text).replace(/\s*[\r\n]+\s*/g, ' ')}`)
    .join('\n');
}

/**
 * Reads the CSV column written by subtasksToText back into subtasks. Lines
 * without a "[x]" or "[ ]" marker count as unfinished; blank lines are skipped.
 */
export function textToSubtasks(value) {
  if (typeof value !== 'string') return [];
  return value
    .split(/\r?\n/)
    .map(line => {
      const match = /^\s*\[([ xX]?)\]\s*(.*)$/.exec(line);
      const text = (match ? match[2] : line).trim();
      return { text, done: Boolean(match && match[1].toLowerCase() === 'x') };
    })
    .filter(item => item.text !== '')
    .map(item => ({ id: makeSubtaskId(), text: item.text, done: item.done }));
}

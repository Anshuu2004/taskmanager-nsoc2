/**
 * Pure helpers for acting on several tasks at once. No React, so they can be
 * tested with `node --test`. Selection is a Set of task ids.
 */

const PRIORITIES = ['low', 'medium', 'high'];

/**
 * Runs one bulk action over the tasks array and returns a new array. Tasks
 * that are not selected keep the same object.
 * @param {Array} tasks the full tasks array
 * @param {Set} selectedIds
 * @param {{type: 'complete'}|{type: 'delete'}|{type: 'priority', priority: string}} action
 * @param {string} now timestamp for completedAt
 */
export function applyBulkAction(tasks, selectedIds, action, now = new Date().toISOString()) {
  const isSelected = task => selectedIds.has(task.id);

  if (action.type === 'delete') {
    return tasks.filter(task => !isSelected(task));
  }

  if (action.type === 'complete') {
    // A task that was already done keeps its original completedAt.
    return tasks.map(task =>
      isSelected(task) && !task.completed ? { ...task, completed: true, completedAt: now } : task
    );
  }

  if (action.type === 'priority' && PRIORITIES.includes(action.priority)) {
    return tasks.map(task => (isSelected(task) ? { ...task, priority: action.priority } : task));
  }

  return tasks;
}

/**
 * The selected tasks that are not done yet. Only these count as a new
 * completion for points and streaks.
 */
export function getNewlyCompleted(tasks, selectedIds) {
  return tasks.filter(task => selectedIds.has(task.id) && !task.completed);
}

/**
 * The selected tasks with their position in the full array, in the shape the
 * undo stack wants.
 * @returns {Array<{task: object, index: number}>}
 */
export function getDeletedItems(tasks, selectedIds) {
  return tasks.flatMap((task, index) => (selectedIds.has(task.id) ? [{ task, index }] : []));
}

/**
 * Adds or removes one id. Returns a new Set so React sees the change.
 */
export function toggleSelection(selectedIds, id) {
  const next = new Set(selectedIds);
  if (!next.delete(id)) next.add(id);
  return next;
}

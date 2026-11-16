import { isValidSubtaskList } from './subtaskUtils.js';

export const priorityWeights = { high: 3, medium: 2, low: 1 };

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Returns today's date (local calendar day) formatted as YYYY-MM-DD.
 * `today` is only a parameter so tests can pass a fixed moment.
 */
export function getTodayDate(today = new Date()) {
  const year = String(today.getFullYear()).padStart(4, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates a unique id for a task.
 */
export function createTaskId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Splits a YYYY-MM-DD string into numbers, or returns null if it is not a real
 * calendar date. Only plain arithmetic is used (month lengths and leap years),
 * so the result does not depend on the browser timezone or on how Date parses
 * the string.
 */
export function parseDateKey(value) {
  if (typeof value !== 'string') return null;
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return null;

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const monthLengths = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > monthLengths[month - 1]) return null;

  return { year, month, day };
}

/**
 * True for a real date written exactly as YYYY-MM-DD, so 2026-02-30,
 * 2026-2-3 and "abc" are rejected. An empty string means "no due date" and
 * is handled by the callers, not here.
 */
export function isValidDateKey(value) {
  return parseDateKey(value) !== null;
}

/**
 * Checks whether a stored record has the required task fields and types.
 * dueDate may be empty (no due date) or a real YYYY-MM-DD date.
 * subtasks is optional (older tasks have none) but must be a valid list if present.
 */
export function isValidTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) return false;

  const hasValidCompletedAt =
    task.completedAt === null ||
    (typeof task.completedAt === 'string' && !Number.isNaN(Date.parse(task.completedAt)));

  return (
    typeof task.text === 'string' &&
    task.text.trim() !== '' &&
    typeof task.dueDate === 'string' &&
    (task.dueDate === '' || isValidDateKey(task.dueDate)) &&
    ['low', 'medium', 'high'].includes(task.priority) &&
    typeof task.completed === 'boolean' &&
    hasValidCompletedAt &&
    isValidSubtaskList(task.subtasks)
  );
}

/**
 * Blanks a dueDate that is not a real YYYY-MM-DD date so the task is kept
 * under "No due date" instead of being thrown away. Other fields are left
 * alone, isValidTask still decides if the rest of the record is usable.
 */
export function clearInvalidDueDate(task) {
  if (!task || typeof task !== 'object' || typeof task.dueDate !== 'string') return task;
  if (task.dueDate === '' || isValidDateKey(task.dueDate)) return task;
  return { ...task, dueDate: '' };
}

/**
 * Checks if an active task is overdue using local calendar-day boundaries.
 * Tasks due today, without a due date, or with an unusable date are not overdue.
 */
export function isOverdue(task, today = getTodayDate()) {
  return Boolean(isValidDateKey(task.dueDate) && task.dueDate < today && !task.completed);
}

/**
 * Sorts an array of tasks based on the given sort criteria without mutating the original array.
 */
export function sortTasks(taskList, sortOption = 'default') {
  const listCopy = [...taskList];
  if (sortOption === 'default') {
    return listCopy;
  }

  return listCopy.sort((a, b) => {
    if (sortOption === 'dueDate-asc') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (sortOption === 'dueDate-desc') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return b.dueDate.localeCompare(a.dueDate);
    }
    if (sortOption === 'priority-desc') {
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      return weightB - weightA;
    }
    if (sortOption === 'priority-asc') {
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      return weightA - weightB;
    }
    if (sortOption === 'alphabetical-asc') {
      return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
    }
    if (sortOption === 'alphabetical-desc') {
      return b.text.localeCompare(a.text, undefined, { sensitivity: 'base' });
    }
    return 0;
  });
}

/**
 * Groups tasks by year and month.
 */
export function groupTasksByMonth(taskList, currentSort = 'default') {
  const groups = new Map();

  taskList.forEach(task => {
    const parts = parseDateKey(task.dueDate);
    let monthLabel = 'No due date';
    let sortKey = '9999-99';
    if (parts) {
      // Built from the numbers, not by parsing the string, and set to noon so
      // a DST shift cannot move it into another month.
      const monthDate = new Date(2000, parts.month - 1, 1, 12);
      monthDate.setFullYear(parts.year);
      monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      sortKey = task.dueDate.slice(0, 7);
    }

    if (!groups.has(sortKey)) {
      groups.set(sortKey, { monthLabel, tasks: [] });
    }

    groups.get(sortKey).tasks.push(task);
  });

  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(entry => ({
      monthLabel: entry[1].monthLabel,
      tasks: sortTasks(entry[1].tasks, currentSort)
    }));
}

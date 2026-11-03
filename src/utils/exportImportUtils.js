import { isValidDateKey } from './taskUtils.js';
import { sanitizeSubtasks, subtasksToText, textToSubtasks } from './subtaskUtils.js';

/**
 * Utility functions for Task Backup, Export, and Import
 */

/**
 * Initiates a browser download for given content and MIME type.
 * Delays URL.revokeObjectURL to ensure asynchronous download processing completes.
 */
export function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Escapes a cell value for standard RFC 4180 CSV compliance.
 */
export function escapeCSVCell(value) {
  if (value === null || value === undefined) return '""';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return `"${stringValue}"`;
}

/**
 * Exports tasks to a formatted JSON string.
 */
export function exportTasksToJSON(taskList) {
  return JSON.stringify(taskList, null, 2);
}

/**
 * Exports tasks to a standard CSV string (RFC 4180).
 */
export function exportTasksToCSV(taskList) {
  // The subtasks column is only added when some task has subtasks, so a backup
  // of plain tasks keeps the same columns as before. One subtask per line,
  // "[x] text" when done and "[ ] text" when not.
  const hasSubtasks = taskList.some(task => Array.isArray(task.subtasks) && task.subtasks.length > 0);
  const headers = ['text', 'dueDate', 'priority', 'completed', 'completedAt'];
  if (hasSubtasks) headers.push('subtasks');
  const rows = taskList.map(task => {
    const cells = [
      escapeCSVCell(task.text || ''),
      escapeCSVCell(task.dueDate || ''),
      escapeCSVCell(task.priority || 'medium'),
      task.completed ? 'true' : 'false',
      escapeCSVCell(task.completedAt || '')
    ];
    if (hasSubtasks) cells.push(escapeCSVCell(subtasksToText(task.subtasks)));
    return cells.join(',');
  });
  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Robust CSV parser handling quotes, double quotes (""), commas, and newlines.
 */
export function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Validates a single task object according to task specifications.
 */
export function validateTaskRecord(task, index) {
  const rowNum = index + 1;
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    return { valid: false, error: `Task #${rowNum} is not a valid object.` };
  }
  if (typeof task.text !== 'string' || task.text.trim() === '') {
    return { valid: false, error: `Task #${rowNum} is missing a required non-empty 'text' field.` };
  }
  if (task.dueDate !== undefined && task.dueDate !== null && typeof task.dueDate !== 'string') {
    return { valid: false, error: `Task #${rowNum} has an invalid 'dueDate' (must be a string).` };
  }
  // Empty means no due date. Anything else has to be a real YYYY-MM-DD day.
  // The whole import is rejected (like the other bad fields) rather than
  // silently changing the date.
  if (typeof task.dueDate === 'string' && task.dueDate.trim() !== '' && !isValidDateKey(task.dueDate.trim())) {
    return { valid: false, error: `Task #${rowNum} has an invalid 'dueDate' "${task.dueDate}". Use a real date written as YYYY-MM-DD (for example 2026-02-28).` };
  }
  const priority = String(task.priority || '').trim().toLowerCase();
  if (!['low', 'medium', 'high'].includes(priority)) {
    return { valid: false, error: `Task #${rowNum} has invalid priority "${task.priority}". Must be 'low', 'medium', or 'high'.` };
  }
  if (typeof task.completed !== 'boolean') {
    return { valid: false, error: `Task #${rowNum} has an invalid 'completed' status (must be true or false).` };
  }
  if (task.completedAt !== null && task.completedAt !== undefined && task.completedAt !== '') {
    if (typeof task.completedAt !== 'string' || Number.isNaN(Date.parse(task.completedAt))) {
      return { valid: false, error: `Task #${rowNum} has an invalid 'completedAt' timestamp.` };
    }
  }
  // Optional: backups made before subtasks existed do not have the field.
  if (task.subtasks !== undefined) {
    if (!Array.isArray(task.subtasks)) {
      return { valid: false, error: `Task #${rowNum} has an invalid 'subtasks' field (must be a list).` };
    }
    for (let i = 0; i < task.subtasks.length; i++) {
      const sub = task.subtasks[i];
      if (!sub || typeof sub !== 'object' || typeof sub.text !== 'string' || sub.text.trim() === '' || typeof sub.done !== 'boolean') {
        return { valid: false, error: `Task #${rowNum} has an invalid subtask #${i + 1} (needs non-empty 'text' and a true/false 'done').` };
      }
    }
  }
  return { valid: true };
}

/**
 * Parses and validates CSV backup content into clean task objects.
 * Automatically handles UTF-8 BOM from spreadsheet applications (Excel).
 */
export function parseAndValidateCSV(csvContent) {
  if (typeof csvContent !== 'string' || csvContent.trim() === '') {
    return { success: false, error: 'The CSV file is empty.' };
  }

  const cleanContent = csvContent.replace(/^\uFEFF/, '');
  const rows = parseCSV(cleanContent);
  if (rows.length < 2) {
    return { success: false, error: 'CSV file contains no task records (only header or empty).' };
  }

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const headerMap = {};
  headers.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  if (headerMap['text'] === undefined) {
    return { success: false, error: "CSV header is missing the required 'text' column." };
  }

  const validatedTasks = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 1 && row[0].trim() === '') continue;

    const textRaw = row[headerMap['text']] || '';
    const dueDateRaw = headerMap['duedate'] !== undefined ? (row[headerMap['duedate']] || '') : '';
    const priorityRaw = headerMap['priority'] !== undefined ? (row[headerMap['priority']] || 'medium') : 'medium';
    const completedRaw = headerMap['completed'] !== undefined ? (row[headerMap['completed']] || 'false') : 'false';
    const completedAtRaw = headerMap['completedat'] !== undefined ? (row[headerMap['completedat']] || '') : '';

    const priorityLower = String(priorityRaw).trim().toLowerCase();
    const completedLower = String(completedRaw).trim().toLowerCase();
    let isCompleted = false;
    if (completedLower === 'true' || completedLower === '1' || completedLower === 'yes') {
      isCompleted = true;
    } else if (completedLower === 'false' || completedLower === '0' || completedLower === 'no' || completedLower === '') {
      isCompleted = false;
    } else {
      return { success: false, error: `Task #${i} has an invalid 'completed' status ("${completedRaw}"). Must be true or false.` };
    }

    let completedAt = null;
    if (completedAtRaw && completedAtRaw.trim() !== '' && completedAtRaw.trim().toLowerCase() !== 'null') {
      completedAt = completedAtRaw.trim();
    }

    const candidate = {
      text: textRaw.trim(),
      dueDate: dueDateRaw.trim(),
      priority: priorityLower || 'medium',
      completed: isCompleted,
      completedAt: completedAt
    };
    const subtasks = headerMap['subtasks'] !== undefined ? textToSubtasks(row[headerMap['subtasks']] || '') : [];
    if (subtasks.length > 0) candidate.subtasks = subtasks;

    const val = validateTaskRecord(candidate, i - 1);
    if (!val.valid) {
      return { success: false, error: val.error };
    }

    validatedTasks.push(candidate);
  }

  if (validatedTasks.length === 0) {
    return { success: false, error: 'No valid task records found in CSV file.' };
  }

  return { success: true, tasks: validatedTasks };
}

/**
 * Parses and validates JSON backup content into clean task objects.
 */
export function parseAndValidateJSON(jsonString) {
  if (typeof jsonString !== 'string' || jsonString.trim() === '') {
    return { success: false, error: 'The JSON file is empty.' };
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    return { success: false, error: `Invalid JSON syntax: ${err.message}` };
  }

  let candidateList = parsed;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.tasks)) {
    candidateList = parsed.tasks;
  }

  if (!Array.isArray(candidateList)) {
    return { success: false, error: 'Imported JSON must contain a top-level array of tasks.' };
  }

  if (candidateList.length === 0) {
    return { success: false, error: 'The imported JSON file contains no tasks.' };
  }

  const validatedTasks = [];
  for (let i = 0; i < candidateList.length; i++) {
    const item = candidateList[i];
    const val = validateTaskRecord(item, i);
    if (!val.valid) {
      return { success: false, error: val.error };
    }

    let completedAt = null;
    if (item.completedAt && typeof item.completedAt === 'string') {
      completedAt = item.completedAt;
    }

    const task = {
      text: item.text.trim(),
      dueDate: typeof item.dueDate === 'string' ? item.dueDate.trim() : '',
      priority: String(item.priority || 'medium').trim().toLowerCase(),
      completed: Boolean(item.completed),
      completedAt: completedAt
    };
    if (Array.isArray(item.subtasks) && item.subtasks.length > 0) {
      // Keeps the ids from the file when there are some, otherwise makes new ones.
      validatedTasks.push(sanitizeSubtasks({ ...task, subtasks: item.subtasks }));
    } else {
      validatedTasks.push(task);
    }
  }

  return { success: true, tasks: validatedTasks };
}

/**
 * Merges imported tasks with current tasks, avoiding duplicates based on content.
 */
export function mergeTasks(existingTasks, incomingTasks) {
  const existingKeys = new Set(
    existingTasks.map(t => `${t.text.trim().toLowerCase()}|||${t.dueDate || ''}|||${t.priority || 'medium'}|||${Boolean(t.completed)}`)
  );

  const merged = [...existingTasks];
  let addedCount = 0;
  let skippedCount = 0;

  incomingTasks.forEach(task => {
    const key = `${task.text.trim().toLowerCase()}|||${task.dueDate || ''}|||${task.priority || 'medium'}|||${Boolean(task.completed)}`;
    if (existingKeys.has(key)) {
      skippedCount++;
    } else {
      existingKeys.add(key);
      merged.push(task);
      addedCount++;
    }
  });

  return { merged, addedCount, skippedCount };
}

import { useState, useEffect } from 'react';
import { isValidTask, clearInvalidDueDate, createTaskId } from '../utils/taskUtils';
import { sanitizeSubtasks } from '../utils/subtaskUtils';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      if (key === 'tasks') {
        if (!Array.isArray(parsed)) return initialValue;
        // Older saved tasks have no id, so give them one.
        // A task with an impossible due date keeps its text and loses only the date.
        // Broken subtask entries are dropped; tasks without subtasks stay as they are.
        return parsed
          .map(clearInvalidDueDate)
          .map(sanitizeSubtasks)
          .filter(isValidTask)
          .map(task => (task.id ? task : { ...task, id: createTaskId() }));
      }
      return parsed;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

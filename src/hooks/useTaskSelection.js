import { useState, useCallback } from 'react';
import { toggleSelection } from '../utils/bulkActions';

/**
 * Which tasks are ticked for a bulk action. Lives in memory only, a refresh
 * clears it. Only tasks on screen count: if a search or filter hides a selected
 * task, bulk actions leave it alone, so nothing changes that you cannot see.
 */
export function useTaskSelection(visibleTasks) {
  const [ids, setIds] = useState(() => new Set());

  const selectedTasks = visibleTasks.filter(task => ids.has(task.id));

  const toggle = useCallback((task) => setIds(prev => toggleSelection(prev, task.id)), []);
  const clear = useCallback(() => setIds(new Set()), []);
  const selectAll = () => setIds(new Set(visibleTasks.map(task => task.id)));

  return { ids, selectedTasks, toggle, clear, selectAll };
}

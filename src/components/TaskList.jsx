import React from 'react';
import TaskItem from './TaskItem';
import { sortTasks, groupTasksByMonth, getVisibleTasks } from '../utils/taskUtils';

export default function TaskList({
  tasks,
  currentFilter,
  searchQuery,
  currentSort,
  selectedIds,
  onToggleSelect,
  onToggleComplete,
  onDeleteTask,
  onUpdateTaskText
}) {
  const visibleTasks = getVisibleTasks(tasks, currentFilter, searchQuery);

  if (visibleTasks.length === 0) {
    let emptyMsg = 'No tasks found. Add a task above to get started!';
    if (searchQuery) {
      emptyMsg = `🔍 No tasks found matching "${searchQuery}".`;
    } else if (currentFilter === 'active') {
      emptyMsg =
        tasks.length === 0
          ? 'No active tasks. Add a task above to get started!'
          : '🎉 All caught up! All tasks are completed.';
    } else if (currentFilter === 'done') {
      emptyMsg = 'No completed tasks yet. Finish a task to see it here!';
    } else if (currentFilter === 'overdue-task') {
      emptyMsg = '✨ Excellent! No overdue tasks.';
    }

    return (
      <ul id="todo-list">
        <li className="empty-state">{emptyMsg}</li>
      </ul>
    );
  }

  if (currentFilter === 'all') {
    const sorted = sortTasks(visibleTasks, currentSort);
    const groups = groupTasksByMonth(sorted, currentSort);

    return (
      <ul id="todo-list">
        {groups.map((group, gIdx) => (
          <React.Fragment key={group.monthLabel || gIdx}>
            {group.monthLabel && (
              <li className="month-heading">
                {group.monthLabel} ({group.tasks.length})
              </li>
            )}
            {group.tasks.map((task, tIdx) => (
              <TaskItem
                key={`${task.text}-${task.dueDate}-${tIdx}`}
                task={task}
                isSelected={selectedIds.has(task.id)}
                onToggleSelect={onToggleSelect}
                onToggleComplete={onToggleComplete}
                onDelete={onDeleteTask}
                onUpdateText={onUpdateTaskText}
              />
            ))}
          </React.Fragment>
        ))}
      </ul>
    );
  }

  const sortedTasks = sortTasks(visibleTasks, currentSort);

  return (
    <ul id="todo-list">
      {sortedTasks.map((task, idx) => (
        <TaskItem
          key={`${task.text}-${task.dueDate}-${idx}`}
          task={task}
          isSelected={selectedIds.has(task.id)}
          onToggleSelect={onToggleSelect}
          onToggleComplete={onToggleComplete}
          onDelete={onDeleteTask}
          onUpdateText={onUpdateTaskText}
        />
      ))}
    </ul>
  );
}

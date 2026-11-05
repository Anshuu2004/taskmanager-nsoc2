import React from 'react';
import TaskItem from './TaskItem';
import { isOverdue, sortTasks, groupTasksByMonth } from '../utils/taskUtils';

export default function TaskList({
  tasks,
  currentFilter,
  searchQuery,
  currentSort,
  onToggleComplete,
  onDeleteTask,
  onUpdateTaskText,
  onUpdateTask
}) {
  const visibleTasks = tasks
    .filter(task => {
      if (currentFilter === 'active') return !task.completed;
      if (currentFilter === 'overdue-task') return isOverdue(task);
      if (currentFilter === 'done') return task.completed;
      return true;
    })
    .filter(task => {
      if (!searchQuery) return true;
      return task.text.toLowerCase().includes(searchQuery.toLowerCase());
    });

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
                key={task.id || `${task.text}-${task.dueDate}-${tIdx}`}
                task={task}
                onToggleComplete={onToggleComplete}
                onDelete={onDeleteTask}
                onUpdateText={onUpdateTaskText}
                onUpdateTask={onUpdateTask}
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
          key={task.id || `${task.text}-${task.dueDate}-${idx}`}
          task={task}
          onToggleComplete={onToggleComplete}
          onDelete={onDeleteTask}
          onUpdateText={onUpdateTaskText}
          onUpdateTask={onUpdateTask}
        />
      ))}
    </ul>
  );
}

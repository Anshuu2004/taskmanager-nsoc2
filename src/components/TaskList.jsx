import React, { useState } from 'react';
import { getDropPlace } from '../utils/reorderUtils';
import TaskItem from './TaskItem';
import { isOverdue, sortTasks, groupTasksByMonth } from '../utils/taskUtils';

export default function TaskList({
  tasks,
  currentFilter,
  searchQuery,
  reorderEnabled,
  onMoveTask,
  currentSort,
  onToggleComplete,
  onDeleteTask,
  onUpdateTaskText
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

  const [draggedTask, setDraggedTask] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

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
              />
            ))}
          </React.Fragment>
        ))}
      </ul>
    );
  }

  const sortedTasks = sortTasks(visibleTasks, currentSort);

  const stopDragging = () => {
    setDraggedTask(null);
    setDropTarget(null);
  };

  // draggedTask is only set by our own handle, so a file dragged in from the
  // desktop is not treated as a drop.
  const handleRowDragOver = (e, task) => {
    if (!draggedTask) return;
    const place = getDropPlace(e.clientY, e.currentTarget.getBoundingClientRect());
    setDropTarget(prev => (prev?.task === task && prev.place === place ? prev : { task, place }));
  };

  // Drop is handled on the list so the small gaps between rows count too.
  const handleListDragOver = (e) => {
    if (!draggedTask) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleListDrop = (e) => {
    if (!draggedTask) return;
    e.preventDefault();
    if (dropTarget) onMoveTask(draggedTask, dropTarget.task, dropTarget.place);
    stopDragging();
  };

  const getReorderProps = (task, idx) => ({
    canMoveUp: idx > 0,
    canMoveDown: idx < sortedTasks.length - 1,
    isDragging: draggedTask === task,
    dropPlace: dropTarget?.task === task ? dropTarget.place : null,
    onMoveUp: () => onMoveTask(task, sortedTasks[idx - 1], 'before'),
    onMoveDown: () => onMoveTask(task, sortedTasks[idx + 1], 'after'),
    onDragStart: () => setDraggedTask(task),
    onDragEnd: stopDragging,
    onDragOver: (e) => handleRowDragOver(e, task)
  });

  return (
    <ul
      id="todo-list"
      onDragOver={handleListDragOver}
      onDrop={handleListDrop}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null);
      }}
    >
      {sortedTasks.map((task, idx) => (
        <TaskItem
          key={task.id || `${task.text}-${task.dueDate}-${idx}`}
          task={task}
          onToggleComplete={onToggleComplete}
          reorder={reorderEnabled ? getReorderProps(task, idx) : null}
          onDelete={onDeleteTask}
          onUpdateText={onUpdateTaskText}
        />
      ))}
    </ul>
  );
}

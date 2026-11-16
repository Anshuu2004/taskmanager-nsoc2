import React, { useState, useRef, useEffect, useId } from 'react';
import { isOverdue } from '../utils/taskUtils';
import { getSubtaskProgress, formatSubtaskProgress } from '../utils/subtaskUtils';
import SubtaskList from './SubtaskList';

export default function TaskItem({ task, onToggleComplete, onDelete, onUpdateText, onUpdateTask }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const panelUid = useId();
  const [editText, setEditText] = useState(task.text);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== task.text) {
      onUpdateText(task, trimmed);
    } else {
      setEditText(task.text);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(task.text);
      setIsEditing(false);
    }
  };

  const priorityClass = String(task.priority || 'medium').toLowerCase();
  const overdue = isOverdue(task);
  const progress = getSubtaskProgress(task);
  const panelId = `subtasks-${panelUid}`;

  return (
    <li className={task.completed ? 'is-complete' : ''}>
      <span
        className={`status-dot priority-${priorityClass}`}
        aria-label={`${task.priority || 'Medium'} priority`}
        title={`${task.priority || 'Medium'} priority`}
      />

      <span className="task-details">
        {overdue && <span className="overdue-badge">Overdue</span>}

        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            className="edit-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span
            className="task-title"
            title="Double-click to edit this task"
            onDoubleClick={() => setIsEditing(true)}
          >
            {`${task.text} | Due: ${task.dueDate || 'No date'}`}
          </span>
        )}

        {progress.total > 0 && (
          <span
            className={`subtask-progress${progress.done === progress.total ? ' is-all-done' : ''}`}
            role="img"
            aria-label={`${progress.done} of ${progress.total} subtasks done`}
          >
            <span className="subtask-progress-bar" aria-hidden="true">
              <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </span>
            <span aria-hidden="true">{formatSubtaskProgress(task)}</span>
          </span>
        )}
      </span>

      {task.completed && (
        <span
          className="status-dot done-dot"
          aria-label="Completed"
          title="Completed"
        />
      )}

      <div className="action-buttons">
        <button
          type="button"
          className="edit-button"
          aria-label={`Edit task ${task.text}`}
          onClick={() => setIsEditing(true)}
        >
          Edit
        </button>
        <button
          type="button"
          className="subtask-toggle"
          aria-expanded={showSubtasks}
          aria-controls={panelId}
          aria-label={`${showSubtasks ? 'Hide' : 'Show'} subtasks for ${task.text}`}
          onClick={() => setShowSubtasks(prev => !prev)}
        >
          Subtasks
        </button>
        <button
          type="button"
          className="done-button"
          onClick={() => onToggleComplete(task)}
        >
          {task.completed ? 'Mark as active' : 'Mark as done'}
        </button>
        <button
          type="button"
          className="delete-button"
          aria-label={`Delete task ${task.text}`}
          onClick={() => onDelete(task)}
        >
          Delete
        </button>
      </div>

      {showSubtasks && (
        <SubtaskList task={task} panelId={panelId} onUpdateTask={onUpdateTask} />
      )}
    </li>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { isOverdue } from '../utils/taskUtils';

export default function TaskItem({ task, reorder, onToggleComplete, onDelete, onUpdateText }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const editInputRef = useRef(null);
  const moveUpRef = useRef(null);
  const moveDownRef = useRef(null);
  const focusAfterMove = useRef(null);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [isEditing]);

  // A move re-inserts the row in the DOM, which drops keyboard focus, and the
  // button itself gets disabled at the end of the list. Keep focus on this row.
  useEffect(() => {
    if (!focusAfterMove.current) return;
    const [wanted, fallback] = focusAfterMove.current === 'up'
      ? [moveUpRef.current, moveDownRef.current]
      : [moveDownRef.current, moveUpRef.current];
    focusAfterMove.current = null;
    (wanted?.disabled ? fallback : wanted)?.focus();
  });

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== task.text) {
      onUpdateText(task, trimmed);
    } else {
      setEditText(task.text);
    }
    setIsEditing(false);
  };

  const handleMove = (direction, move) => {
    focusAfterMove.current = direction;
    move();
  };

  const handleDragStart = (e) => {
    // Firefox only starts a drag with data set. The custom type stops the row
    // from being dropped as text into the search box.
    e.dataTransfer.setData('application/x-task-reorder', task.text);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(e.currentTarget.closest('li'), 16, 16);
    reorder.onDragStart();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(task.text);
      setIsEditing(false);
    }
  };

  const rowClass = [
    task.completed && 'is-complete',
    reorder?.isDragging && 'is-dragging',
    reorder?.dropPlace && `drop-${reorder.dropPlace}`
  ].filter(Boolean).join(' ');

  const priorityClass = String(task.priority || 'medium').toLowerCase();
  const overdue = isOverdue(task);

  return (
    <li className={rowClass} onDragOver={reorder?.onDragOver}>
      {reorder && (
        <span
          className="drag-handle"
          draggable="true"
          title="Drag to reorder"
          aria-hidden="true"
          onDragStart={handleDragStart}
          onDragEnd={reorder.onDragEnd}
        >
          &#8942;&#8942;
        </span>
      )}

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
      </span>

      {task.completed && (
        <span
          className="status-dot done-dot"
          aria-label="Completed"
          title="Completed"
        />
      )}

      <div className="action-buttons">
        {reorder && (
          <div className="move-buttons">
            <button
              ref={moveUpRef}
              type="button"
              className="move-button"
              aria-label={`Move ${task.text} up`}
              title="Move up"
              disabled={!reorder.canMoveUp}
              onClick={() => handleMove('up', reorder.onMoveUp)}
            >
              &uarr;
            </button>
            <button
              ref={moveDownRef}
              type="button"
              className="move-button"
              aria-label={`Move ${task.text} down`}
              title="Move down"
              disabled={!reorder.canMoveDown}
              onClick={() => handleMove('down', reorder.onMoveDown)}
            >
              &darr;
            </button>
          </div>
        )}
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
    </li>
  );
}

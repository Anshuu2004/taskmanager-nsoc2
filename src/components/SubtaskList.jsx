import React, { useState, useRef } from 'react';
import { getSubtasks, addSubtask, toggleSubtask, deleteSubtask } from '../utils/subtaskUtils';

/**
 * Checklist shown under a task: tick, add and delete subtasks.
 * It never edits state itself, it asks the parent to swap the task for the
 * updated copy through onUpdateTask(task, updater).
 */
export default function SubtaskList({ task, panelId, onUpdateTask }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const subtasks = getSubtasks(task);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!text.trim()) {
      inputRef.current?.focus();
      return;
    }
    const value = text;
    onUpdateTask(task, current => addSubtask(current, value));
    setText('');
    inputRef.current?.focus();
  };

  return (
    <div id={panelId} className="subtask-panel" role="group" aria-label={`Subtasks for ${task.text}`}>
      {subtasks.length === 0 ? (
        <p className="subtask-empty">No subtasks yet.</p>
      ) : (
        <ul className="subtask-list">
          {subtasks.map(item => (
            <li key={item.id} className={item.done ? 'is-done' : ''}>
              <label className="subtask-check">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => onUpdateTask(task, current => toggleSubtask(current, item.id))}
                />
                <span className="subtask-text">{item.text}</span>
              </label>
              <button
                type="button"
                className="subtask-delete"
                aria-label={`Delete subtask ${item.text}`}
                onClick={() => onUpdateTask(task, current => deleteSubtask(current, item.id))}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="subtask-form" aria-label={`Add subtask to ${task.text}`} onSubmit={handleAdd}>
        <input
          ref={inputRef}
          type="text"
          className="subtask-input"
          placeholder="Add a subtask..."
          aria-label={`New subtask for ${task.text}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="subtask-add">Add</button>
      </form>
    </div>
  );
}

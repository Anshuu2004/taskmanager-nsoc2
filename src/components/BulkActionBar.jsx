import React, { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

/**
 * Shown while at least one task is ticked. The status line is outside the
 * conditional so screen readers pick up the count when it first appears.
 */
export default function BulkActionBar({
  selectedTasks,
  visibleCount,
  onSelectAll,
  onClear,
  onComplete,
  onSetPriority,
  onDelete
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const count = selectedTasks.length;
  const noun = count === 1 ? 'task' : 'tasks';

  const handleConfirmDelete = () => {
    setIsConfirmOpen(false);
    onDelete();
  };

  return (
    <>
      <p className="visually-hidden" role="status">
        {count > 0 ? `${count} ${noun} selected` : ''}
      </p>

      {count > 0 && (
        <div id="bulk-bar" className="bulk-bar" role="group" aria-label="Actions for selected tasks">
          <div className="bulk-bar-group">
            <span className="bulk-bar-count">{count} selected</span>
            {count < visibleCount && (
              <button type="button" className="bulk-btn" onClick={onSelectAll}>
                Select all ({visibleCount})
              </button>
            )}
            <button type="button" className="bulk-btn" onClick={onClear}>
              Clear
            </button>
          </div>

          <div className="bulk-bar-group">
            <button
              type="button"
              className="bulk-btn"
              disabled={selectedTasks.every(task => task.completed)}
              onClick={onComplete}
            >
              Mark as done
            </button>
            <button
              type="button"
              className="bulk-btn bulk-btn-danger"
              onClick={() => setIsConfirmOpen(true)}
            >
              Delete
            </button>
          </div>

          <div className="bulk-bar-group" role="group" aria-label="Set priority of selected tasks">
            {PRIORITY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className="bulk-btn"
                aria-label={`Set selected tasks to ${label} priority`}
                onClick={() => onSetPriority(value)}
              >
                <span className={`status-dot priority-${value}`} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={`Delete ${count} ${noun}?`}
        message="You can still undo this from the message that shows up after."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}

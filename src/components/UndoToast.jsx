import React, { useEffect } from 'react';

/**
 * Toast shown after a delete. The live region wrapper is always in the DOM so
 * screen readers pick up the text when it appears. Hovering or focusing the
 * toast pauses the expiry timer (onPause / onResume).
 */
export default function UndoToast({ task, count, onUndo, onDismiss, onPause, onResume }) {
  // Ctrl/Cmd+Z undoes the last delete while the toast is up, so keyboard users
  // do not have to tab through the whole page to reach the button. Typing in a
  // field keeps the browser's own undo.
  const visible = Boolean(task);
  useEffect(() => {
    if (!visible) return undefined;
    const handleKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z') return;
      const el = e.target;
      if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      onUndo();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onUndo]);

  return (
    <div
      className="undo-toast-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {task && (
        <div
          className="undo-toast"
          onMouseEnter={onPause}
          onMouseLeave={onResume}
          onFocus={onPause}
          onBlur={onResume}
        >
          <span className="undo-toast-text">
            {`Deleted "${task.text}"`}
          </span>
          <button
            type="button"
            className="undo-toast-button"
            aria-keyshortcuts="Control+Z Meta+Z"
            onClick={onUndo}
          >
            {count > 1 ? `Undo (${count})` : 'Undo'}
          </button>
          <button
            type="button"
            className="undo-toast-dismiss"
            aria-label="Dismiss undo message"
            onClick={onDismiss}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

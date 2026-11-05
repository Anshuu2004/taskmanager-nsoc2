import React, { useEffect, useRef } from 'react';
import { SHORTCUTS } from '../utils/keyboardShortcuts';

/**
 * Lists the keyboard shortcuts. Same native dialog as the backup modal, so Esc,
 * focus trapping and giving focus back when it closes come from the browser.
 */
export default function ShortcutsDialog({ isOpen, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      id="shortcuts-modal"
      className="backup-modal shortcuts-modal"
      aria-labelledby="shortcuts-modal-title"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-wrapper">
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 id="shortcuts-modal-title">Keyboard shortcuts</h2>
            <p className="modal-subtitle">Single keys do nothing while you are typing in a field.</p>
          </div>
          <button
            className="modal-close-btn"
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <dl className="shortcuts-list">
          {SHORTCUTS.map(({ keys, action }) => (
            <div key={keys} className="shortcuts-row">
              <dt><kbd>{keys}</kbd></dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>
  );
}

import React, { useEffect, useRef } from 'react';

/**
 * Small yes/no dialog. Same native dialog as the backup modal, so Esc and focus
 * trapping come from the browser. Cancel is first in the DOM so it gets the
 * initial focus, a stray Enter should not delete anything.
 */
export default function ConfirmDialog({ isOpen, title, message, confirmLabel, onConfirm, onCancel }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="backup-modal confirm-modal"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
      onClick={(e) => {
        if (e.target === dialogRef.current) onCancel();
      }}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <div className="confirm-modal-body">
        <h2 id="confirm-modal-title">{title}</h2>
        <p id="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button type="button" className="modal-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="modal-btn confirm-modal-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

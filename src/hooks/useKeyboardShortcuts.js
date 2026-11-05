import { useEffect, useState, useCallback } from 'react';
import { getShortcutAction, isClearFieldShortcut } from '../utils/keyboardShortcuts';

const focusField = (id) => document.getElementById(id)?.focus();

// execCommand is the only way to do this that keeps the browser's own undo, so
// Ctrl+Z brings the text back. It also fires a real input event, which is what
// updates the React state of the field.
const clearField = (field) => {
  field.select();
  document.execCommand('delete');
};

/**
 * Global shortcuts plus the open/closed state of the shortcuts dialog. Field
 * ids are used instead of refs so nothing has to be passed through the
 * components. Esc is not here: both dialogs are native, the browser fires
 * their cancel event.
 */
export function useKeyboardShortcuts() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

    const handleKeyDown = (e) => {
      if (isClearFieldShortcut(e, isMac)) {
        e.preventDefault();
        clearField(e.target);
        return;
      }

      const action = getShortcutAction(e);
      // A modal dialog owns the keyboard, the page behind it stays quiet.
      if (!action || document.querySelector('dialog[open]')) return;

      e.preventDefault();
      if (action === 'new-task') focusField('todo-input');
      if (action === 'search') focusField('task-search');
      if (action === 'help') setIsHelpOpen(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openHelp = useCallback(() => setIsHelpOpen(true), []);
  const closeHelp = useCallback(() => setIsHelpOpen(false), []);

  return { isHelpOpen, openHelp, closeHelp };
}

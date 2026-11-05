/**
 * Pure helpers for the global keyboard shortcuts. No React and no DOM calls, so
 * they can be tested with `node --test`.
 */

// What the shortcuts dialog lists. The README table has the same rows.
export const SHORTCUTS = [
  { keys: 'N', action: 'Jump to the new task field' },
  { keys: '/', action: 'Jump to search' },
  { keys: '?', action: 'Open this list' },
  { keys: 'Esc', action: 'Close the open dialog, or cancel a task edit' },
  { keys: 'Ctrl + D', action: 'Clear the text field you are typing in (Cmd + D on a Mac)' },
  { keys: 'Ctrl + Z', action: 'Undo a delete while the undo message is up (Cmd + Z on a Mac)' }
];

const TEXT_INPUT_TYPES = ['text', 'search'];

/**
 * True when a key press belongs to whatever the user is typing in, so a plain
 * letter there must stay a letter.
 */
export function isTypingTarget(target) {
  if (!target || !target.tagName) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || Boolean(target.isContentEditable);
}

/**
 * Maps a keydown to a shortcut name, or null when it is not one. Anything held
 * with Ctrl/Cmd/Alt is left to the browser. Shift is allowed, `?` needs it and
 * on some layouts `/` does too.
 * @returns {'new-task'|'search'|'help'|null}
 */
export function getShortcutAction(event) {
  if (event.defaultPrevented || event.isComposing || event.repeat) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isTypingTarget(event.target)) return null;

  const key = String(event.key).toLowerCase();
  if (key === 'n') return 'new-task';
  if (key === '/') return 'search';
  if (key === '?') return 'help';
  return null;
}

/**
 * The one shortcut that works while typing: Ctrl+D empties the focused text
 * field. On a Mac it is Cmd+D, because Ctrl+D is already forward delete there.
 * Everywhere else on the page Ctrl+D stays the browser's bookmark key.
 */
export function isClearFieldShortcut(event, isMac = false) {
  const modifier = isMac ? event.metaKey : event.ctrlKey;
  const otherModifier = isMac ? event.ctrlKey : event.metaKey;
  if (!modifier || otherModifier || event.shiftKey || event.altKey) return false;
  if (String(event.key).toLowerCase() !== 'd') return false;

  const { target } = event;
  if (!target) return false;
  return target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && TEXT_INPUT_TYPES.includes(target.type));
}

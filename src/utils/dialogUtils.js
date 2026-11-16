// Older browsers have no HTMLDialogElement.showModal() or close(). Fall back to
// the plain `open` attribute there, the same way BackupModal does.

// Without dialog support the `open` property does not exist, only the attribute.
function isDialogOpen(dialog) {
  return Boolean(dialog.open) || (typeof dialog.hasAttribute === 'function' && dialog.hasAttribute('open'));
}

export function openDialog(dialog) {
  if (!dialog || isDialogOpen(dialog)) return;
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

export function closeDialog(dialog) {
  if (!dialog || !isDialogOpen(dialog)) return;
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
}

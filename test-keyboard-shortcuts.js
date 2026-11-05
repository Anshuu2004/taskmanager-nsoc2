import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SHORTCUTS,
  isTypingTarget,
  getShortcutAction,
  isClearFieldShortcut
} from './src/utils/keyboardShortcuts.js';

const body = { tagName: 'BODY' };
const button = { tagName: 'BUTTON' };
const textInput = { tagName: 'INPUT', type: 'text' };
const searchInput = { tagName: 'INPUT', type: 'search' };
const dateInput = { tagName: 'INPUT', type: 'date' };
const textarea = { tagName: 'TEXTAREA' };
const select = { tagName: 'SELECT' };
const editable = { tagName: 'DIV', isContentEditable: true };

const key = (k, extra = {}) => ({ key: k, target: body, ...extra });

test('N, / and ? map to their actions', () => {
  assert.equal(getShortcutAction(key('n')), 'new-task');
  assert.equal(getShortcutAction(key('/')), 'search');
  assert.equal(getShortcutAction(key('?', { shiftKey: true })), 'help');
});

test('N works with caps lock or shift, and / works on layouts that need shift for it', () => {
  assert.equal(getShortcutAction(key('N')), 'new-task');
  assert.equal(getShortcutAction(key('N', { shiftKey: true })), 'new-task');
  assert.equal(getShortcutAction(key('/', { shiftKey: true })), 'search');
});

test('shortcuts also work with focus on a button', () => {
  assert.equal(getShortcutAction(key('n', { target: button })), 'new-task');
});

test('other keys are not shortcuts', () => {
  for (const k of ['a', 'Enter', 'Escape', 'Tab', ' ', 'ArrowDown']) {
    assert.equal(getShortcutAction(key(k)), null, k);
  }
});

test('key presses inside text inputs, selects and contenteditable are left alone', () => {
  for (const target of [textInput, searchInput, dateInput, textarea, select, editable]) {
    assert.equal(isTypingTarget(target), true);
    for (const k of ['n', '/', '?']) {
      assert.equal(getShortcutAction(key(k, { target })), null, `${k} in ${target.tagName}`);
    }
  }
});

test('isTypingTarget is false for the page, buttons and a missing target', () => {
  assert.equal(isTypingTarget(body), false);
  assert.equal(isTypingTarget(button), false);
  assert.equal(isTypingTarget(null), false);
  assert.equal(isTypingTarget(undefined), false);
});

test('Ctrl, Cmd and Alt combinations stay with the browser', () => {
  for (const mod of ['ctrlKey', 'metaKey', 'altKey']) {
    for (const k of ['n', '/', '?']) {
      assert.equal(getShortcutAction(key(k, { [mod]: true })), null, `${mod}+${k}`);
    }
  }
});

test('held keys, IME composing and already handled events do nothing', () => {
  assert.equal(getShortcutAction(key('n', { repeat: true })), null);
  assert.equal(getShortcutAction(key('n', { isComposing: true })), null);
  assert.equal(getShortcutAction(key('n', { defaultPrevented: true })), null);
});

test('a keydown without a key value does not throw (browser autofill sends these)', () => {
  assert.equal(getShortcutAction({ target: body }), null);
  assert.equal(isClearFieldShortcut({ ctrlKey: true, target: textInput }), false);
});

test('Ctrl+D clears text fields, in either case', () => {
  for (const target of [textInput, searchInput, textarea]) {
    assert.equal(isClearFieldShortcut(key('d', { ctrlKey: true, target })), true);
  }
  assert.equal(isClearFieldShortcut(key('D', { ctrlKey: true, target: textInput })), true);
});

test('Ctrl+D outside a text field stays the browser bookmark key', () => {
  for (const target of [body, button, dateInput, select, editable, null]) {
    assert.equal(isClearFieldShortcut(key('d', { ctrlKey: true, target })), false);
  }
});

test('plain D and Ctrl+Shift+D or Ctrl+Alt+D do not clear', () => {
  assert.equal(isClearFieldShortcut(key('d', { target: textInput })), false);
  assert.equal(isClearFieldShortcut(key('d', { ctrlKey: true, shiftKey: true, target: textInput })), false);
  assert.equal(isClearFieldShortcut(key('d', { ctrlKey: true, altKey: true, target: textInput })), false);
});

test('on a Mac it is Cmd+D and Ctrl+D stays forward delete', () => {
  assert.equal(isClearFieldShortcut(key('d', { metaKey: true, target: textInput }), true), true);
  assert.equal(isClearFieldShortcut(key('d', { ctrlKey: true, target: textInput }), true), false);
  assert.equal(isClearFieldShortcut(key('d', { metaKey: true, target: textInput }), false), false);
});

test('every shortcut in the list has keys and a description, and no key is listed twice', () => {
  assert.ok(SHORTCUTS.length > 0);
  for (const { keys, action } of SHORTCUTS) {
    assert.ok(keys && action);
  }
  assert.equal(new Set(SHORTCUTS.map(s => s.keys)).size, SHORTCUTS.length);
});

test('the list covers N, /, ?, Esc and Ctrl + D', () => {
  const listed = SHORTCUTS.map(s => s.keys);
  for (const k of ['N', '/', '?', 'Esc', 'Ctrl + D']) {
    assert.ok(listed.includes(k), k);
  }
});

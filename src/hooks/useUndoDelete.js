import { useState, useRef, useCallback, useEffect } from 'react';
import { pushDeleted, popDeleted, UNDO_TIMEOUT_MS } from '../utils/undoDelete';

/**
 * Keeps a stack of recently deleted tasks and a single expiry timer.
 * Every delete or undo restarts the timer; when it fires the whole stack is
 * dropped. The timer can be paused (hover / keyboard focus on the toast) so
 * nobody loses the chance to undo while they are still reaching for the button.
 */
export function useUndoDelete() {
  const [stack, setStack] = useState([]);
  const stackRef = useRef([]);
  const timerRef = useRef(null);
  const pausedRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const commit = useCallback((next) => {
    stackRef.current = next;
    setStack(next);
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (stackRef.current.length === 0 || pausedRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      commit([]);
    }, UNDO_TIMEOUT_MS);
  }, [commit]);

  // pausedRef is reset on every action: a toast that unmounts while hovered or
  // focused never fires mouseleave / blur, which would leave the timer stuck.
  const recordDelete = useCallback((task, index) => {
    pausedRef.current = false;
    commit(pushDeleted(stackRef.current, task, index));
    startTimer();
  }, [commit, startTimer]);

  /** Pops the newest deleted entry and returns it (or null). */
  const undo = useCallback(() => {
    pausedRef.current = false;
    const { entry, stack: next } = popDeleted(stackRef.current);
    commit(next);
    startTimer();
    return entry;
  }, [commit, startTimer]);

  const dismiss = useCallback(() => {
    pausedRef.current = false;
    clearTimer();
    commit([]);
  }, [commit]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    clearTimer();
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    startTimer();
  }, [startTimer]);

  // No timer left running after unmount.
  useEffect(() => clearTimer, []);

  return {
    latest: stack.length ? stack[stack.length - 1].task : null,
    count: stack.length,
    recordDelete,
    undo,
    dismiss,
    pause,
    resume
  };
}

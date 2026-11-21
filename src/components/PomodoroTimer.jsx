import React, { useState, useEffect, useRef, useId } from 'react';
import './PomodoroTimer.css';

/**
 * Pomodoro Focus Timer component.
 *
 * Features:
 * - Configurable focus/short break/long break durations
 * - Start, pause, reset controls
 * - Countdown display with mm:ss format
 * - Session tracking (focus/break cycles)
 * - Optional task association
 * - Accessibility: keyboard support, screen reader announcements
 *
 * The timer does NOT automatically mark tasks as completed.
 */

const DEFAULT_CONFIG = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
};

/**
 * PomodoroTimer - a focus timer with configurable sessions.
 *
 * Props:
 * - taskId?: string - optional ID of the task this timer is associated with
 * - onSessionComplete?: (sessionType, durationMinutes) => void - callback when a session ends
 */
export default function PomodoroTimer({ taskId, onSessionComplete }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionCount, setSessionCount] = useState(0); // number of completed focus sessions
  const [remainingSeconds, setRemainingSeconds] = useState(
    DEFAULT_CONFIG.focusMinutes * 60
  );
  const [displayedMinutes, setDisplayedMinutes] = useState(
    DEFAULT_CONFIG.focusMinutes
  );
  const [displayedSeconds, setDisplayedSeconds] = useState(0);

  const timerRef = useRef(null);
  const ariaLiveRegionRef = useRef(null);

  // Initialize displayed values from remainingSeconds
  useEffect(() => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    setDisplayedMinutes(mins);
    setDisplayedSeconds(secs);
  }, [remainingSeconds]);

  // Countdown logic
  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) {
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, remainingSeconds]);

  // When timer reaches 0, handle session completion
  useEffect(() => {
    if (remainingSeconds > 0) return;

    if (isRunning) {
      setIsRunning(false);
      // Announce completion for screen readers
      const liveRegion = ariaLiveRegionRef.current;
      if (liveRegion) {
        liveRegion.textContent = isBreak
          ? 'Break session complete'
          : 'Focus session complete';
      }
    }

    // Invoke callback if provided
    if (onSessionComplete) {
      const sessionType = isBreak ? 'break' : 'focus';
      onSessionComplete(sessionType, isBreak ? config.longBreakMinutes : config.focusMinutes);
    }

    // Auto-transition logic
    if (isBreak) {
      // After a break, start a new focus session
      setSessionCount((prev) => prev + 1);
      setIsBreak(false);
      setRemainingSeconds(config.focusMinutes * 60);
      setDisplayedMinutes(config.focusMinutes);
      setDisplayedSeconds(0);
    } else {
      // After a focus session, take a short break
      const nextSessionCount = sessionCount + 1;
      if (nextSessionCount >= config.sessionsUntilLongBreak) {
        setIsBreak(true);
        setRemainingSeconds(config.longBreakMinutes * 60);
        setDisplayedMinutes(config.longBreakMinutes);
        setDisplayedSeconds(0);
      } else {
        // Short break
        setIsBreak(true);
        setRemainingSeconds(config.shortBreakMinutes * 60);
        setDisplayedMinutes(config.shortBreakMinutes);
        setDisplayedSeconds(0);
      }
    }
  }, [remainingSeconds, isRunning, sessionCount, config]);

  // Update displayed minutes/seconds when remainingSeconds changes (from auto-transition)
  useEffect(() => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    setDisplayedMinutes(mins);
    setDisplayedSeconds(secs);
  }, [remainingSeconds]);

  // Format time for display
  const formatTime = () => {
    const mins = String(displayedMinutes).padStart(2, '0');
    const secs = String(displayedSeconds).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Configure durations from props or defaults
  const focusDuration = config.focusMinutes * 60;
  const shortBreakDuration = config.shortBreakMinutes * 60;
  const longBreakDuration = config.longBreakMinutes * 60;

  // Reset state to initial focus state
  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setSessionCount(0);
    setRemainingSeconds(focusDuration);
    setDisplayedMinutes(config.focusMinutes);
    setDisplayedSeconds(0);
  };

  // Toggle play/pause
  const togglePlay = () => {
    setIsRunning((prev) => !prev);
  };

  // Update config
  const updateConfig = (newConfig) => {
    setConfig(newConfig);
    // If timer is not running, reset to new config's focus duration
    if (!isRunning) {
      resetTimer();
    }
  };

  return (
    <div
      id="pomodoro-timer"
      className="pomodoro-timer"
      aria-label="Pomodoro focus timer"
      role="timer"
    >
      {/* Status announcement region for screen readers */}
      <div
        className="sr-only"
        ref={ariaLiveRegionRef}
        aria-live="polite"
        aria-atomic="true"
      >
        {isRunning ? (isBreak ? 'On break' : 'Focus session in progress') : 'Timer paused'}
      </div>

      {/* Controls section */}
      <div className="pomodoro-controls">
        <button
          type="button"
          className="pomodoro-btn pomodoro-btn--play"
          onClick={togglePlay}
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
        >
          {isRunning ? '⏸️ Pause' : '▶️ Start'}
        </button>

        <button
          type="button"
          className="pomodoro-btn pomodoro-btn--reset"
          onClick={resetTimer}
          aria-label="Reset timer"
        >
          ↺ Reset
        </button>
      </div>

      {/* Duration configuration section - visible when timer is paused */}
      {isRunning || remainingSeconds > 0 ? null : (
        <div className="pomodoro-config">
          <label>
            Focus:
            <input
              type="number"
              min="1"
              max="120"
              value={config.focusMinutes}
              onChange={(e) =>
                updateConfig({
                  ...config,
                  focusMinutes: Math.max(1, Math.min(120, parseInt(e.target.value, 10))),
                })
              }
              aria-label="Focus duration in minutes"
            />{' mins'}
          </label>

          <label>
            Short break:
            <input
              type="number"
              min="1"
              max="60"
              value={config.shortBreakMinutes}
              onChange={(e) =>
                updateConfig({
                  ...config,
                  shortBreakMinutes: Math.max(1, Math.min(60, parseInt(e.target.value, 10))),
                })
              }
              aria-label="Short break duration in minutes"
            />{' mins'}
          </label>

          <label>
            Long break:
            <input
              type="number"
              min="1"
              max="60"
              value={config.longBreakMinutes}
              onChange={(e) =>
                updateConfig({
                  ...config,
                  longBreakMinutes: Math.max(1, Math.min(60, parseInt(e.target.value, 10))),
                })
              }
              aria-label="Long break duration in minutes"
            />{' mins'}
          </label>

          <label>
            Sessions until long break:
            <input
              type="number"
              min="1"
              max="20"
              value={config.sessionsUntilLongBreak}
              onChange={(e) =>
                updateConfig({
                  ...config,
                  sessionsUntilLongBreak: Math.max(1, Math.min(20, parseInt(e.target.value, 10))),
                })
              }
              aria-label="Number of focus sessions before long break"
            />
          </label>
        </div>
      )}

      {/* Timer display */}
      <div className="pomodoro-display" aria-label="Remaining time">
        {formatTime()}
      </div>

      {/* Session info */}
      {taskId && (
        <div className="pomodoro-task-association">
          Associated task: {taskId}
        </div>
      )}

      {/* Break/Session count info */}
      <div className="pomodoro-session-info">
        {isBreak ? (
          <span>
            Break{' '}
            {String(displayedMinutes).padStart(2, '0')}
            {' mins'}
          </span>
        ) : (
          <span>
            Session {String(sessionCount).padStart(2, '0')}
          </span>
        )}
      </div>
    </div>
  );
}
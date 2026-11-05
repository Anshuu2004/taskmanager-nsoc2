import React from 'react';

export default function Header({ isLight, onToggleTheme, onOpenBackup, onOpenShortcuts }) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-monogram" aria-hidden="true">&#10003;</div>
        <div className="brand-text">
          <h1>Task Manager</h1>
          <p className="app-subtitle">Productivity Dashboard</p>
        </div>
      </div>
      <div className="header-actions">
        <button
          id="shortcuts-toggle"
          className="header-btn"
          type="button"
          onClick={onOpenShortcuts}
          aria-haspopup="dialog"
          aria-keyshortcuts="?"
        >
          Shortcuts
        </button>
        <button
          id="backup-toggle"
          className="header-btn"
          type="button"
          onClick={onOpenBackup}
          aria-haspopup="dialog"
          aria-label="Backup and restore tasks"
        >
          <span aria-hidden="true">&#8646;</span> Backup &amp; Restore
        </button>
        <button
          id="theme-toggle"
          className="theme-btn"
          type="button"
          onClick={onToggleTheme}
          aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-pressed={isLight}
        >
          {isLight ? 'Dark mode' : 'Light mode'}
        </button>
      </div>
    </header>
  );
}

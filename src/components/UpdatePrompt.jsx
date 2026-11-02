import React, { useEffect, useState } from 'react';
import { onUpdateReady, applyUpdate } from '../registerSW';

export default function UpdatePrompt() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => onUpdateReady(() => setReady(true)), []);

  const show = ready && !dismissed;

  return (
    <div className="update-prompt-region" role="status" aria-live="polite">
      {show && (
        <div className="update-prompt">
          <p className="update-prompt-text">New version available.</p>
          <div className="update-prompt-actions">
            <button type="button" className="update-prompt-btn" onClick={applyUpdate}>
              Reload
            </button>
            <button
              type="button"
              className="update-prompt-btn update-prompt-btn-quiet"
              onClick={() => setDismissed(true)}
            >
              Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

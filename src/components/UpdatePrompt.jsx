import React, { useEffect, useState } from 'react';
import { onUpdateReady, applyUpdate } from '../registerSW';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { shouldPromptUpdate } from '../sw/swLogic';

export default function UpdatePrompt() {
  const [waitingVersion, setWaitingVersion] = useState(null);
  const [dismissedVersion, setDismissedVersion] = useLocalStorage('dismissedUpdateVersion', null);

  useEffect(() => onUpdateReady(setWaitingVersion), []);

  const show = shouldPromptUpdate(waitingVersion, dismissedVersion);

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
              onClick={() => setDismissedVersion(waitingVersion)}
            >
              Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

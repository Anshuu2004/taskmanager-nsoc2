import React, { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const BACK_ONLINE_MS = 4000;

// Tells the user when the connection drops. It sits in the page above the app
// instead of floating over it, so it never covers a task control. The region
// is always mounted so screen readers announce the text when it appears. It has
// no buttons, nothing to tab to, and it does not take focus.
export default function OfflineNotice() {
  const online = useOnlineStatus();
  const wasOffline = useRef(!online);
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setBackOnline(false);
      return undefined;
    }
    if (!wasOffline.current) return undefined;
    wasOffline.current = false;
    setBackOnline(true);
    const timer = setTimeout(() => setBackOnline(false), BACK_ONLINE_MS);
    return () => clearTimeout(timer);
  }, [online]);

  return (
    <div className="offline-notice-region" role="status" aria-live="polite" aria-atomic="true">
      {!online && (
        <p className="offline-notice">You are offline. Your tasks are saved on this device.</p>
      )}
      {online && backOnline && <p className="offline-notice offline-notice-ok">Back online.</p>}
    </div>
  );
}

// Registers the service worker and tells the UI when a new version is
// sitting in the waiting state. Nothing swaps silently: the page only
// reloads after the user accepts the prompt.

const UPDATE_CHECK_MS = 60 * 60 * 1000;

let waitingWorker = null;
let reloading = false;
const listeners = new Set();

// The callback runs right away if an update is already waiting.
export function onUpdateReady(callback) {
  listeners.add(callback);
  if (waitingWorker) callback();
  return () => listeners.delete(callback);
}

export function applyUpdate() {
  if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

function markWaiting(worker) {
  waitingWorker = worker;
  listeners.forEach(callback => callback());
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(registration => {
        // A controller means this is an update. On the very first visit the
        // worker just installs and there is nothing to ask about.
        if (registration.waiting && navigator.serviceWorker.controller) {
          markWaiting(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const incoming = registration.installing;
          if (!incoming) return;
          incoming.addEventListener('statechange', () => {
            if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
              markWaiting(incoming);
            }
          });
        });

        // Installed apps can stay open for days, so look for a new version
        // now and then and when the tab comes back.
        const check = () => registration.update().catch(() => {});
        setInterval(check, UPDATE_CHECK_MS);
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) check();
        });
      })
      .catch(error => console.warn('Service worker registration failed:', error));
  });

  // Fires when the waiting worker takes over (after the user accepted).
  // The first install also changes the controller via clients.claim(), and
  // reloading then would be pointless, so only reload for a real update.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!waitingWorker || reloading) return;
    reloading = true;
    window.location.reload();
  });
}

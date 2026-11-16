import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import UpdatePrompt from './components/UpdatePrompt';
import OfflineNotice from './components/OfflineNotice';
import { registerServiceWorker } from './registerSW';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Goes first so it lands above the app on phones, see .update-prompt-region */}
    <OfflineNotice />
    <UpdatePrompt />
    <App />
  </React.StrictMode>
);

// Only in production builds, a worker in dev would serve stale files.
if (import.meta.env.PROD) {
  registerServiceWorker();
}

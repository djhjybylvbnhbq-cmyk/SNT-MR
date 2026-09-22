import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';
import {registerSW} from 'virtual:pwa-register';

// Auto-update Service Worker immediately without prompt on all devices
let isRefreshing = false;

// When the active service worker changes (new build activated), reload window automatically
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!isRefreshing) {
      isRefreshing = true;
      window.location.reload();
    }
  });
}

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // When a new version is detected, immediately skip waiting and activate without button
    updateSW(true);
  },
  onRegistered(registration) {
    if (registration) {
      // Check for updates immediately upon registration
      registration.update().catch(() => {});

      // Periodically check for new updates every 30 seconds
      setInterval(() => {
        registration.update().catch(() => {});
      }, 30 * 1000);

      // Check for updates whenever the user returns to the tab or refocuses
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });
      window.addEventListener('focus', () => {
        registration.update().catch(() => {});
      });
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


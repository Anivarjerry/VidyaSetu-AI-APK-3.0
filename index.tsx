
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for Offline Capabilities
const updateSW = registerSW({
  onNeedRefresh() {
    console.log("New content available, reloading...");
    // Optional: Show a toast here to let user reload manually
    // updateSW(true); // Auto update
  },
  onOfflineReady() {
    console.log("App is ready for offline usage.");
  },
  onRegisterError(error: any) {
    console.error('SW registration error', error);
  },
});

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

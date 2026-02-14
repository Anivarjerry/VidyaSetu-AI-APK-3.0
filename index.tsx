
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA functionality
// Simplified: Auto-update without forcing reload loop
const updateSW = registerSW({
  onNeedRefresh() {
    console.log("New content available, preparing to update...");
    // Optional: Show a toast to user "Update Available"
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
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

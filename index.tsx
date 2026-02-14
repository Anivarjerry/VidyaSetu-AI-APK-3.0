
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// NOTE: Service Worker is now automatically injected by VitePWA plugin.
// We do not need manual registration code here anymore as it causes conflicts.

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

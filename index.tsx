
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// import { registerSW } from 'virtual:pwa-register';

// Disable auto-reload SW logic for now to ensure stability
// const updateSW = registerSW({
//   onNeedRefresh() {},
//   onOfflineReady() {},
// });

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

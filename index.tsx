
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA functionality
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
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

  // --- SPLASH SCREEN LOGIC ---
  const splash = document.getElementById('splash-screen');
  
  if (splash) {
    // New Timeline:
    // 0.0s - 1.5s: Blue Expansion (Slower)
    // 0.8s - 1.8s: Icons Fade In
    // 1.8s - 4.5s: Icons Float & User sees the branding
    // 4.5s: Fade out
    
    setTimeout(() => {
        splash.style.transition = 'opacity 0.8s ease-out'; // Smooth fade out
        splash.style.opacity = '0';
        
        setTimeout(() => {
            splash.style.display = 'none';
            splash.remove();
            
            // Revert theme color to app settings
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            const isDark = document.documentElement.classList.contains('dark');
            if (metaTheme) {
                metaTheme.setAttribute('content', isDark ? '#020617' : '#ECFDF5');
            }
        }, 800); // Wait for fade out to finish
    }, 4500); // Keep splash visible for 4.5 seconds total
  }
}

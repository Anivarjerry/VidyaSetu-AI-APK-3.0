
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          // Manual injection allows better control in index.tsx
          injectRegister: null, 
          registerType: 'autoUpdate', 
          devOptions: {
            enabled: true,
            type: 'module',
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
            cleanupOutdatedCaches: true,
            clientsClaim: true,
            skipWaiting: true,
            navigateFallback: '/index.html',
            // Do not cache Supabase/API calls in the SW cache, let the app logic handle it via IDB
            navigateFallbackDenylist: [/^\/api/, /^https:\/\/.*\.supabase\.co/],
            runtimeCaching: [
              {
                // Fonts - Cache First
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                // Static Assets (Images) - Stale While Revalidate
                urlPattern: /\.(?:png|jpg|jpeg|svg|ico)$/,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'images-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                  },
                },
              }
            ]
          },
          includeAssets: ['android/android-launchericon-192-192.png', 'ios/180.png'], 
          manifest: {
            // Fixed ID prevents duplicate installs if URL changes slightly
            id: 'vidyasetu-ai-app-v2', 
            name: 'VidyaSetu AI',
            short_name: 'VidyaSetu',
            description: 'Premium School Management System with Real-time Tracking.',
            // Adding query param ensures unique PWA session, fixing duplicate apps on some launchers
            start_url: '/?source=pwa', 
            scope: '/',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#10b981',
            orientation: 'portrait',
            categories: ['education', 'productivity'],
            icons: [
              {
                src: 'android/android-launchericon-192-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: 'android/android-launchericon-512-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});

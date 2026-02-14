
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
          // Changed back to 'auto' to ensure the SW script is actually injected into index.html
          injectRegister: 'auto', 
          registerType: 'autoUpdate', 
          devOptions: {
            enabled: true
          },
          workbox: {
            // CRITICAL: Explicitly cache index.html and assets
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
            cleanupOutdatedCaches: true,
            clientsClaim: true,
            skipWaiting: true,
            // CRITICAL: This tells the browser "If offline and requesting a page, give index.html"
            navigateFallback: '/index.html',
            navigateFallbackDenylist: [/^\/api/], 
            runtimeCaching: [
              {
                // Cache Google Fonts
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
                // Cache Images
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
            id: 'vidyasetu-v3', // Changed ID slightly to force a fresh install prompt if needed
            name: 'VidyaSetu AI',
            short_name: 'VidyaSetu',
            description: 'Premium School Management System',
            start_url: '.', // Using dot is safest for relative paths
            scope: '/',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#10b981',
            orientation: 'portrait',
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


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
          registerType: 'autoUpdate',
          // Workbox config ensures the service worker is generated correctly
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
            cleanupOutdatedCaches: true,
            clientsClaim: true,
            skipWaiting: true,
            navigateFallback: '/index.html', // Fix for offline navigation fallback
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
                handler: 'NetworkOnly',
                options: {
                  cacheName: 'supabase-api-cache'
                  // Removed networkTimeoutSeconds as it is not supported with NetworkOnly strategy
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              }
            ]
          },
          includeAssets: ['android/android-launchericon-192-192.png', 'ios/180.png'], 
          manifest: {
            id: '/',
            start_url: '/',
            scope: '/',
            name: 'Vidyasetu AI',
            short_name: 'Vidyasetu',
            description: 'Premium School Management System with Real-time Tracking.',
            theme_color: '#ffffff',
            background_color: '#ffffff',
            display: 'standalone',
            display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
            orientation: 'portrait',
            categories: ['education', 'productivity', 'utilities'],
            lang: 'en',
            dir: 'ltr',
            prefer_related_applications: false,
            icons: [
              {
                src: 'android/android-launchericon-48-48.png',
                sizes: '48x48',
                type: 'image/png'
              },
              {
                src: 'android/android-launchericon-72-72.png',
                sizes: '72x72',
                type: 'image/png'
              },
              {
                src: 'android/android-launchericon-96-96.png',
                sizes: '96x96',
                type: 'image/png'
              },
              {
                src: 'android/android-launchericon-144-144.png',
                sizes: '144x144',
                type: 'image/png'
              },
              {
                src: 'android/android-launchericon-192-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: 'android/android-launchericon-512-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: 'android/android-launchericon-512-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ],
            screenshots: [
              {
                src: 'screenshot1.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Dashboard Home'
              },
              {
                src: 'screenshot2.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'User Profile'
              },
              {
                src: 'screenshot3.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Features List'
              },
              {
                src: 'screenshot4.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Attendance Tracking'
              },
              {
                src: 'screenshot5.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'School Admin'
              },
              {
                src: 'screenshot6.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Transport Map'
              },
              {
                src: 'screenshot7.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Homework Portal'
              },
              {
                src: 'screenshot8.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Gallery'
              },
              {
                src: 'screenshot9.png',
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Reports'
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

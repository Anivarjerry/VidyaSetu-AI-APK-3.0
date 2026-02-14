
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
          // REMOVED 'registerType: autoUpdate' to stop reload loops
          // registerType: 'prompt', 
          devOptions: {
            enabled: false // Disable PWA in dev to prevent caching issues while coding
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
            cleanupOutdatedCaches: true,
            clientsClaim: true,
            skipWaiting: true,
            navigateFallback: '/index.html',
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
                handler: 'NetworkFirst', // Changed to NetworkFirst for better data consistency
                options: {
                  cacheName: 'supabase-api-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 // 1 hour only
                  }
                }
              }
            ]
          },
          includeAssets: ['android/android-launchericon-192-192.png', 'ios/180.png'], 
          manifest: {
            // FIXED: Standardized ID and Scope to prevent ghost windows
            id: 'vidyasetu-ai-production-v1', 
            name: 'Vidyasetu AI',
            short_name: 'Vidyasetu',
            description: 'Premium School Management System with Real-time Tracking.',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            // Removed 'display_override' array to force standard standalone behavior across all Android versions
            background_color: '#ffffff',
            theme_color: '#ffffff',
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

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Cloud Storage PWA',
        short_name: 'CloudBox',
        description: 'Secure Cloud Storage PWA',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            // Cache images from S3 (thumbnails and originals)
            urlPattern: /^https:\/\/.*\.s3\..*\.amazonaws\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 's3-images-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache API responses
            urlPattern: /^https?:\/\/.*\/api\/v1\/(files|user)\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      // x� API (�: 18081)
      '/v0.1': {
        target: 'http://13.203.37.93:18081',
        changeOrigin: true,
        secure: false,
      },
      // | API (�: 18080)
      '/api/v1': {
        target: 'http://localhost:18080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

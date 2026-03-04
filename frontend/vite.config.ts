import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // Allows testing the service worker in 'npm run dev'
      },
      manifest: {
        name: 'ShopTrack POS',
        short_name: 'ShopTrack',
        description: 'Offline-capable POS System',
        theme_color: '#0f172a', /* darker background */
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/vite.svg', // Placeholder until real icons are added
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/(products|categories)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-catalog-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // Cache for 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

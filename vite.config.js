import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/icons-pack-generator/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-maskable-192.png'],
      manifest: {
        name: 'Icons Pack Generator',
        short_name: 'Icons Pack',
        description: 'Generate and export icon packs directly from your browser.',
        theme_color: '#0f172a',
        background_color: '#081225',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/icons-pack-generator/',
        start_url: '/icons-pack-generator/',
        icons: [
          {
            src: '/icons-pack-generator/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons-pack-generator/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons-pack-generator/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
      },
    }),
  ],
})

/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      // Neue Versionen laden still im Hintergrund und gelten ab dem nächsten Öffnen.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Alle einsteigen!',
        short_name: 'Alle einsteigen',
        description: 'Zählspiel mit Flugzeugen für Kleinkinder',
        lang: 'de',
        start_url: '/',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#7cc8ff',
        theme_color: '#7cc8ff',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Nur der App-Code wird offline vorgehalten; Fotos und Aufnahmen nie.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});

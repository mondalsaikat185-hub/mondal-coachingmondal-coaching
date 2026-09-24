import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

// Unique id per build; the app compares it with /version.json to auto-update itself.
const MC_BUILD_ID = String(Date.now());

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      {
        name: 'mc-version-json',
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: MC_BUILD_ID }) });
        }
      },
      react(), 
      tailwindcss(),
      viteSingleFile(),
      VitePWA({
        selfDestroying: true,
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: {
          name: 'Mondal Coaching',
          short_name: 'MC Tuition',
          description: 'Mondal Coaching Live Portal',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          start_url: './',
          scope: './',
          orientation: 'any',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true
        }
      })
    ],
    define: {
      __MC_BUILD_ID__: JSON.stringify(MC_BUILD_ID),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

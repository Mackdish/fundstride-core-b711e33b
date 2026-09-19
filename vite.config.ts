import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),

    cloudflare({ viteEnvironment: { name: 'ssr' } }),

    tanstackStart({
      server: { entry: 'server' },
    }),

    react(),

    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      filename: 'sw.js',
      devOptions: { enabled: false },
      manifest: false,

      workbox: {
        navigateFallback: null,

        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,woff,woff2,json,webmanifest}',
        ],

        modifyURLPrefix: {
          'client/': '/',
        },

        navigateFallbackDenylist: [
          /^\/~oauth/,
          /^\/api\//,
        ],

        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.mode === 'navigate',

            handler: 'NetworkFirst',

            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 5,
            },
          },

          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin &&
              /\.(?:js|css|woff2?|png|svg|webp|ico)$/.test(
                url.pathname,
              ),

            handler: 'CacheFirst',

            options: {
              cacheName: 'asset-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
});

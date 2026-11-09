import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => ({
  // './' funciona igual en Netlify y en GitHub Pages (subcarpeta del repo)
  base: './',
  plugins: [
    // `npm run dev:https` -> la cámara del celular solo funciona en páginas HTTPS
    ...(mode === 'https' ? [basicSsl()] : []),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'sello.png'],
      manifest: {
        name: 'Álbum de la boda',
        short_name: 'Álbum',
        description: 'Comparte tus fotos de la boda en un álbum común.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#2f4f2f',
        theme_color: '#b88c64',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
      },
    }),
  ],
}));

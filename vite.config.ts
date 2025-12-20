import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { metaImagesPlugin } from './vite-plugin-meta-images';

export default defineConfig(async ({ command, mode }) => {
  const conditionalPlugins = process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined
    ? [
        await import('@replit/vite-plugin-cartographer').then((m) => m.cartographer()),
        await import('@replit/vite-plugin-dev-banner').then((m) => m.devBanner()),
      ]
    : [];

  return {
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    ...conditionalPlugins,
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@assets': path.resolve(import.meta.dirname, 'attached_assets'),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, 'client'),
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion'],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return;
          if (id.includes('node_modules')) {
            // Bundle React, React-DOM, and framer-motion together to avoid React.Children undefined error
            if (id.includes('react') || id.includes('framer-motion')) return 'vendor-react';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ['**/.*'],
    },
  },
  };
});

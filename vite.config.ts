import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { metaImagesPlugin } from './vite-plugin-meta-images';
import type { Plugin } from 'vite';

// Plugin to preload vendor-react chunk and expose React globally
// Fixes framer-motion error: "Cannot set properties of undefined (setting 'Children')"
// framer-motion expects React.Children to be available when it initializes
function reactGlobalShim(): Plugin {
  return {
    name: 'react-global-shim',
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle }) {
        if (!bundle) return html;

        // Find ONLY the vendor-react chunk (not react-dom or framer)
        // This ensures React loads first and is exposed globally
        const vendorReactChunk = Object.keys(bundle).find(
          (key) => key.startsWith('assets/vendor-react-') &&
                   !key.includes('dom') &&
                   !key.includes('framer') &&
                   key.endsWith('.js')
        );

        if (!vendorReactChunk) {
          console.warn('[react-global-shim] vendor-react chunk not found in bundle');
          return html;
        }

        // Return tag descriptor to inject inline module script
        // This will be inserted in the head, before other module scripts
        return [
          {
            tag: 'script',
            attrs: { type: 'module' },
            children: `import * as React from '/${vendorReactChunk}';\nwindow.React = React;`,
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}

export default defineConfig(async ({ command, mode }) => {
  const conditionalPlugins = process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined
    ? [
        await import('@replit/vite-plugin-cartographer').then((m) => m.cartographer()),
        await import('@replit/vite-plugin-dev-banner').then((m) => m.devBanner()),
      ]
    : [];

  return {
  plugins: [
    reactGlobalShim(),
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
            // Separate React/React-DOM from framer-motion to avoid initialization race
            // React must be available globally before framer-motion loads
            if (id.includes('react-dom')) return 'vendor-react-dom';
            if (id.includes('react') && !id.includes('framer')) return 'vendor-react';
            if (id.includes('framer-motion')) return 'vendor-framer';
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

import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: '/src/',
      },
    ],
  },
  build: {
    minify: 'terser',
    terserOptions: {
      module: true,
      toplevel: true,
      compress: {
        passes: 3,
      },
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
});

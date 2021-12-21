import preact from '@preact/preset-vite';
import eslintPlugin from '@rollup/plugin-eslint';
import { defineConfig } from 'vite';
import { name, version } from './package.json';

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  plugins: [
    {
      ...eslintPlugin({
        include: 'src/{**/*,*}.{ts,tsx}',
        throwOnError: true,
      }),
      enforce: 'pre',
    },
    preact(),
  ],
  define: {
    'import.meta.env.__NAME__': JSON.stringify(name || ''),
    'import.meta.env.__VERSION__': JSON.stringify(version || ''),
  },
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

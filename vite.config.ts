import preact from '@preact/preset-vite';
import eslintPlugin from '@rollup/plugin-eslint';
import { defineConfig } from 'vite';

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

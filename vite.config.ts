import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
        watch: {
          usePolling: true
        }
      },
      plugins: [
        react(),
        wasm(),
        topLevelAwait()
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@lib': path.resolve(__dirname, 'arcadegpu-code/src/lib'),
        }
      }
    };
});

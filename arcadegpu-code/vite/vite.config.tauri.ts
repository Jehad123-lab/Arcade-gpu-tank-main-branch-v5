import { defineConfig } from 'vite';
import FullReload from 'vite-plugin-full-reload';
import path from 'path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { viteStaticCopy } from 'vite-plugin-static-copy';
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      wasm(),
      topLevelAwait(),
      FullReload(['public/**'])
    ],
    resolve: {
      alias: {
        '@lib': path.resolve(__dirname, '../src/lib')
      }
    },
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
          protocol: "ws",
          host,
          port: 1421,
        }
        : undefined,
      watch: {
        // 3. tell vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
    build: {
      target: 'esnext',
      sourcemap: false,
      outDir: "dist",
      rollupOptions: {
        treeshake: false,
        input: 'game.html',
        output: {
          inlineDynamicImports: true
        }
      }
    },
  }
});
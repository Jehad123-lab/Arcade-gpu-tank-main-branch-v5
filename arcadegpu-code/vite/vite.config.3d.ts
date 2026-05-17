import { defineConfig } from 'vite';
import FullReload from 'vite-plugin-full-reload';
import path from 'path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  return {
    publicDir: false,
    plugins: [
      wasm(),
      topLevelAwait(),
      viteStaticCopy({
        targets: [
          { src: 'public/textures/*', dest: 'textures' },
          { src: 'public/styles/*', dest: 'styles' },
          { src: 'public/wasms/*', dest: 'wasms' },
        ]
      })
    ],
    build: {
      minify: false,
      lib: {
        entry: path.resolve(__dirname, '../src/lib/index_3d.ts'),
        name: 'ArcadeGPU',
        fileName: 'index',
        formats: ['es'],
      },
      target: 'esnext',
      rollupOptions: {
        treeshake: false,
        output: {
          inlineDynamicImports: true
        }
      }
    }
  }
});
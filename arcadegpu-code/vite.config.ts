import { defineConfig } from 'vite';
import FullReload from 'vite-plugin-full-reload';
import path from 'path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  if (mode == 'development') {
    return {
      plugins: [
        FullReload(['public/**'])
      ],
      resolve: {
        alias: {
          '@lib': path.resolve(__dirname, './src/lib')
        }
      },
      build: {
        target: 'esnext',
        rollupOptions: {
          treeshake: false,
        }
      }
    }
  }

  if (mode == 'demo') {
    return {
      plugins: [
        FullReload(['public/**'])
      ],
      resolve: {
        alias: {
          '@lib': path.resolve(__dirname, './src/lib')
        }
      },
      build: {
        minify: true,
        target: 'esnext',
        rollupOptions: {
          treeshake: false,
          input: 'examples.html',
          output: {
            inlineDynamicImports: true
          }
        }
      }
    }
  }

  if (mode == 'game') {
    return {
      plugins: [
        FullReload(['public/**'])
      ],
      resolve: {
        alias: {
          '@lib': path.resolve(__dirname, './src/lib')
        }
      },
      build: {
        minify: true,
        target: 'esnext',
        rollupOptions: {
          treeshake: false,
          input: 'game.html',
          output: {
            inlineDynamicImports: true
          }
        }
      }
    }
  }

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
      minify: true,
      lib: {
        entry: path.resolve(__dirname, 'src/lib/arcadegpu.ts'),
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
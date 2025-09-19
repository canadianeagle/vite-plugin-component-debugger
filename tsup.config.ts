import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['vite'],
  treeshake: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  shims: true,
  esbuildOptions(options) {
    options.format = options.format;
  },
  bundle: true,
  target: 'es2020'
});
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['vite'],
  // estree-walker@3 is ESM-only (no "require" condition in its exports map),
  // so leaving it external makes the CJS build throw ERR_PACKAGE_PATH_NOT_EXPORTED
  // on require(). Bundle it instead.
  noExternal: ['estree-walker'],
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
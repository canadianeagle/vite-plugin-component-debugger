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
    options.footer = {
      js: `if (module.exports.default) {
        module.exports = module.exports.default;
        for (const key in module.exports.default) {
          module.exports[key] = module.exports.default[key];
        }
      }`
    };
  }
});
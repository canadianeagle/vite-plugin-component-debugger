# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v2.3.0...HEAD) - 2026-07-27

## [v2.3.0](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v2.2.1...v2.3.0) - 2026-07-27

- docs: correct false claims in readme, drop stale release notes, cut emoji ([`e62ab2c`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/e62ab2c1ccb3047b7be559c6f79eddf2be57f286)) by 
- docs: strip decorative emoji across the repo ([`7be7eda`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/7be7eda5ac86df4f7286739ae4926ebeee327f32)) by 
- fix: release v2.3.0 and repair the auto-release version check ([`8159c00`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/8159c0016a6640a09b4b9e0a073051755a02aa6e)) by 
- ci: fail the release before tagging when npm auth is broken ([`c0bb0b0`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/c0bb0b0305842aa4722ca9f20e6479eaa6732e42)) by 
- ci: publish via npm trusted publishing (OIDC) with token fallback ([`d134f62`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/d134f626f791e18843bff4c0886baaca65ab8c43)) by 
- chore: update changelog for v2.2.1 [skip ci] ([`a952958`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/a9529588a005f12f521c965a3be1466302f99820)) by 
- fix: run the release job on Node 22 so npm can be upgraded for OIDC ([`cb42b19`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/cb42b19247ffa7c52b67f37d533de7e6a825d7c0)) by 
- chore: update changelog for v2.3.0 [skip ci] ([`79dc0ca`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/79dc0ca76e8004075b1b26a258395a0402e25ad4)) by 

## [Unreleased](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v2.3.0...HEAD) - 2026-07-26

## [v2.3.0](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v2.2.1...v2.3.0) - 2026-07-26

- fix: release v2.3.0 and repair the auto-release version check ([`8159c00`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/8159c0016a6640a09b4b9e0a073051755a02aa6e)) by 
- chore: update changelog for v2.2.1 [skip ci] ([`a952958`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/a9529588a005f12f521c965a3be1466302f99820)) by 

> Note: v2.2.1 was tagged but never reached npm; its release run failed to authenticate
> with the registry. The last published version before this one is v2.2.0.


## [v2.3.0](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v2.2.0...v2.3.0) - 2026-07-26

### Fixed

- **Published CommonJS entry was unusable.** `require('vite-plugin-component-debugger')` threw
  `ERR_PACKAGE_PATH_NOT_EXPORTED` because the ESM-only `estree-walker@3` was left external in the
  CJS bundle. It is now bundled (`noExternal`), and CI imports both build outputs.
- **Files with a Vite query suffix were silently skipped.** `path.extname('App.tsx?v=abc')` does not
  equal `.tsx`, so ids carrying `?v=`, `?t=` or `?import` were never processed.
- **`metadataEncoding: 'none'` produced double-escaped metadata** (`&amp;quot;` instead of `"`),
  making the attribute unparseable as JSON. Escaping now happens exactly once.
- **`onTransform` reported cumulative element names.** `elementNames` listed every element type seen
  across all files so far instead of the current file's.
- **Statistics accumulated across builds.** Added a `buildStart` reset so watch-mode rebuilds no
  longer report ever-growing totals.
- **`<A.B.C />` was tagged as `undefined.C`.** Nested JSX member expressions are now resolved
  recursively.
- **Fragment forms disagreed on nesting depth.** `<>`, `<Fragment>` and `<React.Fragment>` are now
  all transparent to `maxDepth`/`minDepth`/`tagOnlyRoots`; previously only the shorthand was.
- **Element names colliding with `Object.prototype` corrupted statistics.** `<constructor />` yielded
  `"function Object() { [native code] }1"`; `byElementType` now uses a null-prototype object.
- **Metadata truncation could emit invalid JSON** by slicing a `\uXXXX` escape or surrogate pair in
  half. Oversized metadata now falls back to a bounded, always-valid summary object.
- **Path globs never matched on Windows.** Backslash separators are normalized to `/` before
  matching, and the plugin's own relative paths are normalized too.
- **`exportStats` containment used a bare string prefix**, so a sibling directory such as
  `project-evil/` passed the check against root `project/`. Now separator-aware.
- **`exportStats` crashed under a true ESM process** (`Dynamic require of "path" is not supported`);
  `path` is now statically imported.
- **`customAttributes` keys and `attributePrefix` were injected into JSX verbatim**, so a malformed
  name could inject arbitrary JSX or make the module unparseable. Attribute names are now validated.
- **A prefixed `__proto__` key bypassed the dangerous-key guard** because the prefix was stripped
  after the check.
- **Imports from unrelated packages containing "three"** (e.g. `three-column-layout`) caused their
  components to be skipped. Matching is now scoped to `three`, `three/*`, `three-stdlib` and
  `@react-three/*`.
- **The `production` preset's `path` transformer was dead code**: `path` was not in its
  `includeAttributes` allowlist, so the documented "shortened paths" never appeared.
- **Source maps carried `sources: [""]`.** The map now names the source file and inlines its content.
- **`projectRoot` ignored Vite's resolved `root`**, breaking path globs and ids when `root` differs
  from `process.cwd()` (monorepos, nested roots).
- **`tsc --noEmit` failed**: `minimatch.makeRe()` returns `false`, not `null`, on an uncompilable
  pattern.

### Changed

- **Vite support widened to `^2.0.0 || ^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`.**
  The previous range started at `^4.0.0` and stopped at `^7.0.0`, so `npm install` refused outright
  on Vite 8 (current latest, 8.1.5) and on Vite 2 and 3. Every major in the new range is verified by
  a real `vite build`, including Vite 8, which builds with Rolldown/oxc rather than esbuild+Rollup.
  Vite 7 and 8 require Node `^20.19.0 || >=22.12.0`; the package's own `engines` floor is unchanged
  at `>=18.12.0`.
- `minimatch` bumped to `^10.2.5`, which patches the ReDoS advisories affecting 10.0.0 to 10.2.2 and
  restores Node 18 support. Production dependencies now audit clean.
- The plugin is exported both as `default` and as the named `componentDebugger`.
- Dev Node pin (`.nvmrc`, `.node-version`) raised to 18.20.8 to satisfy the TypeScript-ESLint
  toolchain. The published `engines.node` requirement is unchanged at `>=18.12.0`.

### Added

- An actual ESLint configuration (`.eslintrc.json`). `pnpm run lint` previously failed outright
  because no config existed.
- `@vitest/coverage-v8`, so `pnpm run test:coverage` works.
- A `typecheck` script.
- `src/__tests__/regressions.test.ts`. 23 of its 34 tests fail against v2.2.1.
- `src/__tests__/adversarial.test.ts`. A property-based suite asserting that the transform never
  corrupts source: output must re-parse, and stripping the injected attributes must recover the
  original bytes. Covers 65 hostile JSX shapes across 17 config combinations, plus 400 seeded
  random JSX trees. It includes a guard that fails if the suite stops reaching its own assertions.
  Verified by mutation testing: 27 of 27 injected bugs are caught.

### CI

- Lint and typecheck are now hard gates. They were previously suffixed with
  `|| echo "No lint script"` and `|| echo "No TypeScript check"`, which hid every failure above.
- Coverage no longer falls back to a plain test run, which had been masking the missing coverage
  provider.
- Added a smoke test that imports both the CJS and ESM build outputs.
- Added a `vite-compat` job running `scripts/vite-compat.mjs`, which builds a fixture app against
  every Vite major named in `peerDependencies.vite` and asserts the injected attributes and line
  numbers. It reads the majors out of the peer range, so widening the range automatically widens
  what CI tests. Runs on Node 22 because Vite 7+ requires it.

### Documentation

- Documented that `enabled` defaults to `true` with no `apply` restriction, so a bare
  `componentDebugger()` also tags production builds.
- Explained *why* plugin order matters: `vite:react-babel` is also `enforce: 'pre'`, so array order
  within the `pre` group is what decides.
- Corrected the README's before/after example. Attributes are appended after existing props, not
  prepended.
- Corrected `includeSourceMapHints`, which adds a `data-dev-sourcemap` attribute rather than source
  map comments, and only when `path` is included.
- Clarified that `preset: 'production'` selects attributes and does not disable the plugin.

## [v2.2.0](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v2.1.0...v2.2.0) - 2025-10-07

### Pull Requests
- feat: Add support for Vite 6 and 7 in peer dependencies ([#10](https://github.com/canadianeagle/vite-plugin-component-debugger/pull/10))

- feat: Add project image and update documentation ([`f72fc76`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/f72fc76185e513a6a1301e91711d4fe78d280bc8)) by 
- chore: update changelog for v2.1.0 [skip ci] ([`3093426`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/309342609e343b400f84e6258e73ba965a5bce5b)) by 
- chore: release v2.2.0 [skip ci] ([`fb351d8`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/fb351d8eaf0b72edb223efd88ab225495c2a4d8e)) by 

## [Unreleased](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v2.1.0...HEAD) - 2025-10-02

## [v2.1.0](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v2.0.0...v2.1.0) - 2025-10-01

### Pull Requests
- fix: use PAT token to allow workflows to trigger on PR merges ([#8](https://github.com/canadianeagle/vite-plugin-component-debugger/pull/8))
- feat: modularize plugin architecture and implement performance optimizations ([#7](https://github.com/canadianeagle/vite-plugin-component-debugger/pull/7))

- chore: add changelog template and update changelog generation in auto-release workflow ([`7a7d575`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/7a7d575d8d5b291ad5fe53c89abbfed0e65afbbe)) by 
- refactor: streamline auto-release workflow and improve version checking logic ([`657e5da`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/657e5da6259003605077496c4182c6d4038cd8f6)) by 
- feat: restore automatic version bumping and enhance changelog generation ([`78abd19`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/78abd197a4b32633bd19343ffe8648b4e93cd6f0)) by 
- chore: release v2.1.0 [skip ci] ([`055b7ea`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/055b7ea5540d13b02b40aab6be1a689b598db6c6)) by 

## [Unreleased](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v2.0.0...HEAD) - 2025-09-30


- refactor: streamline auto-release workflow and improve version checking logic ([`657e5da`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/657e5da6259003605077496c4182c6d4038cd8f6)) by 


## [v2.0.0](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v1.4.0...v2.0.0) - 2025-09-30


### Pull Requests
- v2.0.0: Major Feature Release with 10+ New Capabilities ([#6](https://github.com/canadianeagle/vite-plugin-component-debugger/pull/6))

- chore: release v1.4.0 [skip ci] ([`8209b32`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/8209b32092466db926ba14372a073fc7462366bd)) by 


## [v1.4.0](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v1.3.1...v1.4.0) - 2025-09-30


### Pull Requests
- feat: add includeAttributes and excludeAttributes options for filtering data attributes ([#5](https://github.com/canadianeagle/vite-plugin-component-debugger/pull/5))

- chore: release v1.3.1 [skip ci] ([`5bc59f4`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/5bc59f4ca47131c72c4c05684697ac8ee66ab020)) by 

- feat: add includeAttributes and excludeAttributes options for filtering data attributes (#5) ([`1c97646`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/1c97646b88fb181d0e9203f07b9ee64a0977cf42))

## [v1.3.1](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v1.3.0...v1.3.1) - 2025-09-27


### Pull Requests
- fix: handle multi-line JSX elements correctly when inserting attributes ([#3](https://github.com/canadianeagle/vite-plugin-component-debugger/pull/3))

- chore: release v1.3.0 [skip ci] ([`8929854`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/892985402187551742fe0a1c234046641a808a39)) by 


## [v1.3.0](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v1.2.0...v1.3.0) - 2025-09-19


- feat: update default values for includeProps and includeContent to false for improved performance and less noise in the DOM ([`c40d02e`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/c40d02e566901ba83381c8b69aada8d3a1c295f8)) by 
- chore: release v1.2.0 [skip ci] ([`f6ac6bb`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/f6ac6bbf34bcca4f54391438e7675af99e5ce7ff)) by 


## [v1.2.0](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v1.1.0...v1.2.0) - 2025-09-19


- feat: use componentDebugger for consistency and update related documentation and tests ([`94febd9`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/94febd9c308635c37fbdfe0e3895dab1bdef7f02)) by 
- chore: release v1.1.0 [skip ci] ([`aaecba6`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/aaecba6eb6c925e0e23120644f5a8648e170de4f)) by 


## [v1.1.0](https://github.com/canadianeagle/vite-plugin-component-debugger/compare/v1.0.1...v1.1.0) - 2025-09-19


- feat: Add complex and nested components for testing line number accuracy ([`45881e3`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/45881e3dc47bea1af9cb31e19271c79791629cfe)) by 
- chore: release v1.0.1 [skip ci] ([`7ca8475`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/7ca84752c3c6a667c7a8ea1d898032fcf9727d9d)) by 


## v1.0.1 - 2025-09-19


- chore: update code structure and remove redundant changes ([`81dd38b`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/81dd38b09dd1722db908f8277b2d06146b740471)) by 
- first commit ([`4ac7b57`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/4ac7b579eed78e4d0f5c0f40c640997fb1d53441)) by 
- chore: organize and clean up code structure for better maintainability ([`c17ffa7`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/c17ffa70e2c0fc2954bb144f71cfd1f42dbc864f)) by 
- feat: migrate workflows to pnpm for dependency management and build processes ([`06c9437`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/06c9437d7b41888f042ca3f4e04f35ec448d749a)) by 
- major:  v1 release + add security policy and enhance README with additional badges and acknowledgments ([`f646374`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/f646374b6f0d458d78396dd793a12dee15e5499f)) by 
- chore: add commit message validation script and update documentation with examples ([`4d7cb34`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/4d7cb34dceed825bfc3bf2e0acad9bb3b0e6075d)) by 
- chore: add permissions for contents and packages in workflows ([`9b07043`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/9b07043ee419ab72d31bf53f6ac6715427bc87e6)) by 
- chore: update Node.js and pnpm versions in workflows and documentation ([`b9d96ef`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/b9d96efbc5c9027e2a6a810a8685c1c5f64cc9a5)) by 
- fix: update package check command to remove temporary files after packing ([`f76f05d`](https://github.com/canadianeagle/vite-plugin-component-debugger/commit/f76f05d7366729a7b53e3594c8ca123653d995ae)) by 

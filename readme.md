# vite-plugin-component-debugger

<div align="center">

![Vite Plugin Component Debugger](./assets/vite-plugin-component-debugger-image.jpeg)

[![npm version](https://badge.fury.io/js/vite-plugin-component-debugger.svg)](https://badge.fury.io/js/vite-plugin-component-debugger)
[![npm downloads](https://img.shields.io/npm/dm/vite-plugin-component-debugger.svg)](https://www.npmjs.com/package/vite-plugin-component-debugger)
[![GitHub license](https://img.shields.io/github/license/canadianeagle/vite-plugin-component-debugger.svg)](https://github.com/canadianeagle/vite-plugin-component-debugger/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/canadianeagle/vite-plugin-component-debugger.svg?style=social&label=Star)](https://github.com/canadianeagle/vite-plugin-component-debugger)

[![Build Status](https://github.com/canadianeagle/vite-plugin-component-debugger/workflows/CI/badge.svg)](https://github.com/canadianeagle/vite-plugin-component-debugger/actions)
[![Auto Release](https://github.com/canadianeagle/vite-plugin-component-debugger/workflows/Auto%20Release/badge.svg)](https://github.com/canadianeagle/vite-plugin-component-debugger/actions)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-ffdd00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/tonyebrown)
[![Follow on Twitter](https://img.shields.io/twitter/follow/truevined?style=social)](https://twitter.com/truevined)

</div>

A Vite plugin that adds data attributes to your JSX and TSX elements so you can tell which
component rendered which piece of the DOM. Useful when you are debugging someone else's code,
or code you generated and have not read yet.

## What's new

**v2.3.0** repairs a CommonJS entry that threw on `require()`, widens Vite support to
2 through 8, and fixes 19 defects found in an audit of v2.2.1. Full list in
[changelog.md](./changelog.md).

## Features

- **Path filtering** with glob patterns, to include or exclude specific files
- **Attribute transformers** to rewrite any attribute value, for privacy or formatting
- **Presets** for common setups: minimal, testing, debugging, production
- **Conditional tagging** through a `shouldTag` callback
- **Custom attributes** of your own, such as git branch or environment
- **Metadata encoding** as JSON, Base64, or plain text
- **Statistics and callbacks** for tracking what was processed, with optional JSON export
- **Depth filtering** to tag only certain nesting levels
- **Attribute grouping** to collapse everything into one JSON attribute

Every option is opt-in. An existing config keeps working untouched.

[Detailed examples and use cases](./EXAMPLES.md)

## Compatibility

| Vite | Status | Notes |
| ---- | ------ | ----- |
| 8.x  | ✅ Supported | Builds with Rolldown/oxc |
| 7.x  | ✅ Supported | Requires Node `^20.19.0 \|\| >=22.12.0` |
| 6.x  | ✅ Supported | |
| 5.x  | ✅ Supported | |
| 4.x  | ✅ Supported | |
| 3.x  | ✅ Supported | |
| 2.x  | ✅ Supported | |

**Node.js:** >= 18.12.0 for the plugin itself. Vite 7 and 8 require Node 20.19+/22.12+, so
your Vite version sets the real floor.

Every version in that table is verified by a real `vite build` in CI, not just declared in
`peerDependencies`. Run it yourself with `pnpm run vite-compat`.

## Quick Start

```bash
# Install
pnpm add -D vite-plugin-component-debugger
# or: npm install --save-dev vite-plugin-component-debugger
# or: yarn add -D vite-plugin-component-debugger
```

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import componentDebugger from "vite-plugin-component-debugger";
// A named import works too:
// import { componentDebugger } from "vite-plugin-component-debugger";

export default defineConfig({
  plugins: [
    componentDebugger({ // ⚠️ IMPORTANT: Must be BEFORE react()
      enabled: process.env.NODE_ENV === "development", // When to run
      attributePrefix: "data-dev", // Custom prefix
      extensions: [".jsx", ".tsx"], // File types
    }),
    react(),
  ],
});
```

> **⚠️ CRITICAL**: componentDebugger() must be placed **BEFORE** react() in the `plugins` array, otherwise line numbers will be wrong.
>
> Both this plugin and `@vitejs/plugin-react`'s `vite:react-babel` declare `enforce: 'pre'`. Vite keeps the array order *within* the `pre` group, so listing componentDebugger first is what actually decides which transform runs first. The React plugin injects roughly 19 lines of imports and HMR setup, so running after it shifts every `data-dev-line` by that amount.

> **⚠️ `enabled` defaults to `true`, including production builds.** This plugin has no `apply` restriction, so a bare `componentDebugger()` also tags your production bundle, embedding source paths and line numbers in the shipped DOM. Gate it explicitly:
>
> ```typescript
> componentDebugger({ enabled: process.env.NODE_ENV === "development" });
> ```

## What It Does

**Before:**

```jsx
// src/components/Button.tsx (line 10)
<button className="btn-primary" onClick={handleClick}>
  Click me
</button>
```

**After (Default - All Attributes):**

```jsx
<button
  className="btn-primary"
  onClick={handleClick}
  data-dev-id="src/components/Button.tsx:10:2"
  data-dev-name="button"
  data-dev-path="src/components/Button.tsx"
  data-dev-line="10"
  data-dev-file="Button.tsx"
  data-dev-component="button"
>
  Click me
</button>
```

> Attributes are appended after your existing props, immediately before the closing `>`.

**After (Minimal Preset - Clean):**

```jsx
componentDebugger({ preset: 'minimal' })

// Results in:
<button
  className="btn-primary"
  onClick={handleClick}
  data-dev-id="src/components/Button.tsx:10:2"
>
  Click me
</button>
```

**After (Custom Filtering):**

```jsx
componentDebugger({
  includeAttributes: ["id", "name", "line"]
})

// Results in:
<button
  data-dev-id="src/components/Button.tsx:10:2"
  data-dev-name="button"
  data-dev-line="10"
  className="btn-primary"
  onClick={handleClick}
>
  Click me
</button>
```

## Why use it

- Find which component rendered any DOM element, without guessing
- Jump straight from DevTools to the source line
- Select elements in E2E tests by a stable attribute instead of a brittle CSS path
- Fragments and Three.js elements are skipped automatically, so your scene graph stays clean

The transform runs at build time and adds no runtime code. It does add attributes to your
markup, though, so gate it with `enabled` if you do not want them in a production bundle.

## Configuration

### Basic Configuration

```typescript
componentDebugger({
  enabled: process.env.NODE_ENV === "development", // When to run
  attributePrefix: "data-dev", // Custom prefix
  extensions: [".jsx", ".tsx"], // File types
});
```

### Quick Start with Presets

```typescript
// Minimal - only ID attribute (cleanest DOM)
componentDebugger({ preset: "minimal" });

// Testing - ID, name, component (perfect for E2E)
componentDebugger({ preset: "testing" });

// Debugging - everything + metadata (full visibility)
componentDebugger({ preset: "debugging" });

// Production - privacy-focused with shortened paths
componentDebugger({ preset: "production" });
```

[See all preset details in EXAMPLES.md](./EXAMPLES.md#presets)

### Common Configurations

<details>
<summary><strong>Clean DOM, minimal attributes</strong></summary>

```typescript
componentDebugger({
  includeAttributes: ["id", "name"], // Only these attributes
});
// Result: Only data-dev-id and data-dev-name
```

**[See more attribute filtering examples →](./EXAMPLES.md#attribute-filtering)**

</details>

<details>
<summary><strong>Path filtering for specific directories</strong></summary>

```typescript
componentDebugger({
  includePaths: ["src/components/**", "src/features/**"],
  excludePaths: ["**/*.test.tsx", "**/*.stories.tsx"],
});
```

**[See path filtering patterns →](./EXAMPLES.md#path-filtering)**

</details>

<details>
<summary><strong>Privacy: transform paths</strong></summary>

```typescript
componentDebugger({
  transformers: {
    path: (p) => p.split("/").slice(-2).join("/"), // Shorten paths
    id: (id) => id.split(":").slice(-2).join(":"), // Remove path from ID
  },
});
```

**[See transformer examples →](./EXAMPLES.md#attribute-transformers)**

</details>

<details>
<summary><strong>Conditional: tag specific components</strong></summary>

```typescript
componentDebugger({
  shouldTag: ({ elementName }) => {
    // Only tag custom components (uppercase)
    return elementName[0] === elementName[0].toUpperCase();
  },
});
```

**[See conditional tagging patterns →](./EXAMPLES.md#conditional-tagging)**

</details>

> Prefer `includeAttributes` over the legacy `includeProps` and `includeContent`. It produces a smaller DOM.

> **⚠️ Gotcha:** When both `includeAttributes` and `excludeAttributes` are set, `includeAttributes` takes priority

### Configuration Reference

<details open>
<summary><strong>Core Options</strong></summary>

| Option            | Type       | Default            | Description                                                                 |
| ----------------- | ---------- | ------------------ | --------------------------------------------------------------------------- |
| `enabled`         | `boolean`  | `true`             | Enable/disable the plugin                                                   |
| `attributePrefix` | `string`   | `'data-dev'`       | Prefix for data attributes                                                  |
| `extensions`      | `string[]` | `['.jsx', '.tsx']` | File extensions to process                                                  |
| `preset`          | `Preset`   | `undefined`        | Quick config: `'minimal'` \| `'testing'` \| `'debugging'` \| `'production'` |

</details>

<details>
<summary><strong>Attribute control</strong></summary>

| Option              | Type              | Default     | Description                                      |
| ------------------- | ----------------- | ----------- | ------------------------------------------------ |
| `includeAttributes` | `AttributeName[]` | `undefined` | **Recommended:** Only include these attributes   |
| `excludeAttributes` | `AttributeName[]` | `undefined` | Exclude these attributes                         |
| `transformers`      | `object`          | `undefined` | Transform attribute values (privacy, formatting) |
| `groupAttributes`   | `boolean`         | `false`     | Combine all into single JSON attribute           |

**Available:** `'id'`, `'name'`, `'path'`, `'line'`, `'file'`, `'component'`, `'metadata'`

**[→ Full attribute control examples](./EXAMPLES.md#attribute-filtering)**

</details>

<details>
<summary><strong>Path and element filtering</strong></summary>

| Option            | Type          | Default                          | Description              |
| ----------------- | ------------- | -------------------------------- | ------------------------ |
| `includePaths`    | `string[]`    | `undefined`                      | Glob patterns to include |
| `excludePaths`    | `string[]`    | `undefined`                      | Glob patterns to exclude |
| `excludeElements` | `string[]`    | `['Fragment', 'React.Fragment']` | Element names to skip    |
| `customExcludes`  | `Set<string>` | Three.js elements                | Custom elements to skip  |

**[→ Path filtering patterns](./EXAMPLES.md#path-filtering)**

</details>

<details>
<summary><strong>Conditional and custom</strong></summary>

| Option             | Type                               | Default     | Description                                  |
| ------------------ | ---------------------------------- | ----------- | -------------------------------------------- |
| `shouldTag`        | `(info) => boolean`                | `undefined` | Conditionally tag components                 |
| `customAttributes` | `(info) => Record<string, string>` | `undefined` | Add custom attributes dynamically            |
| `metadataEncoding` | `MetadataEncoding`                 | `'json'`    | Encoding: `'json'` \| `'base64'` \| `'none'` |

**[→ Conditional tagging](./EXAMPLES.md#conditional-tagging)** • **[→ Custom attributes](./EXAMPLES.md#custom-attributes)**

</details>

<details>
<summary><strong>Depth, stats and advanced</strong></summary>

| Option                  | Type              | Default     | Description             |
| ----------------------- | ----------------- | ----------- | ----------------------- |
| `maxDepth`              | `number`          | `undefined` | Maximum nesting depth   |
| `minDepth`              | `number`          | `undefined` | Minimum nesting depth   |
| `tagOnlyRoots`          | `boolean`         | `false`     | Only tag root elements  |
| `onTransform`           | `(stats) => void` | `undefined` | Per-file callback       |
| `onComplete`            | `(stats) => void` | `undefined` | Completion callback     |
| `exportStats`           | `string`          | `undefined` | Export stats to file    |
| `includeSourceMapHints` | `boolean`         | `false`     | Add a `data-dev-sourcemap` attribute (requires `path`) |
| `debug`                 | `boolean`         | `false`     | Enable debug logging    |

**[→ Depth filtering](./EXAMPLES.md#depth-filtering)** • **[→ Statistics](./EXAMPLES.md#statistics--callbacks)**

</details>

> **See complete TypeScript types:** `import { type TagOptions } from 'vite-plugin-component-debugger'`

[More examples in EXAMPLES.md](./EXAMPLES.md)

Examples include: E2E testing setups, debug overlays, monorepo configs, feature flags, performance monitoring, and more!

## Use Cases

### 1. Development Debugging (Simple)

Find components in the DOM:

```javascript
// In browser console
document.querySelectorAll('[data-dev-component="Button"]');
console.log("Button locations:", [...$$('[data-dev-path*="Button"]')]);
```

### 2. E2E Testing (Intermediate)

Stable selectors for tests:

```javascript
// Cypress
cy.get('[data-dev-component="SubmitButton"]').click();
cy.get('[data-dev-path*="LoginForm"]').should("be.visible");

// Playwright
await page.click('[data-dev-component="SubmitButton"]');
await expect(page.locator('[data-dev-path*="LoginForm"]')).toBeVisible();
```

### 3. Visual Debugging Tools (Advanced)

Build custom debugging overlays:

```javascript
// Show component boundaries on hover
document.addEventListener("mouseover", (e) => {
  const target = e.target;
  if (target.dataset?.devComponent) {
    target.style.outline = "2px solid red";
    console.log(`Component: ${target.dataset.devComponent}`);
    console.log(`Location: ${target.dataset.devPath}:${target.dataset.devLine}`);
  }
});
```

### 4. Performance Monitoring (Expert)

Track component render activity:

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.dataset?.devId) {
          console.log(`Component rendered: ${node.dataset.devId}`);
        }
      });
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });
```

## Advanced Features

### Environment-Specific Setup

```typescript
// Different configs per environment
const isDev = process.env.NODE_ENV === "development";
const isStaging = process.env.NODE_ENV === "staging";

export default defineConfig({
  plugins: [
    componentDebugger({
      enabled: isDev || isStaging,
      attributePrefix: isStaging ? "data-staging" : "data-dev",
      includeProps: isDev, // Enable metadata in development
      includeContent: isDev, // Enable content capture in development
    }),
    react(),
  ],
});
```

### React Three Fiber Support

Automatically excludes Three.js elements:

```typescript
// Default exclusions
componentDebugger({
  customExcludes: new Set([
    "mesh",
    "group",
    "scene",
    "camera",
    "ambientLight",
    "directionalLight",
    "pointLight",
    "boxGeometry",
    "sphereGeometry",
    "planeGeometry",
    "meshBasicMaterial",
    "meshStandardMaterial",
    // ... and many more
  ]),
});

// To include Three.js elements
componentDebugger({
  customExcludes: new Set(), // Empty set = tag everything
});
```

### TypeScript Support

Full type definitions included:

```typescript
import componentDebugger, { type TagOptions } from "vite-plugin-component-debugger";

const config: TagOptions = {
  enabled: true,
  attributePrefix: "data-track",
};

export default defineConfig({
  plugins: [componentDebugger(config), react()],
});
```

### Build Performance & Statistics

```
Component Debugger Statistics:
   Total files scanned: 45
   Files processed: 32
   Elements tagged: 287
```

**How it keeps out of the way:**

- Glob patterns are compiled once at startup rather than on every file
- Metadata is serialized once per element instead of repeatedly
- `node_modules` is skipped before any parsing happens
- Files outside `includePaths` are rejected before the parser runs

v2.2.0 introduced these as optimizations over v2.1. The original release notes quoted specific
speedups; those numbers are not reproduced here because there is no benchmark in the repo to
back them up. If build time matters to you, measure it with `onTransform` on your own project.

### Troubleshooting & Common Gotchas

<details>
<summary><strong>⚠️ Line numbers are wrong/offset by ~19?</strong> (Most common issue)</summary>

**Problem:** `data-dev-line` shows numbers ~19 higher than expected

**Cause:** Plugin order is wrong - React plugin adds ~19 lines of imports/HMR setup

**Fix:** Move `componentDebugger()` BEFORE `react()` in Vite config

```typescript
// ❌ WRONG - Line numbers will be offset
export default defineConfig({
  plugins: [
    react(), // Transforms code first, adds ~19 lines
    componentDebugger(), // Gets wrong line numbers
  ],
});

// ✅ CORRECT - Accurate line numbers
export default defineConfig({
  plugins: [
    componentDebugger(), // Processes original source first
    react(), // Transforms after tagging
  ],
});
```

</details>

<details>
<summary><strong>Elements not being tagged?</strong></summary>

1. **Check file extension:** File must match `extensions` (default: `.jsx`, `.tsx`)
2. **Check exclusions:** Element not in `excludeElements` or `customExcludes`
3. **Check paths:** File not excluded by `excludePaths` pattern
4. **Check plugin order:** `componentDebugger()` before `react()`
5. **Check enabled:** Plugin is enabled (`enabled: true`)
6. **Check shouldTag:** If using `shouldTag`, callback must return `true`

**Debug with:**

```typescript
componentDebugger({
  debug: true, // Shows what's being processed
  enabled: true,
});
```

</details>

<details>
<summary><strong>Build performance issues?</strong></summary>

**Quick fixes:**

1. Use `includeAttributes` to reduce DOM size:
   ```typescript
   includeAttributes: ["id", "name"]; // Only essential attributes
   ```
2. Filter paths to only process needed directories:
   ```typescript
   includePaths: ['src/components/**'],
   excludePaths: ['**/*.test.tsx', '**/*.stories.tsx']
   ```
3. Use `maxDepth` to limit deep nesting:
   ```typescript
   maxDepth: 5; // Only tag up to 5 levels deep
   ```
4. Skip test files with `excludePaths`

**[→ See performance optimization examples](./EXAMPLES.md#performance-monitoring)**

</details>

<details>
<summary><strong>Attributes appearing in production?</strong></summary>

```typescript
componentDebugger({
  enabled: process.env.NODE_ENV !== "production",
});
```

Or use environment-specific configs:

```typescript
enabled: isDev || isStaging, // Not in production
```

</details>

<details>
<summary><strong>includeAttributes vs excludeAttributes priority?</strong></summary>

**Gotcha:** When both are set, `includeAttributes` takes priority

```typescript
componentDebugger({
  includeAttributes: ["id", "name", "line"],
  excludeAttributes: ["name"], // ⚠️ This is IGNORED
});
// Result: Only id, name, line are included
```

**Best practice:** Use one or the other, not both

</details>

<details>
<summary><strong>TypeScript type errors?</strong></summary>

Import types for full IntelliSense:

```typescript
import componentDebugger, {
  type TagOptions,
  type ComponentInfo,
  type AttributeName,
} from "vite-plugin-component-debugger";

const config: TagOptions = {
  // Full type checking
};
```

</details>

## Development & Contributing

### Auto-Release Workflow

**Every commit to `main` triggers an automatic release:**

**Commit Message → Version Bump:**

- `BREAKING CHANGE:` or `major:` → Major (1.0.0 → 2.0.0)
- `feat:` or `feature:` or `minor:` → Minor (1.0.0 → 1.1.0)
- Everything else → Patch (1.0.0 → 1.0.1)

**Example commit messages:**

```bash
# Major version (breaking changes)
git commit -m "BREAKING CHANGE: removed deprecated API"
git commit -m "major: complete rewrite of plugin interface"

# Minor version (new features)
git commit -m "feat: add TypeScript 5.0 support"
git commit -m "feature: new configuration option for props"
git commit -m "minor: add custom exclude patterns"

# Patch version (bug fixes, docs, chores)
git commit -m "fix: resolve memory leak in transformer"
git commit -m "docs: update README examples"
git commit -m "chore: update dependencies"

# Skip release
git commit -m "docs: fix typo [skip ci]"
```

**What happens automatically:**

1. Tests run, package builds
2. Version bump based on commit message
3. GitHub release created with changelog
4. Package published to npm

**Setup auto-publishing:**

1. Get NPM token: `npm token create --type=automation`
2. Add to GitHub repo: **Settings** → **Secrets** → `NPM_TOKEN`
3. Commit to `main` branch to trigger first release

### Contributing

1. Fork and clone
2. `pnpm install`
3. Make changes and add tests
4. `pnpm run check` (lint + test + build)
5. Commit with semantic message (see above)
6. Open PR

See [`.github/COMMIT_CONVENTION.md`](.github/COMMIT_CONVENTION.md) for examples.

### Development Setup

```bash
git clone https://github.com/yourusername/vite-plugin-component-debugger.git
cd vite-plugin-component-debugger
pnpm install
pnpm run test     # Run tests
pnpm run build    # Build package
pnpm run check    # Full validation
```

## Author & Support

**Tonye Brown** - Builder, Front-end developer, designer, and performance optimization expert crafting immersive web experiences. Also a Music Producer and Artist.

**Connect:**

- [Website](https://www.tonyebrown.com)
- [Plugin Docs](https://www.tonyebrown.com/apps/vite-plugin-component-debugger)
- [Twitter](https://www.twitter.com/truevined)
- [LinkedIn](https://www.linkedin.com/in/tonyeb/)

**Support This Project:**

- Star this repository
- [Buy me a coffee](https://www.buymeacoffee.com/tonyebrown)
- [Sponsor on GitHub](https://github.com/sponsors/canadianeagle)
- Report issues or suggest features
- Contribute code via pull requests
- Share with other developers

## License

MIT © [Tonye Brown](https://www.tonyebrown.com)

---

<div align="center">

**Made with ❤️ by [Tonye Brown](https://www.tonyebrown.com)**

_Inspired by [lovable-tagger](https://www.npmjs.com/package/lovable-tagger), enhanced for the Vite ecosystem._

[![GitHub](https://img.shields.io/badge/GitHub-canadianeagle-181717?style=flat&logo=github)](https://github.com/canadianeagle)
[![Website](https://img.shields.io/badge/Website-tonyebrown.com-4285F4?style=flat&logo=google-chrome&logoColor=white)](https://www.tonyebrown.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-tonyeb-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/tonyeb/)

**Star this repo if it helped you!**

</div>


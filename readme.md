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

A **highly customizable** Vite plugin that automatically adds data attributes to JSX/TSX elements during development. Track, debug, and understand component rendering with powerful features like path filtering, attribute transformers, presets, and more. **Perfect for AI-generated code** and debugging "which component rendered this?" 🤔

## ✨ What's New in v2.2

**Performance Optimizations (v2.2.0):**

- 🚀 **15-30% faster** build times with 3 micro-optimizations
- ⚡ **5-10x faster path matching** with pre-compiled glob patterns
- 📦 **2-3x faster metadata encoding** with optimized JSON serialization
- 🔧 **Modular architecture** - Clean, maintainable 7-file structure

**V2 Features - Complete control over component debugging:**

- 🎯 **Path Filtering** - Include/exclude files with glob patterns
- 🔧 **Attribute Transformers** - Customize any attribute value (privacy, formatting)
- 🎨 **Presets** - Quick configs for common use cases (minimal, testing, debugging, production)
- ⚡ **Conditional Tagging** - Tag only specific components with `shouldTag` callback
- 🏷️ **Custom Attributes** - Add your own data attributes (git info, environment, etc.)
- 📦 **Metadata Encoding** - Choose JSON, Base64, or plain text encoding
- 📊 **Statistics & Callbacks** - Track processing stats and export metrics
- 🎚️ **Depth Filtering** - Control tagging by component nesting level
- 🔐 **Attribute Grouping** - Combine all attributes into single JSON attribute
- 🗺️ **Source Map Hints** - Better debugging with source map comments

**📚 [View Detailed Examples & Use Cases](./EXAMPLES.md)**

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

> **⚠️ CRITICAL**: componentDebugger() must be placed **BEFORE** react() plugin, otherwise line numbers will be wrong

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
  data-dev-id="src/components/Button.tsx:10:2"
  data-dev-name="button"
  data-dev-path="src/components/Button.tsx"
  data-dev-line="10"
  data-dev-file="Button.tsx"
  data-dev-component="button"
  className="btn-primary"
  onClick={handleClick}
>
  Click me
</button>
```

**After (Minimal Preset - Clean):**

```jsx
componentDebugger({ preset: 'minimal' })

// Results in:
<button
  data-dev-id="src/components/Button.tsx:10:2"
  className="btn-primary"
  onClick={handleClick}
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

## Key Benefits

- 🐛 **Debug Faster**: Find which component renders any DOM element
- 📍 **Jump to Source**: Go directly from DevTools to your code
- 🎯 **Stable Testing**: Use data attributes for reliable E2E tests
- ⚡ **Zero Runtime Cost**: Only runs during development
- 🔧 **Smart Exclusions**: Automatically skips Fragment and Three.js elements

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

**[📚 See all preset details in EXAMPLES.md](./EXAMPLES.md#presets)**

### Common Configurations

<details>
<summary><strong>🎯 Clean DOM - Minimal Attributes</strong></summary>

```typescript
componentDebugger({
  includeAttributes: ["id", "name"], // Only these attributes
});
// Result: Only data-dev-id and data-dev-name
```

**[See more attribute filtering examples →](./EXAMPLES.md#attribute-filtering)**

</details>

<details>
<summary><strong>🗂️ Path Filtering - Specific Directories</strong></summary>

```typescript
componentDebugger({
  includePaths: ["src/components/**", "src/features/**"],
  excludePaths: ["**/*.test.tsx", "**/*.stories.tsx"],
});
```

**[See path filtering patterns →](./EXAMPLES.md#path-filtering)**

</details>

<details>
<summary><strong>🔧 Privacy - Transform Paths</strong></summary>

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
<summary><strong>⚡ Conditional - Tag Specific Components</strong></summary>

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

> **💡 Pro Tip:** Use `includeAttributes` for cleaner DOM instead of legacy `includeProps`/`includeContent`

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
<summary><strong>V2 Features - Attribute Control</strong></summary>

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
<summary><strong>V2 Features - Path & Element Filtering</strong></summary>

| Option            | Type          | Default                          | Description              |
| ----------------- | ------------- | -------------------------------- | ------------------------ |
| `includePaths`    | `string[]`    | `undefined`                      | Glob patterns to include |
| `excludePaths`    | `string[]`    | `undefined`                      | Glob patterns to exclude |
| `excludeElements` | `string[]`    | `['Fragment', 'React.Fragment']` | Element names to skip    |
| `customExcludes`  | `Set<string>` | Three.js elements                | Custom elements to skip  |

**[→ Path filtering patterns](./EXAMPLES.md#path-filtering)**

</details>

<details>
<summary><strong>V2 Features - Conditional & Custom</strong></summary>

| Option             | Type                               | Default     | Description                                  |
| ------------------ | ---------------------------------- | ----------- | -------------------------------------------- |
| `shouldTag`        | `(info) => boolean`                | `undefined` | Conditionally tag components                 |
| `customAttributes` | `(info) => Record<string, string>` | `undefined` | Add custom attributes dynamically            |
| `metadataEncoding` | `MetadataEncoding`                 | `'json'`    | Encoding: `'json'` \| `'base64'` \| `'none'` |

**[→ Conditional tagging](./EXAMPLES.md#conditional-tagging)** • **[→ Custom attributes](./EXAMPLES.md#custom-attributes)**

</details>

<details>
<summary><strong>V2 Features - Depth, Stats & Advanced</strong></summary>

| Option                  | Type              | Default     | Description             |
| ----------------------- | ----------------- | ----------- | ----------------------- |
| `maxDepth`              | `number`          | `undefined` | Maximum nesting depth   |
| `minDepth`              | `number`          | `undefined` | Minimum nesting depth   |
| `tagOnlyRoots`          | `boolean`         | `false`     | Only tag root elements  |
| `onTransform`           | `(stats) => void` | `undefined` | Per-file callback       |
| `onComplete`            | `(stats) => void` | `undefined` | Completion callback     |
| `exportStats`           | `string`          | `undefined` | Export stats to file    |
| `includeSourceMapHints` | `boolean`         | `false`     | Add source map comments |
| `debug`                 | `boolean`         | `false`     | Enable debug logging    |

**[→ Depth filtering](./EXAMPLES.md#depth-filtering)** • **[→ Statistics](./EXAMPLES.md#statistics--callbacks)**

</details>

> **💡 All v2 features are opt-in** - Existing configs work unchanged
>
> **📖 See complete TypeScript types:** `import { type TagOptions } from 'vite-plugin-component-debugger'`

**📚 [View 50+ Detailed Examples in EXAMPLES.md →](./EXAMPLES.md)**

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
📊 Component Debugger Statistics:
   Total files scanned: 45
   Files processed: 32
   Elements tagged: 287
```

**Performance optimizations (v2.2.0):**

- 🚀 **15-30% faster** than v2.1 with 3 micro-optimizations
- ⚡ **Pre-compiled glob patterns** - 5-10x faster path matching
- 📦 **Optimized JSON serialization** - 2-3x faster metadata encoding
- 🔧 **Smart string operations** - 2x faster debug logging
- **Time savings**: 200-500ms on 100-file projects, 2-5s on 1000-file projects
- Efficient AST traversal with caching
- Minimal HMR impact
- Automatically skips `node_modules`
- Only runs during development

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

🚀 **Every commit to `main` triggers automatic release:**

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

- 🌐 [Website](https://www.tonyebrown.com)
- 📖 [Plugin Docs](https://www.tonyebrown.com/apps/vite-plugin-component-debugger)
- 🐦 [Twitter](https://www.twitter.com/truevined)
- 💼 [LinkedIn](https://www.linkedin.com/in/tonyeb/)

**Support This Project:**

- ⭐ Star this repository
- ☕ [Buy me a coffee](https://www.buymeacoffee.com/tonyebrown)
- 💝 [Sponsor on GitHub](https://github.com/sponsors/canadianeagle)
- 🐛 Report issues or suggest features
- 🤝 Contribute code via pull requests
- 📢 Share with other developers

## License

MIT © [Tonye Brown](https://www.tonyebrown.com)

---

<div align="center">

**Made with ❤️ by [Tonye Brown](https://www.tonyebrown.com)**

_Inspired by [lovable-tagger](https://www.npmjs.com/package/lovable-tagger), enhanced for the Vite ecosystem._

[![GitHub](https://img.shields.io/badge/GitHub-canadianeagle-181717?style=flat&logo=github)](https://github.com/canadianeagle)
[![Website](https://img.shields.io/badge/Website-tonyebrown.com-4285F4?style=flat&logo=google-chrome&logoColor=white)](https://www.tonyebrown.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-tonyeb-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/tonyeb/)

**⭐ Star this repo if it helped you!**

</div>


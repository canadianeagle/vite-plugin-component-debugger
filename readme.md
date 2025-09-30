# vite-plugin-component-debugger

<div align="center">

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

## ✨ What's New in v2.0

**10+ powerful features** for complete control over component debugging:

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
    componentDebugger(), // ⚠️ IMPORTANT: Must be BEFORE react()
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
// Minimal setup - only ID attribute
componentDebugger({ preset: 'minimal' })

// Testing setup - ID, name, component
componentDebugger({ preset: 'testing' })

// Full debugging - all attributes + props + content
componentDebugger({ preset: 'debugging' })

// Production-safe - privacy-focused with shortened paths
componentDebugger({ preset: 'production' })
```

### Advanced Configuration

```typescript
componentDebugger({
  // Core settings
  enabled: process.env.NODE_ENV === "development",
  attributePrefix: "data-dev",
  extensions: [".jsx", ".tsx"],

  // 🎯 Attribute filtering (RECOMMENDED - cleaner DOM, better performance)
  includeAttributes: ["id", "name", "line"], // Only include these attributes
  // OR
  excludeAttributes: ["metadata", "file"], // Exclude these attributes

  // 🗂️ Path filtering with glob patterns
  includePaths: ["src/components/**", "src/features/**"],
  excludePaths: ["**/*.test.tsx", "**/*.stories.tsx"],

  // 🔧 Attribute transformers (customize any value)
  transformers: {
    path: (p) => p.split('/').slice(-2).join('/'), // Shorten paths
    id: (id) => id.split(':').slice(-2).join(':'), // Remove path from ID
  },

  // ⚡ Conditional tagging
  shouldTag: ({ elementName }) => {
    return elementName[0] === elementName[0].toUpperCase(); // Only custom components
  },

  // 🏷️ Custom attributes
  customAttributes: () => ({
    'data-dev-env': process.env.NODE_ENV,
    'data-dev-version': process.env.npm_package_version,
  }),

  // 📦 Metadata encoding
  metadataEncoding: 'base64', // 'json' (default), 'base64', or 'none'

  // 📊 Statistics & callbacks
  onTransform: ({ file, elementsTagged }) => {
    console.log(`✓ ${file}: ${elementsTagged} elements`);
  },
  exportStats: 'build-stats.json',

  // 🎚️ Depth filtering
  maxDepth: 3, // Only tag up to 3 levels deep
  tagOnlyRoots: true, // Only tag root elements

  // 🔐 Attribute grouping
  groupAttributes: true, // Combine all into single data-dev attribute

  // Element exclusions
  excludeElements: ["Fragment", "React.Fragment"],
  customExcludes: new Set(["mesh", "group", "camera"]), // Three.js elements

  // Legacy options (use includeAttributes/excludeAttributes instead)
  includeProps: false, // Deprecated: use includeAttributes with transformers
  includeContent: false, // Deprecated: use includeAttributes with transformers
});
```

> **💡 Tip:** Use `includeAttributes` or `excludeAttributes` for cleaner DOM and better performance instead of the legacy `includeProps`/`includeContent` options.

### All Configuration Options

#### Core Options
| Option            | Type          | Default              | Description                           |
| ----------------- | ------------- | -------------------- | ------------------------------------- |
| `enabled`         | `boolean`     | `true`               | Enable/disable the plugin             |
| `attributePrefix` | `string`      | `'data-dev'`         | Prefix for data attributes            |
| `extensions`      | `string[]`    | `['.jsx', '.tsx']`   | File extensions to process            |
| `preset`          | `Preset`      | `undefined`          | Quick config: `'minimal'`, `'testing'`, `'debugging'`, `'production'` |

#### Attribute Control (v2)
| Option              | Type              | Default      | Description                                      |
| ------------------- | ----------------- | ------------ | ------------------------------------------------ |
| `includeAttributes` | `AttributeName[]` | `undefined`  | Allowlist: only include these attributes (recommended) |
| `excludeAttributes` | `AttributeName[]` | `undefined`  | Disallowlist: exclude these attributes           |
| `transformers`      | `object`          | `undefined`  | Transform any attribute value (path, id, name, line, file, component) |
| `groupAttributes`   | `boolean`         | `false`      | Combine all attributes into single JSON attribute |

**Available attribute names:** `'id'`, `'name'`, `'path'`, `'line'`, `'file'`, `'component'`, `'metadata'`

#### Path & Element Filtering (v2)
| Option            | Type          | Default                          | Description                           |
| ----------------- | ------------- | -------------------------------- | ------------------------------------- |
| `includePaths`    | `string[]`    | `undefined`                      | Glob patterns for files to include    |
| `excludePaths`    | `string[]`    | `undefined`                      | Glob patterns for files to exclude    |
| `excludeElements` | `string[]`    | `['Fragment', 'React.Fragment']` | Element names to exclude              |
| `customExcludes`  | `Set<string>` | Three.js elements                | Custom element names to exclude       |

#### Conditional & Custom (v2)
| Option             | Type                              | Default      | Description                                   |
| ------------------ | --------------------------------- | ------------ | --------------------------------------------- |
| `shouldTag`        | `(info) => boolean`               | `undefined`  | Callback to conditionally tag components      |
| `customAttributes` | `(info) => Record<string, string>`| `undefined`  | Add custom data attributes dynamically        |

#### Metadata & Encoding (v2)
| Option              | Type               | Default  | Description                                          |
| ------------------- | ------------------ | -------- | ---------------------------------------------------- |
| `metadataEncoding`  | `MetadataEncoding` | `'json'` | Encoding format: `'json'`, `'base64'`, or `'none'`   |
| `includeProps`      | `boolean`          | `false`  | ⚠️ Legacy: Include props in metadata (use `includeAttributes` instead) |
| `includeContent`    | `boolean`          | `false`  | ⚠️ Legacy: Include content in metadata (use `includeAttributes` instead) |

#### Depth Control (v2)
| Option         | Type      | Default      | Description                              |
| -------------- | --------- | ------------ | ---------------------------------------- |
| `maxDepth`     | `number`  | `undefined`  | Maximum nesting depth to tag             |
| `minDepth`     | `number`  | `undefined`  | Minimum nesting depth to tag             |
| `tagOnlyRoots` | `boolean` | `false`      | Only tag root-level elements             |

#### Statistics & Callbacks (v2)
| Option          | Type                    | Default      | Description                              |
| --------------- | ----------------------- | ------------ | ---------------------------------------- |
| `onTransform`   | `(stats) => void`       | `undefined`  | Callback after each file transformation  |
| `onComplete`    | `(stats) => void`       | `undefined`  | Callback after all files processed       |
| `exportStats`   | `string`                | `undefined`  | File path to export statistics JSON      |

#### Advanced (v2)
| Option                 | Type      | Default | Description                              |
| ---------------------- | --------- | ------- | ---------------------------------------- |
| `includeSourceMapHints`| `boolean` | `false` | Add source map comments for debugging    |
| `debug`                | `boolean` | `false` | Enable debug logging                     |

### Feature Examples

#### Attribute Filtering
```typescript
// Minimal setup - only ID
componentDebugger({
  includeAttributes: ["id"]
});
// Result: <button data-dev-id="src/Button.tsx:10:2">Click me</button>

// Exclude verbose attributes
componentDebugger({
  excludeAttributes: ["metadata", "file", "component"]
});
```

#### Path Filtering
```typescript
// Only process specific directories
componentDebugger({
  includePaths: ["src/components/**", "src/features/**"],
  excludePaths: ["**/*.test.tsx", "**/*.stories.tsx"]
});
```

#### Attribute Transformers
```typescript
// Shorten paths for privacy
componentDebugger({
  transformers: {
    path: (p) => p.split('/').slice(-2).join('/'), // "auth/LoginForm.tsx"
    id: (id) => id.split(':').slice(-2).join(':')   // "10:2"
  }
});
```

#### Conditional Tagging
```typescript
// Only tag custom components
componentDebugger({
  shouldTag: ({ elementName }) => {
    return elementName[0] === elementName[0].toUpperCase();
  }
});
```

#### Custom Attributes
```typescript
// Add git and environment info
componentDebugger({
  customAttributes: () => ({
    'data-dev-env': process.env.NODE_ENV,
    'data-dev-branch': execSync('git branch --show-current').toString().trim()
  })
});
```

**📚 [View 50+ More Examples in EXAMPLES.md](./EXAMPLES.md)** - Including E2E testing, debug overlays, monorepo setups, feature flags, and more!

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

**Performance optimizations:**

- Efficient AST traversal with caching
- Minimal HMR impact
- Automatically skips `node_modules`
- Only runs during development

### Troubleshooting

**⚠️ Line numbers are wrong/offset by ~19?**

1. **Most common issue**: Plugin order is wrong
2. **Fix**: Move `componentDebugger()` BEFORE `react()` in Vite config
3. **Cause**: React plugin adds ~19 lines of imports/HMR setup

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

**Elements not being tagged?**

1. Check file extension is in `extensions`
2. Verify element isn't in exclusion lists
3. Ensure plugin is enabled
4. Verify plugin order (componentDebugger before react)

**Build performance issues?**

1. Limit `extensions` scope
2. Add more elements to `excludeElements`
3. Keep `includeProps`/`includeContent` disabled (default) for better performance and less noise in the DOM

**Attributes not in production?**

```typescript
componentDebugger({
  enabled: process.env.NODE_ENV !== "production",
});
```

**Debug line number issues:**

```typescript
componentDebugger({
  debug: true, // Shows processed code and line numbers
  enabled: true,
});
```

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

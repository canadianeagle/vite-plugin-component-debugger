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

A Vite plugin that automatically adds data attributes to JSX/TSX elements during development, making it easier to track, debug, and understand component rendering in your React applications. **Perfect for AI-generated code** and debugging "which component rendered this?" 🤔

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

**After (Basic - Default):**

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

**After (With Metadata Enabled):**

```jsx
componentDebugger({
  includeProps: true,
  includeContent: true
})

// Results in:
<button
  data-dev-id="src/components/Button.tsx:10:2"
  data-dev-name="button"
  data-dev-path="src/components/Button.tsx"
  data-dev-line="10"
  data-dev-file="Button.tsx"
  data-dev-component="button"
  data-dev-metadata="%7B%22className%22%3A%22btn-primary%22%2C%22text%22%3A%22Click%20me%22%7D"
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

### Advanced Configuration

```typescript
componentDebugger({
  // Core settings
  enabled: process.env.NODE_ENV === "development",
  attributePrefix: "data-dev",
  extensions: [".jsx", ".tsx"],

  // Content capture (disabled by default for performance)
  includeProps: true, // Enable to capture component props in data-dev-metadata
  includeContent: true, // Enable to capture text content in data-dev-metadata

  // Attribute filtering (control which data attributes are generated)
  includeAttributes: ["id", "name", "line"], // Only include these attributes
  // OR
  excludeAttributes: ["metadata", "file"], // Exclude these attributes

  // Element exclusions
  excludeElements: ["Fragment", "React.Fragment"],
  customExcludes: new Set(["mesh", "group", "camera"]), // Three.js elements
});
```

### All Configuration Options

| Option               | Type                | Default                          | Description                                              |
| -------------------- | ------------------- | -------------------------------- | -------------------------------------------------------- |
| `enabled`            | `boolean`           | `true`                           | Enable/disable the plugin                                |
| `attributePrefix`    | `string`            | `'data-dev'`                     | Prefix for data attributes                               |
| `extensions`         | `string[]`          | `['.jsx', '.tsx']`               | File extensions to process                               |
| `includeProps`       | `boolean`           | `false`                          | Include component props in metadata                      |
| `includeContent`     | `boolean`           | `false`                          | Include text content in metadata                         |
| `includeAttributes`  | `AttributeName[]`   | `undefined`                      | Allowlist: only include these attributes (takes priority)|
| `excludeAttributes`  | `AttributeName[]`   | `undefined`                      | Disallowlist: exclude these attributes                   |
| `excludeElements`    | `string[]`          | `['Fragment', 'React.Fragment']` | Elements to exclude                                      |
| `customExcludes`     | `Set<string>`       | Three.js elements                | Custom elements to exclude                               |

**Available attribute names:** `'id'`, `'name'`, `'path'`, `'line'`, `'file'`, `'component'`, `'metadata'`

### Attribute Filtering Examples

**Minimal setup (only include ID):**
```typescript
componentDebugger({
  includeAttributes: ["id"], // Only generates data-dev-id
});
// Result: <button data-dev-id="src/Button.tsx:10:2">Click me</button>
```

**Exclude clutter (remove verbose attributes):**
```typescript
componentDebugger({
  excludeAttributes: ["metadata", "file", "component"], // Exclude these
});
// Result: <button data-dev-id="..." data-dev-name="button" data-dev-path="..." data-dev-line="10">
```

**Testing setup (only what you need):**
```typescript
componentDebugger({
  includeAttributes: ["id", "name", "component"], // Minimal for testing
});
```

> **Note:** When both `includeAttributes` and `excludeAttributes` are specified, `includeAttributes` takes priority.

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

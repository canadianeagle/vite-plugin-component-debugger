# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Highly customizable** Vite plugin that automatically adds data attributes to JSX/TSX elements during development for component debugging and tracking. Features path filtering, attribute transformers, presets, conditional tagging, and more.

**Current Version:** v2.0.0 (major feature release)

## Build System & Commands

### Package Manager
- Use `pnpm` for all operations (not npm or yarn)

### Development Commands
- `pnpm run build` - Build plugin using tsup
- `pnpm run dev` - Build in watch mode
- `pnpm run test` - Run tests with vitest (exits automatically)
- `pnpm run test:coverage` - Run tests with coverage (exits automatically)
- `pnpm run lint` - Lint TypeScript files
- `pnpm run check` - Full validation (lint + test + build)
- `pnpm run pre-publish` - Pre-publish validation script

### Auto-Release System
- **Every commit to `main` triggers automatic release**
- Version bumping based on commit message:
  - `BREAKING CHANGE:` or `major:` → Major version (1.0.0 → 2.0.0)
  - `feat:` or `feature:` or `minor:` → Minor version (1.0.0 → 1.1.0)
  - All other commits → Patch version (1.0.0 → 1.0.1)
- Automatically: runs tests, builds, creates GitHub release, publishes to npm
- Skip releases: Add `[skip ci]` to commit message

**Example commit messages:**
- `feat: add Vue.js support` → Minor version bump
- `fix: handle JSX fragments better` → Patch version bump
- `BREAKING CHANGE: drop Node 14` → Major version bump
- `docs: improve README [skip ci]` → No release

**Setup auto-publishing:**
1. `npm token create --type=automation`
2. Add `NPM_TOKEN` secret to GitHub repo settings
3. Commit to `main` to trigger first release

See `.github/COMMIT_CONVENTION.md` for detailed examples

## Requirements

**Node.js:** >= 18.12.0 (required for pnpm compatibility)
**pnpm:** >= 9.x (set in workflows)

Version files: `.nvmrc`, `.node-version` specify Node 18.12.0

## Core Architecture

### Files (Modularized in v2.2.0)
- `src/index.ts` - Main entry point and type exports
- `src/plugin.ts` - Core Vite plugin implementation (~200 lines)
- `src/types.ts` - All TypeScript type definitions
- `src/constants.ts` - Three.js elements and presets
- `src/utils.ts` - Preset application, base64 encoding, path sanitization
- `src/helpers/path-matching.ts` - Pre-compiled glob pattern matching (5-10x faster)
- `src/helpers/attribute-generator.ts` - Attribute generation pipeline
- `src/helpers/ast-walker.ts` - AST traversal and element tagging
- `tsup.config.ts` - Build configuration

### How It Works
1. Intercepts Vite's transform hook for `.jsx`/`.tsx` files
2. Pre-compiled glob patterns filter files (5-10x faster than runtime matching)
3. Parses with Babel parser → walks AST with estree-walker
4. Adds data attributes using magic-string (optimized single-pass JSON.stringify)
5. Preserves source maps and build performance

### Key Dependencies
- `@babel/parser` - JSX/TSX parsing
- `estree-walker` - AST traversal
- `magic-string` - Code modification
- `minimatch` - Glob pattern matching for path filtering (v2)
- `vite` - Peer dependency

## Critical Setup Requirements

### Plugin Order in Vite Config
**CRITICAL**: The componentDebugger plugin MUST be placed BEFORE the React plugin:

```typescript
// ✅ CORRECT - Plugin processes original source code
export default defineConfig({
  plugins: [
    componentDebugger({
      enabled: process.env.NODE_ENV === 'development'
    }),
    react() // React plugin runs after componentDebugger
  ]
})

// ❌ WRONG - Plugin gets transformed code with wrong line numbers
export default defineConfig({
  plugins: [
    react(),           // Adds ~19 lines of imports/HMR setup
    componentDebugger()  // Gets wrong line numbers (+19 offset)
  ]
})
```

**Why this matters**: React plugin injects ~19 lines of imports and HMR code. If componentDebugger runs after React, line numbers will be offset by ~19 lines, causing `data-dev-line` attributes to be incorrect.

## Configuration Options (v2.0)

### Core Options
- `enabled` - Enable/disable (default: `true`)
- `extensions` - File types (default: `['.jsx', '.tsx']`)
- `attributePrefix` - Data attribute prefix (default: `'data-dev'`)
- `preset` - Quick config: `'minimal'`, `'testing'`, `'debugging'`, `'production'` (default: `undefined`)

### Attribute Control (v2)
- `includeAttributes` - **RECOMMENDED** Allowlist of attributes (e.g., `['id', 'name']`) - cleaner DOM, better performance
- `excludeAttributes` - Disallowlist of attributes (e.g., `['metadata', 'file']`)
- `transformers` - Transform any attribute value for privacy/formatting (see below)
- `groupAttributes` - Combine all attributes into single JSON attribute (default: `false`)

**Available attribute names:** `'id'`, `'name'`, `'path'`, `'line'`, `'file'`, `'component'`, `'metadata'`

**Priority:** When both `includeAttributes` and `excludeAttributes` are specified, `includeAttributes` takes priority.

### Path & Element Filtering (v2)
- `includePaths` - Glob patterns for files to include (e.g., `['src/components/**', 'src/features/**']`)
- `excludePaths` - Glob patterns for files to exclude (e.g., `['**/*.test.tsx', '**/*.stories.tsx']`)
- `excludeElements` - Element names to skip (default: `['Fragment', 'React.Fragment']`)
- `customExcludes` - Custom element exclusions as Set (default: Three.js elements)

### Conditional & Custom (v2)
- `shouldTag` - Callback to conditionally tag components: `(info: ComponentInfo) => boolean`
- `customAttributes` - Add custom data attributes: `(info: ComponentInfo) => Record<string, string>`

**ComponentInfo interface:**
```typescript
interface ComponentInfo {
  elementName: string;
  filePath: string;
  line: number;
  column: number;
  props?: Record<string, any>;
  content?: string;
}
```

### Metadata & Encoding (v2)
- `metadataEncoding` - Encoding format: `'json'` (default), `'base64'`, or `'none'`
- `includeProps` - **LEGACY** Capture props in metadata (default: `false`) - use `includeAttributes` instead
- `includeContent` - **LEGACY** Capture content in metadata (default: `false`) - use `includeAttributes` instead

### Depth Control (v2)
- `maxDepth` - Maximum nesting depth to tag (e.g., `3` = only tag up to 3 levels deep)
- `minDepth` - Minimum nesting depth to tag
- `tagOnlyRoots` - Only tag root-level elements (default: `false`)

### Statistics & Callbacks (v2)
- `onTransform` - Callback after each file: `(stats: TransformStats) => void`
- `onComplete` - Callback after all files: `(stats: CompletionStats) => void`
- `exportStats` - File path to export statistics JSON (e.g., `'build-stats.json'`)

### Advanced (v2)
- `includeSourceMapHints` - Add source map comments for debugging (default: `false`)
- `debug` - Enable debug logging (default: `false`)

## V2 Features in Detail

### Presets
Quick configurations for common use cases:
- `minimal` - Only ID attribute (smallest footprint)
- `testing` - ID, name, component (perfect for E2E tests)
- `debugging` - Everything + props + content (full visibility)
- `production` - Privacy-focused with shortened paths

### Attribute Transformers
Customize any attribute value for privacy, formatting, or anonymization:
```typescript
transformers: {
  path: (p) => p.split('/').slice(-2).join('/'),  // Shorten paths
  id: (id) => id.split(':').slice(-2).join(':'),   // Remove path from ID
  name: (name) => name.toUpperCase(),               // Custom formatting
  line: (line) => `L${line}`,                       // Add prefix
  file: (file) => 'REDACTED',                       // Anonymize
  component: (comp) => `<${comp}>`                  // Custom format
}
```

### Path Filtering
Use glob patterns with minimatch to include/exclude specific files:
```typescript
includePaths: ['src/components/**', 'src/features/**'],
excludePaths: ['**/*.test.tsx', '**/*.stories.tsx', '**/__tests__/**']
```

### Conditional Tagging
Tag only specific components using `shouldTag` callback:
```typescript
shouldTag: ({ elementName, filePath, props }) => {
  // Only tag custom components (uppercase)
  if (elementName[0] === elementName[0].toUpperCase()) return true;

  // Only tag components with data-testid
  if (props && 'data-testid' in props) return true;

  // Only tag components in features directory
  if (filePath.includes('features/')) return true;

  return false;
}
```

### Custom Attributes
Add your own data attributes dynamically:
```typescript
customAttributes: ({ elementName, filePath }) => ({
  'data-dev-env': process.env.NODE_ENV,
  'data-dev-branch': execSync('git branch --show-current').toString().trim(),
  'data-dev-category': filePath.includes('features/') ? 'feature' : 'component'
})
```

## Architecture Notes (v2)

### Depth Tracking
- Uses `depthStack` array to track JSX nesting during AST traversal
- Increments on `enter` for JSX opening elements, decrements on `leave`
- Enables `maxDepth`, `minDepth`, and `tagOnlyRoots` filtering

### Attribute Generation Pipeline
1. Collect base attributes (id, name, path, line, file, component)
2. Apply `includeAttributes`/`excludeAttributes` filtering
3. Apply `transformers` to selected attributes
4. Optionally group into single JSON attribute with `groupAttributes`
5. Add custom attributes from `customAttributes` callback
6. Serialize and inject into code with magic-string

### Statistics Collection
- Tracks files processed, elements tagged, and breakdown by element type
- Callbacks fired at transform (per-file) and buildEnd (completion)
- Optional JSON export with `exportStats`

### Performance Optimizations (v2.2.0)
- **#1: Single JSON.stringify for metadata** - Reuses serialization result instead of calling 3 times (2-3x faster metadata encoding)
- **#2: Pre-compiled glob patterns** - Compiles minimatch patterns once at init instead of every file check (5-10x faster path matching)
- **#3: Single string split for debug logging** - Splits code once and reuses for first/last line display (2x faster debug mode)
- All v2 features are opt-in with `undefined` defaults for backwards compatibility
- Attribute filtering reduces DOM size
- `includeAttributes` recommended over legacy `includeProps`/`includeContent`
- **Overall improvement**: 15-30% faster for typical use cases (save 200-500ms on 100-file projects, 2-5s on 1000-file projects)

## Development Workflow

1. Make changes in `src/`
2. Run: `pnpm run check` (lint + test + build)
3. Commit with semantic message for auto-release

## Build Output

- Dual ESM/CJS builds via tsup
- TypeScript declarations included
- Source maps for debugging
- Output: `dist/`

## Troubleshooting

### Line Numbers Are Wrong/Offset
**Symptoms**: `data-dev-line` attributes show line numbers ~19 higher than expected
**Cause**: Plugin is running after React plugin
**Solution**: Move `componentDebugger()` BEFORE `react()` in Vite config

### Plugin Not Working
**Check**:
1. Plugin order (componentDebugger before react)
2. File extensions match (default: `.jsx`, `.tsx`)
3. Plugin is enabled (`enabled: true`)
4. File is not in `node_modules`

### Debug Line Number Issues
Enable debug logging:
```typescript
componentDebugger({
  debug: true, // Shows processed code and line numbers
  enabled: true
})
```

### Testing Line Number Accuracy
Use Playwright or similar to verify DOM `data-dev-line` attributes match source:
```typescript
// Test that div on source line 9 has data-dev-line="9"
const element = page.getByTestId('my-div');
const lineNumber = await element.getAttribute('data-dev-line');
expect(lineNumber).toBe('9');
```
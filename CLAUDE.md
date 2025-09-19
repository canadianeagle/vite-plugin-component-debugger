# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vite plugin that automatically adds data attributes to JSX/TSX elements during development for component debugging and tracking.

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

### Files
- `src/index.ts` - Main entry point
- `src/plugin.ts` - Core Vite plugin implementation
- `src/utils/component-debugger.ts` - Component analysis utilities
- `tsup.config.ts` - Build configuration

### How It Works
1. Intercepts Vite's transform hook for `.jsx`/`.tsx` files
2. Parses with Babel parser → walks AST with estree-walker
3. Adds data attributes using magic-string
4. Preserves source maps and build performance

### Key Dependencies
- `@babel/parser` - JSX/TSX parsing
- `estree-walker` - AST traversal
- `magic-string` - Code modification
- `vite` - Peer dependency

## Critical Setup Requirements

### Plugin Order in Vite Config
**CRITICAL**: The componentTagger plugin MUST be placed BEFORE the React plugin:

```typescript
// ✅ CORRECT - Plugin processes original source code
export default defineConfig({
  plugins: [
    componentTagger({
      enabled: process.env.NODE_ENV === 'development'
    }),
    react() // React plugin runs after componentTagger
  ]
})

// ❌ WRONG - Plugin gets transformed code with wrong line numbers
export default defineConfig({
  plugins: [
    react(),           // Adds ~19 lines of imports/HMR setup
    componentTagger()  // Gets wrong line numbers (+19 offset)
  ]
})
```

**Why this matters**: React plugin injects ~19 lines of imports and HMR code. If componentTagger runs after React, line numbers will be offset by ~19 lines, causing `data-dev-line` attributes to be incorrect.

## Configuration Options

Main `TagOptions` interface:
- `enabled` - Enable/disable (tied to NODE_ENV)
- `extensions` - File types (default: `.jsx`, `.tsx`)
- `attributePrefix` - Data attribute prefix (default: `data-dev`)
- `excludeElements` - Elements to skip
- `includeProps` - Capture component props
- `includeContent` - Include text content
- `customExcludes` - Custom element exclusions
- `debug` - Enable debug logging for troubleshooting

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
**Solution**: Move `componentTagger()` BEFORE `react()` in Vite config

### Plugin Not Working
**Check**:
1. Plugin order (componentTagger before react)
2. File extensions match (default: `.jsx`, `.tsx`)
3. Plugin is enabled (`enabled: true`)
4. File is not in `node_modules`

### Debug Line Number Issues
Enable debug logging:
```typescript
componentTagger({
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
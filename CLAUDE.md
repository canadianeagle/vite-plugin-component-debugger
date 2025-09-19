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

## Configuration Options

Main `TagOptions` interface:
- `enabled` - Enable/disable (tied to NODE_ENV)
- `extensions` - File types (default: `.jsx`, `.tsx`)
- `attributePrefix` - Data attribute prefix (default: `data-dev`)
- `excludeElements` - Elements to skip
- `includeProps` - Capture component props
- `includeContent` - Include text content
- `customExcludes` - Custom element exclusions

## Development Workflow

1. Make changes in `src/`
2. Run: `pnpm run check` (lint + test + build)
3. Commit with semantic message for auto-release

## Build Output

- Dual ESM/CJS builds via tsup
- TypeScript declarations included
- Source maps for debugging
- Output: `dist/`
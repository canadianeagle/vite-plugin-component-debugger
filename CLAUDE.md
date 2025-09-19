# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Vite plugin that automatically adds data attributes to JSX/TSX elements during development for component debugging and tracking. The plugin transforms React components by adding metadata attributes that help developers identify component locations, props, and content.

## Build System & Commands

### Package Manager
- Use `pnpm` for all package operations (not npm or yarn)
- Install dependencies: `pnpm install`

### Development Commands
- `pnpm run build` - Build the plugin using tsup
- `pnpm run dev` - Build in watch mode during development
- `pnpm run test` - Run tests with vitest
- `pnpm run test:coverage` - Run tests with coverage reporting
- `pnpm run lint` - Lint TypeScript files with eslint
- `pnpm run check` - Run full validation (lint + test + build)
- `pnpm run clean` - Remove dist and node_modules directories

### Publishing
- `pnpm run pre-publish` - Run pre-publish validation script
- `pnpm run prepublishOnly` - Automatically runs build before publishing

## Architecture

### Core Files Structure
- `src/index.ts` - Main entry point, exports the plugin and types
- `src/plugin.ts` - Core plugin implementation with Vite integration
- `src/utils/component-debugger.ts` - Utility functions for component analysis
- `tsup-config.ts` - Build configuration for dual ESM/CJS output

### Plugin Architecture
The plugin works by:
1. Intercepting Vite's transform hook for `.jsx`/`.tsx` files
2. Parsing JSX/TSX using Babel parser
3. Walking the AST with estree-walker to find JSX elements
4. Adding data attributes using magic-string for efficient code modification
5. Preserving source maps and maintaining build performance

### Key Dependencies
- `@babel/parser` - Parse JSX/TSX files into AST
- `estree-walker` - Traverse AST nodes efficiently
- `magic-string` - Modify source code while preserving source maps
- `vite` - Peer dependency for plugin integration

## Configuration Options

The plugin accepts a `TagOptions` interface with these key options:
- `enabled` - Enable/disable plugin (typically tied to NODE_ENV)
- `extensions` - File extensions to process (default: `.jsx`, `.tsx`)
- `attributePrefix` - Prefix for data attributes (default: `data-dev`)
- `excludeElements` - Elements to skip tagging (default: Fragment types)
- `includeProps` - Include component props in metadata
- `includeContent` - Include text content in metadata
- `customExcludes` - Set of custom elements to exclude (Three.js elements by default)

## Testing

- Tests are located in `src/__tests__/` (if present)
- Uses Vitest as the test runner
- Run tests before making changes: `pnpm run test`
- Generate coverage reports: `pnpm run test:coverage`

## Development Workflow

1. Make changes to source files in `src/`
2. Test changes: `pnpm run test`
3. Lint code: `pnpm run lint`
4. Build and verify: `pnpm run build`
5. Run full check: `pnpm run check`

## Build Output

- Generates both CommonJS and ESM builds via tsup
- TypeScript declarations included
- Source maps generated for debugging
- Output directory: `dist/`

## Important Notes

- Plugin only processes JSX/TSX files by default
- Automatically excludes Three.js/React Three Fiber elements
- Designed for development environment usage
- Minimal performance impact due to efficient AST processing
- Supports Vite HMR (Hot Module Replacement)
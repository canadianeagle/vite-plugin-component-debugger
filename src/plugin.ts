// src/plugin.ts
// Main plugin entry point - now modularized for better maintainability
// 🚀 Includes 3 performance optimizations:
// #1: Single JSON.stringify for metadata (was 3 calls)
// #2: Pre-compiled regex patterns for path matching (5-10x faster)
// #3: Single string split for debug logging (was 2 splits)

import type { Plugin } from 'vite';
import { parse } from '@babel/parser';
import MagicString from 'magic-string';
import path from 'path';
import { writeFileSync } from 'fs';

// Type imports
import type { TagOptions, CompletionStats, TransformStats } from './types';

// Constant imports
import { DEFAULT_THREE_FIBER_ELEMENTS } from './constants';

// Utility imports
import { applyPreset, sanitizeExportPath } from './utils';

// Helper imports
import { compilePatterns, matchesCompiledPatterns } from './helpers/path-matching';
import { collectImports, tagElements, logDebugInfo } from './helpers/ast-walker';

/**
 * Vite plugin that adds data attributes to JSX/TSX elements for debugging
 *
 * @param options - Configuration options
 * @returns Vite plugin
 */
export function componentDebugger(options: TagOptions = {}): Plugin {
  // Apply preset configuration first
  const resolvedOptions = applyPreset(options);

  const {
    extensions = ['.jsx', '.tsx'],
    attributePrefix = 'data-dev',
    excludeElements = ['Fragment', 'React.Fragment'],
    includeProps = false,
    includeContent = false,
    customExcludes = DEFAULT_THREE_FIBER_ELEMENTS,
    enabled = true,
    debug = false,
    includeAttributes,
    excludeAttributes,
    // V2 options
    includePaths,
    excludePaths,
    transformers,
    shouldTag,
    customAttributes,
    metadataEncoding = 'json',
    maxDepth: initialMaxDepth = 0,
    minDepth: initialMinDepth = 0,
    tagOnlyRoots = false,
    onTransform,
    onComplete,
    exportStats,
    includeSourceMapHints = false,
    groupAttributes = false
  } = resolvedOptions;

  const projectRoot = process.cwd();
  const stats: CompletionStats = {
    totalFiles: 0,
    processedFiles: 0,
    totalElements: 0,
    errors: 0,
    byElementType: {}
  };

  // Security: Validate depth values (mutable copies)
  let maxDepth = initialMaxDepth;
  let minDepth = initialMinDepth;
  const MAX_DEPTH_LIMIT = 50;

  if (maxDepth && (maxDepth < 0 || maxDepth > MAX_DEPTH_LIMIT)) {
    console.warn(`⚠️  maxDepth must be between 0 and ${MAX_DEPTH_LIMIT}, using default`);
    maxDepth = 0;
  }
  if (minDepth && minDepth < 0) {
    console.warn(`⚠️  minDepth cannot be negative, using 0`);
    minDepth = 0;
  }
  if (minDepth && maxDepth && minDepth > maxDepth) {
    console.warn(
      `⚠️  minDepth (${minDepth}) cannot be greater than maxDepth (${maxDepth}), swapping values`
    );
    [minDepth, maxDepth] = [maxDepth, minDepth];
  }

  // 🚀 OPTIMIZATION #2: Pre-compile glob patterns for fast repeated matching
  const compiledIncludes = compilePatterns(includePaths);
  const compiledExcludes = compilePatterns(excludePaths);

  return {
    name: 'vite-plugin-component-debugger',
    enforce: 'pre',

    async transform(code: string, id: string) {
      // Skip if disabled
      if (!enabled) return null;

      // Check if file should be processed
      const ext = path.extname(id);
      if (!extensions.includes(ext) || id.includes('node_modules')) {
        return null;
      }

      stats.totalFiles++;
      const relativePath = path.relative(projectRoot, id);
      const filename = path.basename(id);

      // 🚀 OPTIMIZATION #2: Use pre-compiled patterns (5-10x faster)
      if (compiledIncludes.length > 0 && !matchesCompiledPatterns(relativePath, compiledIncludes)) {
        return null;
      }

      if (compiledExcludes.length > 0 && matchesCompiledPatterns(relativePath, compiledExcludes)) {
        return null;
      }

      try {
        // 🚀 OPTIMIZATION #3: Single string split for debug logging
        if (debug) {
          logDebugInfo(code, relativePath);
        }

        // Parse the code
        const ast = parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'decorators']
        });

        const magicString = new MagicString(code);

        // First pass: collect imports
        const { importedFromDrei, namespaceImports } = collectImports(ast);

        // Second pass: tag JSX elements
        const elementCount = tagElements({
          ast,
          code,
          magicString,
          relativePath,
          filename,
          excludeElements,
          customExcludes,
          importedFromDrei,
          namespaceImports,
          tagOnlyRoots,
          minDepth,
          maxDepth,
          includeProps,
          includeContent,
          shouldTag,
          attributePrefix,
          includeAttributes,
          excludeAttributes,
          transformers,
          customAttributes,
          metadataEncoding,
          includeSourceMapHints,
          groupAttributes,
          debug,
          stats: stats as any  // CompletionStats is compatible - has byElementType
        });

        stats.processedFiles++;
        stats.totalElements += elementCount;

        // V2: Call onTransform callback
        if (onTransform && elementCount > 0) {
          try {
            const transformStats: TransformStats = {
              file: relativePath,
              elementsTagged: elementCount,
              elementNames: Object.keys(stats.byElementType)
            };
            onTransform(transformStats);
          } catch (error) {
            console.error(`⚠️  Error in onTransform callback for ${relativePath}:`, error);
          }
        }

        if (elementCount === 0) {
          return null;
        }

        return {
          code: magicString.toString(),
          map: magicString.generateMap({ hires: true })
        };
      } catch (error) {
        stats.errors++;
        if (debug) {
          console.error(`⚠️  Error processing ${relativePath}:`, error);
        }
        return null;
      }
    },

    buildEnd() {
      if (enabled && (stats.totalFiles > 0 || stats.totalElements > 0)) {
        console.log('\n📊 Component Debugger Statistics:');
        console.log(`   Total files scanned: ${stats.totalFiles}`);
        console.log(`   Files processed: ${stats.processedFiles}`);
        console.log(`   Elements tagged: ${stats.totalElements}`);
        if (stats.errors > 0) {
          console.log(`   ⚠️  Errors: ${stats.errors}`);
        }

        // V2: Call onComplete callback
        if (onComplete) {
          try {
            onComplete(stats);
          } catch (error) {
            console.error(`⚠️  Error in onComplete callback:`, error);
          }
        }

        // V2: Export stats to file
        if (exportStats) {
          try {
            const sanitizedPath = sanitizeExportPath(exportStats, projectRoot);
            if (sanitizedPath) {
              writeFileSync(sanitizedPath, JSON.stringify(stats, null, 2));
              console.log(`   📄 Stats exported to: ${exportStats}`);
            }
          } catch (error) {
            console.error(`   ⚠️  Failed to export stats: ${error}`);
          }
        }
      }
    }
  };
}

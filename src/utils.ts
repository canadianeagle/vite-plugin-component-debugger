// src/utils.ts
// Utility functions for vite-plugin-component-debugger

import type { Preset, TagOptions } from './types';
import { PRESETS } from './constants';

/**
 * Apply preset configuration to user options
 */
export function applyPreset(options: TagOptions): TagOptions {
  if (!options.preset) return options;

  const preset = PRESETS[options.preset];
  if (!preset) {
    console.warn(`⚠️  Unknown preset: ${options.preset}, using default configuration`);
    return options;
  }

  // Preset values as defaults, but explicit options override them
  return {
    ...preset,
    ...options,
    // Merge transformers if either exists, safely spread only defined objects
    transformers: (preset?.transformers || options.transformers)
      ? { ...(preset?.transformers ?? {}), ...(options.transformers ?? {}) }
      : undefined
  };
}

/**
 * Encode string to base64
 */
export function encodeBase64(str: string): string {
  return Buffer.from(str).toString('base64');
}

/**
 * Validate and sanitize exportStats path to prevent path traversal attacks
 */
export function sanitizeExportPath(statsPath: string, projectRoot: string): string | null {
  const path = require('path');

  // Security: Prevent path traversal
  if (statsPath.includes('..')) {
    console.error('⚠️  exportStats path cannot contain ".." (path traversal attempt)');
    return null;
  }

  // Security: Prevent absolute paths outside project
  if (path.isAbsolute(statsPath) && !statsPath.startsWith(projectRoot)) {
    console.error('⚠️  exportStats path must be relative or within project root');
    return null;
  }

  // Convert to absolute path relative to project root
  const absolutePath = path.isAbsolute(statsPath) ? statsPath : path.resolve(projectRoot, statsPath);

  // Double-check it's within project root
  if (!absolutePath.startsWith(projectRoot)) {
    console.error('⚠️  exportStats path resolved outside project root');
    return null;
  }

  return absolutePath;
}

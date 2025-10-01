// src/types.ts
// Type definitions for vite-plugin-component-debugger

export type AttributeName = 'id' | 'name' | 'path' | 'line' | 'file' | 'component' | 'metadata';
export type MetadataEncoding = 'json' | 'base64' | 'none';
export type Preset = 'minimal' | 'testing' | 'debugging' | 'production';

export interface ComponentInfo {
  elementName: string;
  filePath: string;
  line: number;
  column: number;
  props?: Record<string, any>;
  content?: string;
}

export interface TransformStats {
  file: string;
  elementsTagged: number;
  elementNames: string[];
}

export interface CompletionStats {
  totalFiles: number;
  processedFiles: number;
  totalElements: number;
  errors: number;
  byElementType: Record<string, number>;
}

export interface AttributeTransformers {
  path?: (path: string) => string;
  id?: (id: string) => string;
  name?: (name: string) => string;
  line?: (line: number) => string;
  file?: (file: string) => string;
  component?: (component: string) => string;
}

export interface TagOptions {
  /**
   * File extensions to process
   * @default ['.jsx', '.tsx']
   */
  extensions?: string[];

  /**
   * Prefix for data attributes
   * @default 'data-dev'
   */
  attributePrefix?: string;

  /**
   * Elements to exclude from tagging
   * @default ['Fragment', 'React.Fragment']
   */
  excludeElements?: string[];

  /**
   * Whether to include component props in the data
   * @default false
   */
  includeProps?: boolean;

  /**
   * Whether to include text content
   * @default false
   */
  includeContent?: boolean;

  /**
   * Custom elements to skip (like Three.js elements)
   * @default Set of Three.js elements
   */
  customExcludes?: Set<string>;

  /**
   * Enable/disable the plugin
   * @default true
   */
  enabled?: boolean;

  /**
   * Enable debug logging for troubleshooting
   * @default false
   */
  debug?: boolean;

  /**
   * Allowlist of attributes to include (if specified, only these attributes will be added)
   * Valid values: 'id', 'name', 'path', 'line', 'file', 'component', 'metadata'
   * Takes precedence over excludeAttributes if both are specified
   * @default undefined (all attributes included)
   */
  includeAttributes?: AttributeName[];

  /**
   * Disallowlist of attributes to exclude (these attributes will not be added)
   * Valid values: 'id', 'name', 'path', 'line', 'file', 'component', 'metadata'
   * Ignored if includeAttributes is specified
   * @default undefined (no attributes excluded)
   */
  excludeAttributes?: AttributeName[];

  // ===== V2 Features =====

  /**
   * Paths to include (allowlist). Supports glob patterns.
   * Only files matching these patterns will be processed.
   * @default undefined (all files processed)
   */
  includePaths?: string[];

  /**
   * Paths to exclude (disallowlist). Supports glob patterns.
   * Files matching these patterns will be skipped.
   * @default undefined (no files excluded)
   */
  excludePaths?: string[];

  /**
   * Transform attribute values before adding them to elements
   * @default undefined (no transformation)
   */
  transformers?: AttributeTransformers;

  /**
   * Conditionally determine whether to tag an element
   * @default undefined (all elements tagged)
   */
  shouldTag?: (info: ComponentInfo) => boolean;

  /**
   * Add custom attributes to elements
   * @default undefined (no custom attributes)
   */
  customAttributes?: (info: ComponentInfo) => Record<string, string>;

  /**
   * How to encode metadata attribute
   * @default 'json' (URL-encoded JSON)
   */
  metadataEncoding?: MetadataEncoding;

  /**
   * Maximum nesting depth to tag (0 = unlimited)
   * @default 0 (unlimited)
   */
  maxDepth?: number;

  /**
   * Minimum nesting depth to start tagging
   * @default 0 (tag from root)
   */
  minDepth?: number;

  /**
   * Only tag root-level components in each file
   * @default false
   */
  tagOnlyRoots?: boolean;

  /**
   * Callback fired after transforming each file
   * @default undefined
   */
  onTransform?: (stats: TransformStats) => void;

  /**
   * Callback fired after all transformations complete
   * @default undefined
   */
  onComplete?: (stats: CompletionStats) => void;

  /**
   * Export statistics to a JSON file
   * @default undefined
   */
  exportStats?: string;

  /**
   * Use a preset configuration
   * Presets: 'minimal', 'testing', 'debugging', 'production'
   * @default undefined
   */
  preset?: Preset;

  /**
   * Include source map hints for DevTools integration
   * @default false
   */
  includeSourceMapHints?: boolean;

  /**
   * Group all attributes into a single JSON object
   * @default false
   */
  groupAttributes?: boolean;
}

/**
 * Internal component info used during AST traversal
 * @internal
 */
export interface InternalComponentInfo {
  path: string;
  line: number;
  column: number;
  file: string;
  name: string;
  props?: Record<string, any>;
  content?: string;
  depth?: number;
}

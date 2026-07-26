// src/index.ts
// The plugin is available both as the default export and as a named export.
export { componentDebugger, componentDebugger as default } from './plugin';
export type {
  TagOptions,
  AttributeName,
  MetadataEncoding,
  Preset,
  ComponentInfo,
  TransformStats,
  CompletionStats,
  AttributeTransformers
} from './types';


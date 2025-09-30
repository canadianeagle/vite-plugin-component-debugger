// src/plugin.ts
import type { Plugin } from 'vite';
import { parse } from '@babel/parser';
import MagicString from 'magic-string';
import path from 'path';
import { walk } from 'estree-walker';
import { minimatch } from 'minimatch';
import { writeFileSync } from 'fs';

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

interface InternalComponentInfo {
  path: string;
  line: number;
  column: number;
  file: string;
  name: string;
  props?: Record<string, any>;
  content?: string;
  depth?: number;
}

// Default Three.js/React Three Fiber elements to exclude
const DEFAULT_THREE_FIBER_ELEMENTS = new Set([
  // Core objects
  'mesh', 'group', 'scene', 'primitive', 'object3D',
  'batchedMesh', 'instancedMesh', 'sprite', 'points', 'lineSegments',
  'lineLoop', 'lOD', 'skinnedMesh', 'skeleton', 'bone',
  
  // Cameras
  'perspectiveCamera', 'orthographicCamera', 'camera',
  'cubeCamera', 'arrayCamera',
  
  // Lights
  'ambientLight', 'directionalLight', 'pointLight', 'spotLight', 
  'hemisphereLight', 'rectAreaLight', 'lightProbe',
  'ambientLightProbe', 'hemisphereLightProbe',
  'spotLightShadow', 'directionalLightShadow', 'lightShadow',
  
  // Geometries
  'boxGeometry', 'sphereGeometry', 'planeGeometry', 'cylinderGeometry',
  'coneGeometry', 'circleGeometry', 'ringGeometry', 'torusGeometry',
  'torusKnotGeometry', 'dodecahedronGeometry', 'icosahedronGeometry',
  'octahedronGeometry', 'tetrahedronGeometry', 'polyhedronGeometry',
  'tubeGeometry', 'shapeGeometry', 'extrudeGeometry', 'latheGeometry',
  'edgesGeometry', 'wireframeGeometry', 'capsuleGeometry',
  
  // Buffer geometries
  'bufferGeometry', 'instancedBufferGeometry',
  'boxBufferGeometry', 'circleBufferGeometry', 'coneBufferGeometry',
  'cylinderBufferGeometry', 'dodecahedronBufferGeometry',
  'extrudeBufferGeometry', 'icosahedronBufferGeometry',
  'latheBufferGeometry', 'octahedronBufferGeometry',
  'planeBufferGeometry', 'polyhedronBufferGeometry',
  'ringBufferGeometry', 'shapeBufferGeometry',
  'sphereBufferGeometry', 'tetrahedronBufferGeometry',
  'torusBufferGeometry', 'torusKnotBufferGeometry',
  'tubeBufferGeometry',
  
  // Materials
  'meshBasicMaterial', 'meshStandardMaterial', 'meshPhysicalMaterial',
  'meshPhongMaterial', 'meshToonMaterial', 'meshNormalMaterial',
  'meshLambertMaterial', 'meshDepthMaterial', 'meshDistanceMaterial',
  'meshMatcapMaterial', 'lineDashedMaterial', 'lineBasicMaterial',
  'material', 'rawShaderMaterial', 'shaderMaterial', 'shadowMaterial',
  'spriteMaterial', 'pointsMaterial',
  
  // Helpers
  'spotLightHelper', 'skeletonHelper', 'pointLightHelper',
  'hemisphereLightHelper', 'gridHelper', 'polarGridHelper',
  'directionalLightHelper', 'cameraHelper', 'boxHelper',
  'box3Helper', 'planeHelper', 'arrowHelper', 'axesHelper',
  
  // Textures
  'texture', 'videoTexture', 'dataTexture', 'dataTexture3D',
  'compressedTexture', 'cubeTexture', 'canvasTexture', 'depthTexture',
  
  // Math
  'vector2', 'vector3', 'vector4', 'euler', 'matrix3', 'matrix4',
  'quaternion', 'color', 'raycaster',
  
  // Attributes
  'bufferAttribute', 'float16BufferAttribute', 'float32BufferAttribute',
  'float64BufferAttribute', 'int8BufferAttribute', 'int16BufferAttribute',
  'int32BufferAttribute', 'uint8BufferAttribute', 'uint16BufferAttribute',
  'uint32BufferAttribute', 'instancedBufferAttribute',
  
  // Other
  'fog', 'fogExp2', 'shape'
]);

// Preset configurations
const PRESETS: Record<Preset, Partial<TagOptions>> = {
  minimal: {
    includeAttributes: ['id'],
    includeProps: false,
    includeContent: false
  },
  testing: {
    includeAttributes: ['id', 'name', 'component'],
    includeProps: false,
    includeContent: false
  },
  debugging: {
    includeProps: true,
    includeContent: true,
    debug: true
  },
  production: {
    includeAttributes: ['id', 'line'],
    transformers: {
      path: (p) => p.split('/').slice(-2).join('/'), // Only last 2 segments
      id: (id) => {
        const parts = id.split(':');
        return parts.length > 2 ? parts.slice(-2).join(':') : id; // Only line:col
      }
    }
  }
};

/**
 * Apply preset configuration
 */
function applyPreset(options: TagOptions): TagOptions {
  if (!options.preset) return options;

  const preset = PRESETS[options.preset];
  // Preset values as defaults, but explicit options override them
  return {
    ...preset,
    ...options,
    // Merge transformers if both exist
    transformers: options.transformers || preset.transformers
      ? { ...preset.transformers, ...options.transformers }
      : undefined
  };
}

/**
 * Check if a file path matches any of the patterns
 */
function matchesPatterns(filePath: string, patterns: string[] | undefined): boolean {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some(pattern => minimatch(filePath, pattern));
}

/**
 * Encode string to base64
 */
function encodeBase64(str: string): string {
  return Buffer.from(str).toString('base64');
}

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
    maxDepth = 0,
    minDepth = 0,
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

  // Security: Validate depth values
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
    console.warn(`⚠️  minDepth (${minDepth}) cannot be greater than maxDepth (${maxDepth}), swapping values`);
    [minDepth, maxDepth] = [maxDepth, minDepth];
  }

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

      // V2: Path filtering
      if (includePaths && !matchesPatterns(relativePath, includePaths)) {
        return null;
      }

      if (excludePaths && matchesPatterns(relativePath, excludePaths)) {
        return null;
      }

      try {
        // Debug: Log the actual code being processed
        if (debug) {
          console.log(`\n🔍 PROCESSING FILE: ${relativePath}`);
          console.log(`📄 CODE LENGTH: ${code.length} characters`);
          console.log(`📄 FIRST 10 LINES:`);
          code.split('\n').slice(0, 10).forEach((line, i) => {
            console.log(`  ${i + 1}: ${line}`);
          });
          console.log(`📄 LAST 5 LINES:`);
          const lines = code.split('\n');
          lines.slice(-5).forEach((line, i) => {
            console.log(`  ${lines.length - 5 + i + 1}: ${line}`);
          });
        }

        // Parse the code
        const ast = parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'decorators']
        });

        const magicString = new MagicString(code);
        let elementCount = 0;

        // Track imported components from specific libraries
        const importedFromDrei = new Set<string>();
        const namespaceImports = new Set<string>();

        // First pass: collect imports
        walk(ast as any, {
          enter(node: any) {
            if (node.type === 'ImportDeclaration') {
              const source = node.source?.value;
              if (typeof source === 'string') {
                // Track React Three Drei imports
                if (source.includes('@react-three/drei') || 
                    source.includes('@react-three/fiber') ||
                    source.includes('three')) {
                  node.specifiers.forEach((spec: any) => {
                    if (spec.type === 'ImportSpecifier') {
                      importedFromDrei.add(spec.local.name);
                    } else if (spec.type === 'ImportNamespaceSpecifier') {
                      namespaceImports.add(spec.local.name);
                    }
                  });
                }
              }
            }
          }
        });

        // Second pass: tag JSX elements
        let currentJSXElement: any = null;
        const depthStack: number[] = []; // Track nesting depth
        let currentDepth = 0;
        const elementNames: string[] = []; // Track for statistics

        walk(ast as any, {
          enter(node: any) {
            if (node.type === 'JSXElement') {
              currentJSXElement = node;
              currentDepth++;
              depthStack.push(currentDepth);
            }

            if (node.type === 'JSXOpeningElement') {
              const openingElement = node;
              let elementName: string;

              // Get element name
              if (openingElement.name.type === 'JSXIdentifier') {
                elementName = openingElement.name.name;
              } else if (openingElement.name.type === 'JSXMemberExpression') {
                const memberExpr = openingElement.name;
                elementName = `${memberExpr.object.name}.${memberExpr.property.name}`;
              } else {
                return;
              }

              // Check if element should be excluded
              if (shouldExcludeElement(elementName, excludeElements, customExcludes, importedFromDrei, namespaceImports)) {
                return;
              }

              // V2: Depth filtering
              const elementDepth = depthStack.length;

              if (tagOnlyRoots && elementDepth > 1) {
                return; // Only tag root-level elements
              }

              if (minDepth > 0 && elementDepth < minDepth) {
                return; // Too shallow
              }

              if (maxDepth > 0 && elementDepth > maxDepth) {
                return; // Too deep
              }

              // Collect component information with validation
              const line = openingElement.loc?.start?.line ?? 1; // Default to line 1, not 0
              const column = openingElement.loc?.start?.column ?? 0;

              // Warn if location info is missing (indicates potential parser issue)
              if (!openingElement.loc?.start) {
                if (debug) {
                  console.warn(`⚠️  Missing location info for element "${elementName}" in ${relativePath}`);
                }
              }

              // Debug logging
              if (debug) {
                console.log(`🏷️  Tagging ${elementName} at line ${line}, column ${column} in ${relativePath}`);
              }

              const info: InternalComponentInfo = {
                path: relativePath,
                line,
                column,
                file: filename,
                name: elementName,
                depth: elementDepth
              };

              // Collect props if enabled
              if (includeProps) {
                const props: Record<string, any> = {};
                openingElement.attributes.forEach((attr: any) => {
                  if (attr.type === 'JSXAttribute') {
                    const propName = attr.name.name;
                    
                    if (attr.value?.type === 'StringLiteral') {
                      props[propName] = attr.value.value;
                    } else if (attr.value?.type === 'JSXExpressionContainer' && 
                              attr.value.expression.type === 'StringLiteral') {
                      props[propName] = attr.value.expression.value;
                    } else if (attr.value === null) {
                      // Boolean true prop
                      props[propName] = true;
                    }
                    // For other types, we could add more handling
                  }
                });

                if (Object.keys(props).length > 0) {
                  info.props = props;
                }
              }

              // Collect text content if enabled
              if (includeContent && currentJSXElement?.children) {
                const textContent = extractTextContent(currentJSXElement.children);
                if (textContent) {
                  info.content = textContent;
                }
              }

              // V2: Call shouldTag callback
              if (shouldTag) {
                try {
                  const componentInfo: ComponentInfo = {
                    elementName,
                    filePath: relativePath,
                    line,
                    column,
                    props: info.props,
                    content: info.content
                  };

                  if (!shouldTag(componentInfo)) {
                    return; // Skip this element
                  }
                } catch (error) {
                  console.error(`⚠️  Error in shouldTag callback for ${elementName} in ${relativePath}:`, error);
                  // Continue processing - don't skip element on error
                }
              }

              // Generate attributes
              const attributes = generateAttributes(
                info,
                attributePrefix,
                includeAttributes,
                excludeAttributes,
                transformers,
                customAttributes,
                metadataEncoding,
                includeSourceMapHints,
                groupAttributes
              );
              
              // Insert attributes into the code
              // We need to find the exact position of the closing bracket
              const elementStart = openingElement.start ?? 0;
              const elementEnd = openingElement.end ?? code.length;
              const elementCode = code.substring(elementStart, elementEnd);
              
              let insertPosition: number;
              
              if (openingElement.selfClosing) {
                // Self-closing element - find the '/>' position
                const selfClosingMatch = elementCode.lastIndexOf('/>');
                if (selfClosingMatch === -1) {
                  // Fallback: this shouldn't happen with valid JSX
                  if (debug) {
                    console.warn(`⚠️  Could not find '/>' in self-closing element "${elementName}" at ${relativePath}:${line}`);
                  }
                  insertPosition = elementEnd - 2;
                } else {
                  insertPosition = elementStart + selfClosingMatch;
                }
              } else {
                // Regular element - find the '>' position
                const closingMatch = elementCode.lastIndexOf('>');
                if (closingMatch === -1) {
                  // Fallback: this shouldn't happen with valid JSX
                  if (debug) {
                    console.warn(`⚠️  Could not find '>' in element "${elementName}" at ${relativePath}:${line}`);
                  }
                  insertPosition = elementEnd - 1;
                } else {
                  insertPosition = elementStart + closingMatch;
                }
              }
              
              magicString.appendLeft(insertPosition, attributes);

              elementCount++;
              elementNames.push(elementName); // Track for statistics

              // Track by element type
              stats.byElementType[elementName] = (stats.byElementType[elementName] || 0) + 1;
            }
          },
          leave(node: any) {
            // Pop depth when leaving JSXElement
            if (node.type === 'JSXElement') {
              depthStack.pop();
              currentDepth--;
            }
          }
        });

        stats.processedFiles++;
        stats.totalElements += elementCount;

        // V2: Call onTransform callback
        if (onTransform && elementCount > 0) {
          onTransform({
            file: relativePath,
            elementsTagged: elementCount,
            elementNames
          });
        }

        if (elementCount > 0) {
          return {
            code: magicString.toString(),
            map: magicString.generateMap({ hires: true })
          };
        }

        return null;
      } catch (error) {
        stats.errors++;
        console.error(`Error processing ${relativePath}:`, error);
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
          onComplete(stats);
        }

        // V2: Export stats to file
        if (exportStats) {
          try {
            const statsPath = path.resolve(projectRoot, exportStats);
            const normalizedStatsPath = path.normalize(statsPath);
            const normalizedRoot = path.normalize(projectRoot);

            // Security: Prevent path traversal attacks
            if (!normalizedStatsPath.startsWith(normalizedRoot)) {
              console.error(`   ⚠️  Security: exportStats path must be within project directory`);
              console.error(`   📁 Project root: ${normalizedRoot}`);
              console.error(`   🚫 Attempted path: ${normalizedStatsPath}`);
            } else {
              writeFileSync(statsPath, JSON.stringify(stats, null, 2));
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

/**
 * Check if an element should be excluded from tagging
 */
function shouldExcludeElement(
  elementName: string,
  excludeElements: string[],
  customExcludes: Set<string>,
  importedFromDrei: Set<string>,
  namespaceImports: Set<string>
): boolean {
  // Check standard excludes
  if (excludeElements.includes(elementName)) {
    return true;
  }

  // Check custom excludes (like Three.js elements)
  if (customExcludes.has(elementName)) {
    return true;
  }

  // Check if imported from drei
  if (importedFromDrei.has(elementName)) {
    return true;
  }

  // Check namespace imports
  if (elementName.includes('.')) {
    const namespace = elementName.split('.')[0];
    if (namespaceImports.has(namespace)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract text content from JSX children
 */
function extractTextContent(children: any[]): string {
  const texts: string[] = [];
  
  for (const child of children) {
    if (child.type === 'JSXText') {
      const text = child.value.trim();
      if (text) texts.push(text);
    } else if (child.type === 'JSXExpressionContainer' && 
              child.expression.type === 'StringLiteral') {
      texts.push(child.expression.value);
    }
    // Could recursively handle nested JSX elements if needed
  }

  return texts.join(' ').trim();
}

/**
 * Generate data attributes for an element
 */
function generateAttributes(
  info: InternalComponentInfo,
  prefix: string,
  includeAttributes?: AttributeName[],
  excludeAttributes?: AttributeName[],
  transformers?: AttributeTransformers,
  customAttributes?: (info: ComponentInfo) => Record<string, string>,
  metadataEncoding: MetadataEncoding = 'json',
  includeSourceMapHints: boolean = false,
  groupAttributes: boolean = false
): string {
  // Determine which attributes should be included
  const shouldInclude = (attrName: AttributeName): boolean => {
    if (includeAttributes !== undefined) {
      return includeAttributes.includes(attrName);
    }
    if (excludeAttributes !== undefined && excludeAttributes.length > 0) {
      return !excludeAttributes.includes(attrName);
    }
    return true;
  };

  const attributeValues: Record<string, string> = {};

  // Unique ID
  if (shouldInclude('id')) {
    let id = `${info.path}:${info.line}:${info.column}`;
    if (transformers?.id) {
      id = transformers.id(id);
    }
    attributeValues['id'] = id;
  }

  // Element name
  if (shouldInclude('name')) {
    let name = info.name;
    if (transformers?.name) {
      name = transformers.name(name);
    }
    attributeValues['name'] = name;
  }

  // Component location info
  if (shouldInclude('path')) {
    let pathValue = info.path;
    if (transformers?.path) {
      pathValue = transformers.path(pathValue);
    }
    attributeValues['path'] = pathValue;
  }

  if (shouldInclude('line')) {
    let line = String(info.line);
    if (transformers?.line) {
      line = transformers.line(info.line);
    }
    attributeValues['line'] = line;
  }

  if (shouldInclude('file')) {
    let file = info.file;
    if (transformers?.file) {
      file = transformers.file(file);
    }
    attributeValues['file'] = file;
  }

  if (shouldInclude('component')) {
    let component = info.name;
    if (transformers?.component) {
      component = transformers.component(component);
    }
    attributeValues['component'] = component;
  }

  // Props and content as JSON
  if (shouldInclude('metadata')) {
    const metadata: any = {};
    if (info.props) {
      Object.assign(metadata, info.props);
    }
    if (info.content) {
      metadata.text = info.content;
    }

    if (Object.keys(metadata).length > 0) {
      // Security: Limit metadata size
      const MAX_METADATA_SIZE = 10240; // 10KB
      const metadataJson = JSON.stringify(metadata);

      if (metadataJson.length > MAX_METADATA_SIZE) {
        console.warn(`⚠️  Metadata size (${metadataJson.length} bytes) exceeds limit (${MAX_METADATA_SIZE} bytes), truncating`);
        const truncated = metadataJson.substring(0, MAX_METADATA_SIZE - 20) + '...[truncated]"}';
        metadata._truncated = true;
      }

      const finalMetadata = metadataJson.length > MAX_METADATA_SIZE
        ? metadataJson.substring(0, MAX_METADATA_SIZE - 20) + '...[truncated]"}'
        : metadataJson;

      let encoded: string;
      if (metadataEncoding === 'base64') {
        encoded = encodeBase64(finalMetadata);
      } else if (metadataEncoding === 'none') {
        // Escape quotes for HTML attributes
        encoded = JSON.stringify(metadata).replace(/"/g, '&quot;');
      } else {
        // Default: URL-encoded JSON (backwards compatible)
        encoded = encodeURIComponent(JSON.stringify(metadata));
      }
      attributeValues['metadata'] = encoded;
    }
  }

  // V2: Add source map hints
  if (includeSourceMapHints && shouldInclude('path')) {
    const sourcemapHint = `webpack://${info.path}`;
    attributeValues['sourcemap'] = sourcemapHint;
  }

  // V2: Add custom attributes
  if (customAttributes) {
    try {
      const componentInfo: ComponentInfo = {
        elementName: info.name,
        filePath: info.path,
        line: info.line,
        column: info.column,
        props: info.props,
        content: info.content
      };

      const custom = customAttributes(componentInfo);

      // Security: Prevent prototype pollution
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

      // Security: Resource limits
      const MAX_CUSTOM_ATTRS = 50;
      const MAX_ATTR_LENGTH = 1000;

      const customEntries = Object.entries(custom);
      let attrCount = 0;

      for (const [key, value] of customEntries) {
        // Skip dangerous keys
        if (dangerousKeys.includes(key)) {
          console.warn(`⚠️  Skipping dangerous custom attribute key: ${key}`);
          continue;
        }

        // Limit number of custom attributes
        if (attrCount >= MAX_CUSTOM_ATTRS) {
          console.warn(`⚠️  Maximum custom attributes limit (${MAX_CUSTOM_ATTRS}) reached, skipping remaining attributes`);
          break;
        }

        // Limit attribute value length
        const truncatedValue = typeof value === 'string' && value.length > MAX_ATTR_LENGTH
          ? value.substring(0, MAX_ATTR_LENGTH) + '...'
          : value;

        if (typeof value === 'string' && value.length > MAX_ATTR_LENGTH) {
          console.warn(`⚠️  Attribute '${key}' value truncated to ${MAX_ATTR_LENGTH} characters`);
        }

        // Remove prefix if user included it
        const cleanKey = key.startsWith(prefix) ? key.slice(prefix.length + 1) : key;
        attributeValues[cleanKey] = truncatedValue;
        attrCount++;
      }
    } catch (error) {
      console.error(`⚠️  Error in customAttributes callback for ${info.name}:`, error);
      // Continue without custom attributes
    }
  }

  // Format attributes
  if (groupAttributes) {
    // Group all attributes into a single JSON object
    const grouped = JSON.stringify(attributeValues);
    const encoded = metadataEncoding === 'base64'
      ? encodeBase64(grouped)
      : encodeURIComponent(grouped);
    return ` ${prefix}="${encoded}"`;
  } else {
    // Individual attributes (default, backwards compatible)
    const attrs: string[] = [];
    for (const [key, value] of Object.entries(attributeValues)) {
      attrs.push(`${prefix}-${key}="${value}"`);
    }
    return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  }
}
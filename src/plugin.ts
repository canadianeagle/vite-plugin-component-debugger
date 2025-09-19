// src/plugin.ts
import type { Plugin } from 'vite';
import { parse } from '@babel/parser';
import MagicString from 'magic-string';
import path from 'path';
import { walk } from 'estree-walker';

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
   * @default true
   */
  includeProps?: boolean;

  /**
   * Whether to include text content
   * @default true
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
}

interface ComponentInfo {
  path: string;
  line: number;
  column: number;
  file: string;
  name: string;
  props?: Record<string, any>;
  content?: string;
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

export function componentDebugger(options: TagOptions = {}): Plugin {
  const {
    extensions = ['.jsx', '.tsx'],
    attributePrefix = 'data-dev',
    excludeElements = ['Fragment', 'React.Fragment'],
    includeProps = true,
    includeContent = true,
    customExcludes = DEFAULT_THREE_FIBER_ELEMENTS,
    enabled = true,
    debug = false
  } = options;

  const projectRoot = process.cwd();
  const stats = {
    totalFiles: 0,
    processedFiles: 0,
    totalElements: 0,
    errors: 0
  };

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

        walk(ast as any, {
          enter(node: any) {
            if (node.type === 'JSXElement') {
              currentJSXElement = node;
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

              const info: ComponentInfo = {
                path: relativePath,
                line,
                column,
                file: filename,
                name: elementName
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

              // Generate attributes
              const attributes = generateAttributes(info, attributePrefix);
              
              // Insert attributes into the code
              const insertPosition = openingElement.name.end ?? 0;
              magicString.appendLeft(insertPosition, attributes);
              
              elementCount++;
            }
          }
        });

        stats.processedFiles++;
        stats.totalElements += elementCount;

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
function generateAttributes(info: ComponentInfo, prefix: string): string {
  const attrs: string[] = [];
  
  // Unique ID
  const id = `${info.path}:${info.line}:${info.column}`;
  attrs.push(`${prefix}-id="${id}"`);
  attrs.push(`${prefix}-name="${info.name}"`);
  
  // Component location info
  attrs.push(`${prefix}-path="${info.path}"`);
  attrs.push(`${prefix}-line="${info.line}"`);
  attrs.push(`${prefix}-file="${info.file}"`);
  attrs.push(`${prefix}-component="${info.name}"`);
  
  // Props and content as JSON
  const metadata: any = {};
  if (info.props) {
    Object.assign(metadata, info.props);
  }
  if (info.content) {
    metadata.text = info.content;
  }
  
  if (Object.keys(metadata).length > 0) {
    const encoded = encodeURIComponent(JSON.stringify(metadata));
    attrs.push(`${prefix}-metadata="${encoded}"`);
  }
  
  return ' ' + attrs.join(' ');
}
// src/helpers/ast-walker.ts
// AST walking and element tagging logic
// 🚀 OPTIMIZATION #3: Single string split for debug logging (was 2 splits)

import { walk } from 'estree-walker';
import type MagicString from 'magic-string';
import type {
  ComponentInfo,
  InternalComponentInfo,
  AttributeName,
  AttributeTransformers,
  MetadataEncoding,
  TransformStats
} from '../types';
import { generateAttributes } from './attribute-generator';

/**
 * Extract text content from JSX children
 */
function extractTextContent(children: any[]): string | null {
  let text = '';
  for (const child of children) {
    if (child.type === 'JSXText') {
      text += child.value;
    }
  }
  return text.trim() || null;
}

/**
 * Fragments are transparent to depth tracking: `<>...</>`, `<Fragment>...</Fragment>`
 * and `<React.Fragment>...</React.Fragment>` must all report the same child depth.
 * Only the shorthand form used to be transparent, so `tagOnlyRoots` tagged the child
 * of `<>` but not the child of `<Fragment>`.
 */
function isFragmentName(elementName: string | null): boolean {
  if (elementName === null) return false;
  return elementName === 'Fragment' || elementName.endsWith('.Fragment');
}

/**
 * Check if element should be excluded from tagging
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

  // Check custom excludes
  if (customExcludes.has(elementName)) {
    return true;
  }

  // Check if imported from drei/three.js
  if (importedFromDrei.has(elementName)) {
    return true;
  }

  // Check namespace imports (e.g., drei.Text)
  for (const ns of namespaceImports) {
    if (elementName.startsWith(`${ns}.`)) {
      return true;
    }
  }

  return false;
}

/**
 * Debug log file processing information
 * 🚀 OPTIMIZATION #3: Single split instead of two separate splits
 */
export function logDebugInfo(code: string, relativePath: string): void {
  console.log(`\n🔍 PROCESSING FILE: ${relativePath}`);
  console.log(`📄 CODE LENGTH: ${code.length} characters`);

  // Split once and reuse (OPTIMIZATION: was 2 splits, now 1)
  const lines = code.split('\n');

  console.log(`📄 FIRST 10 LINES:`);
  lines.slice(0, 10).forEach((line, i) => {
    console.log(`  ${i + 1}: ${line}`);
  });

  console.log(`📄 LAST 5 LINES:`);
  lines.slice(-5).forEach((line, i) => {
    console.log(`  ${lines.length - 5 + i + 1}: ${line}`);
  });
}

/**
 * Match three.js / React Three Fiber module sources without catching unrelated
 * packages that merely contain the substring "three" (e.g. 'three-column-layout').
 */
function isThreeRelatedSource(source: string): boolean {
  if (source.startsWith('@react-three/')) return true;
  // 'three', 'three/examples/...', 'three-stdlib', 'three-stdlib/...'
  return /^three(-stdlib)?(\/|$)/.test(source);
}

/**
 * Collect imports from specific libraries (drei, three.js)
 */
export function collectImports(ast: any): {
  importedFromDrei: Set<string>;
  namespaceImports: Set<string>;
} {
  const importedFromDrei = new Set<string>();
  const namespaceImports = new Set<string>();

  walk(ast as any, {
    enter(node: any) {
      if (node.type === 'ImportDeclaration') {
        const source = node.source?.value;
        if (typeof source === 'string') {
          // Track React Three / three.js imports.
          // A substring test on 'three' also matched unrelated packages such as
          // 'three-column-layout', silently skipping their components.
          if (isThreeRelatedSource(source)) {
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

  return { importedFromDrei, namespaceImports };
}

/**
 * Options for element tagging
 */
export interface TagElementsOptions {
  ast: any;
  code: string;
  magicString: MagicString;
  relativePath: string;
  filename: string;
  excludeElements: string[];
  customExcludes: Set<string>;
  importedFromDrei: Set<string>;
  namespaceImports: Set<string>;
  tagOnlyRoots: boolean;
  minDepth: number;
  maxDepth: number;
  includeProps: boolean;
  includeContent: boolean;
  shouldTag?: (info: ComponentInfo) => boolean;
  attributePrefix: string;
  includeAttributes?: AttributeName[];
  excludeAttributes?: AttributeName[];
  transformers?: AttributeTransformers;
  customAttributes?: (info: ComponentInfo) => Record<string, string>;
  metadataEncoding: MetadataEncoding;
  includeSourceMapHints: boolean;
  groupAttributes: boolean;
  debug: boolean;
  stats: TransformStats & { byElementType: Record<string, number> };
}

/**
 * Result of tagging a single file
 */
export interface TagElementsResult {
  /** Number of elements tagged in this file */
  elementCount: number;
  /** Distinct element names tagged in this file, in first-seen order */
  elementNames: string[];
}

/**
 * Resolve a JSX element name to a string.
 * Handles plain identifiers and arbitrarily nested member expressions (A.B.C).
 * Returns null for names we do not tag (e.g. namespaced names like svg:circle).
 */
function resolveElementName(nameNode: any): string | null {
  if (!nameNode) return null;

  if (nameNode.type === 'JSXIdentifier') {
    return nameNode.name;
  }

  if (nameNode.type === 'JSXMemberExpression') {
    // `object` may itself be a JSXMemberExpression, so recurse instead of
    // reading `.name` (which is undefined for nested members like A.B.C).
    const objectName = resolveElementName(nameNode.object);
    if (objectName === null) return null;
    return `${objectName}.${nameNode.property.name}`;
  }

  return null;
}

/**
 * Tag JSX elements in the AST
 * Main logic for traversing AST and adding data attributes
 */
export function tagElements(options: TagElementsOptions): TagElementsResult {
  const {
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
    stats
  } = options;

  let currentJSXElement: any = null;
  const depthStack: number[] = []; // Track nesting depth
  const elementNames = new Set<string>(); // Distinct names tagged in THIS file
  let elementCount = 0;

  // Nodes that actually pushed onto depthStack, so `leave` pops symmetrically
  const pushedNodes = new WeakSet<object>();

  walk(ast as any, {
    enter(node: any) {
      if (node.type === 'JSXElement') {
        currentJSXElement = node;
        // Fragments do not add a nesting level (JSXFragment never did either)
        if (!isFragmentName(resolveElementName(node.openingElement?.name))) {
          depthStack.push(1); // Track depth by stack length
          pushedNodes.add(node);
        }
      }

      if (node.type === 'JSXOpeningElement') {
        const openingElement = node;

        // Get element name (handles nested member expressions like A.B.C)
        const elementName = resolveElementName(openingElement.name);
        if (elementName === null) {
          return;
        }

        // Check if element should be excluded
        if (
          shouldExcludeElement(
            elementName,
            excludeElements,
            customExcludes,
            importedFromDrei,
            namespaceImports
          )
        ) {
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
            console.warn(
              `⚠️  Missing location info for element "${elementName}" in ${relativePath}`
            );
          }
        }

        // Debug logging
        if (debug) {
          console.log(
            `🏷️  Tagging ${elementName} at line ${line}, column ${column} in ${relativePath}`
          );
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
              } else if (
                attr.value?.type === 'JSXExpressionContainer' &&
                attr.value.expression.type === 'StringLiteral'
              ) {
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
            console.error(
              `⚠️  Error in shouldTag callback for ${elementName} in ${relativePath}:`,
              error
            );
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
              console.warn(
                `⚠️  Could not find '/>' in self-closing element "${elementName}" at ${relativePath}:${line}`
              );
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
              console.warn(
                `⚠️  Could not find '>' in element "${elementName}" at ${relativePath}:${line}`
              );
            }
            insertPosition = elementEnd - 1;
          } else {
            insertPosition = elementStart + closingMatch;
          }
        }

        magicString.appendLeft(insertPosition, attributes);

        elementCount++;
        elementNames.add(elementName); // Track for this file's TransformStats

        // Track by element type
        stats.byElementType[elementName] = (stats.byElementType[elementName] || 0) + 1;
      }
    },
    leave(node: any) {
      // Pop depth when leaving a JSXElement that pushed one
      if (node.type === 'JSXElement' && pushedNodes.has(node)) {
        depthStack.pop();
      }
    }
  });

  return { elementCount, elementNames: Array.from(elementNames) };
}

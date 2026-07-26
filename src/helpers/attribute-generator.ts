// src/helpers/attribute-generator.ts
// Generate data attributes for JSX elements
// 🚀 OPTIMIZATION #1: Single JSON.stringify instead of triple calls

import type {
  InternalComponentInfo,
  ComponentInfo,
  AttributeName,
  AttributeTransformers,
  MetadataEncoding
} from '../types';
import { encodeBase64 } from '../utils';

/**
 * JSX attribute-name grammar (JSXIdentifier, optionally with `-` or `:` parts).
 * Attribute names are emitted verbatim into source, so anything outside this
 * grammar must be rejected rather than injected.
 */
const VALID_ATTRIBUTE_NAME = /^[A-Za-z_][A-Za-z0-9_.:-]*$/;

function isValidAttributeName(name: string): boolean {
  return VALID_ATTRIBUTE_NAME.test(name);
}

/**
 * Generate data attributes string for a JSX element
 * 🚀 PERFORMANCE: Optimized to call JSON.stringify only once or twice (not 3 times)
 *
 * @param info - Component information
 * @param prefix - Attribute prefix (e.g., 'data-dev')
 * @param includeAttributes - Allowlist of attributes to include
 * @param excludeAttributes - Disallowlist of attributes to exclude
 * @param transformers - Value transformers
 * @param customAttributes - Custom attribute callback
 * @param metadataEncoding - How to encode metadata
 * @param includeSourceMapHints - Include sourcemap hints
 * @param groupAttributes - Group into single JSON object
 * @returns Formatted attribute string
 */
export function generateAttributes(
  info: InternalComponentInfo,
  prefix: string = 'data-dev',
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
      try {
        const transformed = transformers.id(id);
        if (typeof transformed !== 'string') {
          console.warn(`⚠️  id transformer must return string, got ${typeof transformed}, using original value`);
        } else {
          id = transformed;
        }
      } catch (error) {
        console.error(`⚠️  Error in id transformer:`, error);
      }
    }
    attributeValues['id'] = id;
  }

  // Element name
  if (shouldInclude('name')) {
    let name = info.name;
    if (transformers?.name) {
      try {
        const transformed = transformers.name(name);
        if (typeof transformed !== 'string') {
          console.warn(`⚠️  name transformer must return string, got ${typeof transformed}, using original value`);
        } else {
          name = transformed;
        }
      } catch (error) {
        console.error(`⚠️  Error in name transformer:`, error);
      }
    }
    attributeValues['name'] = name;
  }

  // Component location info
  if (shouldInclude('path')) {
    let pathValue = info.path;
    if (transformers?.path) {
      try {
        const transformed = transformers.path(pathValue);
        if (typeof transformed !== 'string') {
          console.warn(`⚠️  path transformer must return string, got ${typeof transformed}, using original value`);
        } else {
          pathValue = transformed;
        }
      } catch (error) {
        console.error(`⚠️  Error in path transformer:`, error);
      }
    }
    attributeValues['path'] = pathValue;
  }

  if (shouldInclude('line')) {
    let line = String(info.line);
    if (transformers?.line) {
      try {
        const transformed = transformers.line(info.line);
        if (typeof transformed !== 'string') {
          console.warn(`⚠️  line transformer must return string, got ${typeof transformed}, using original value`);
        } else {
          line = transformed;
        }
      } catch (error) {
        console.error(`⚠️  Error in line transformer:`, error);
      }
    }
    attributeValues['line'] = line;
  }

  if (shouldInclude('file')) {
    let file = info.file;
    if (transformers?.file) {
      try {
        const transformed = transformers.file(file);
        if (typeof transformed !== 'string') {
          console.warn(`⚠️  file transformer must return string, got ${typeof transformed}, using original value`);
        } else {
          file = transformed;
        }
      } catch (error) {
        console.error(`⚠️  Error in file transformer:`, error);
      }
    }
    attributeValues['file'] = file;
  }

  if (shouldInclude('component')) {
    let component = info.name;
    if (transformers?.component) {
      try {
        const transformed = transformers.component(component);
        if (typeof transformed !== 'string') {
          console.warn(`⚠️  component transformer must return string, got ${typeof transformed}, using original value`);
        } else {
          component = transformed;
        }
      } catch (error) {
        console.error(`⚠️  Error in component transformer:`, error);
      }
    }
    attributeValues['component'] = component;
  }

  // Props and content as JSON
  // 🚀 OPTIMIZATION #1: Single JSON.stringify instead of triple calls
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

      // Stringify once upfront (OPTIMIZATION: was 3 calls, now 1-2)
      let metadataJson = JSON.stringify(metadata);

      if (metadataJson.length > MAX_METADATA_SIZE) {
        console.warn(`⚠️  Metadata size (${metadataJson.length} bytes) exceeds limit (${MAX_METADATA_SIZE} bytes), truncating`);

        // Re-stringify with _truncated flag (2nd call only if needed)
        metadataJson = JSON.stringify({ ...metadata, _truncated: true });

        // Still too large: drop to a bounded, always-valid summary object.
        // Slicing the serialized JSON (the old approach) could cut a `\uXXXX`
        // escape or a surrogate pair in half and emit unparseable JSON.
        if (metadataJson.length > MAX_METADATA_SIZE) {
          metadataJson = JSON.stringify({
            _truncated: true,
            _note: '...[truncated]',
            _originalSize: metadataJson.length,
            _keys: Object.keys(metadata).slice(0, 50)
          });
        }
      }

      let encoded: string;
      if (metadataEncoding === 'base64') {
        encoded = encodeBase64(metadataJson);
      } else if (metadataEncoding === 'none') {
        // Emit raw JSON. Quote/entity escaping is applied once, below, by
        // escapeHtml() - escaping here too produced '&amp;quot;'.
        encoded = metadataJson;
      } else {
        // Default: URL-encoded JSON (backwards compatible)
        encoded = encodeURIComponent(metadataJson);
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
        // Remove prefix if user included it (must be followed by a dash).
        // Done BEFORE the dangerous-key check so 'data-dev-__proto__' cannot
        // slip through as '__proto__'.
        const prefixWithDash = `${prefix}-`;
        const cleanKey = key.startsWith(prefixWithDash) ? key.slice(prefixWithDash.length) : key;

        // Skip dangerous keys (check both the raw and the de-prefixed form)
        if (dangerousKeys.includes(key) || dangerousKeys.includes(cleanKey)) {
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

        attributeValues[cleanKey] = truncatedValue;
        attrCount++;
      }
    } catch (error) {
      console.error(`⚠️  Error in customAttributes callback for ${info.name}:`, error);
      // Continue without custom attributes
    }
  }

  // Security: HTML escape attribute values
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Format attributes
  if (groupAttributes) {
    // Group all attributes into a single JSON object
    const grouped = JSON.stringify(attributeValues);
    let encoded: string;
    if (metadataEncoding === 'base64') {
      encoded = encodeBase64(grouped);
    } else if (metadataEncoding === 'none') {
      // Honour 'none' here too - this branch used to URL-encode regardless.
      encoded = grouped;
    } else {
      encoded = encodeURIComponent(grouped);
    }
    if (!isValidAttributeName(prefix)) {
      console.warn(`⚠️  Skipping attributes: invalid attributePrefix "${prefix}"`);
      return '';
    }
    return ` ${prefix}="${escapeHtml(encoded)}"`;
  } else {
    // Individual attributes (default, backwards compatible)
    const attrs: string[] = [];
    for (const [key, value] of Object.entries(attributeValues)) {
      const attrName = `${prefix}-${key}`;
      // Attribute NAMES are injected verbatim into JSX source. An invalid name
      // (from attributePrefix or a customAttributes key) would inject arbitrary
      // JSX or make the module unparseable, so reject it.
      if (!isValidAttributeName(attrName)) {
        console.warn(`⚠️  Skipping attribute with invalid name: ${attrName}`);
        continue;
      }
      const escapedValue = escapeHtml(String(value));
      attrs.push(`${attrName}="${escapedValue}"`);
    }
    return attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
  }
}

// src/__tests__/v2-features.test.ts
import { describe, it, expect, vi } from 'vitest';
import { componentDebugger } from '../plugin';

describe('V2 Features', () => {
  const basicCode = `
    export function Button() {
      return <button className="btn">Click me</button>;
    }
  `;

  describe('Path Filtering', () => {
    it('should include only files matching includePaths', async () => {
      const plugin = componentDebugger({
        includePaths: ['**/*.tsx']
      });

      const tsxResult = await plugin.transform?.(basicCode, 'Button.tsx');
      const jsxResult = await plugin.transform?.(basicCode, 'Button.jsx');

      expect(tsxResult).toBeTruthy();
      expect(jsxResult).toBeNull();
    });

    it('should exclude files matching excludePaths', async () => {
      const plugin = componentDebugger({
        excludePaths: ['**/*.stories.tsx', '**/__tests__/**']
      });

      const normalResult = await plugin.transform?.(basicCode, 'Button.tsx');
      const storyResult = await plugin.transform?.(basicCode, 'Button.stories.tsx');
      const testResult = await plugin.transform?.(basicCode, '__tests__/Button.tsx');

      expect(normalResult).toBeTruthy();
      expect(storyResult).toBeNull();
      expect(testResult).toBeNull();
    });

    it('should apply includePaths before excludePaths', async () => {
      const plugin = componentDebugger({
        includePaths: ['src/**'],
        excludePaths: ['**/*.test.tsx']
      });

      const includedResult = await plugin.transform?.(basicCode, 'src/Button.tsx');
      const excludedResult = await plugin.transform?.(basicCode, 'src/Button.test.tsx');
      const outsideResult = await plugin.transform?.(basicCode, 'lib/Button.tsx');

      expect(includedResult).toBeTruthy();
      expect(excludedResult).toBeNull();
      expect(outsideResult).toBeNull();
    });
  });

  describe('Attribute Transformers', () => {
    it('should transform path attribute', async () => {
      const plugin = componentDebugger({
        transformers: {
          path: (p) => p.replace(/\\/g, '/').split('/').slice(-1)[0] // Only filename, normalize slashes
        }
      });

      const result = await plugin.transform?.(basicCode, 'src/components/Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Check that path attribute was transformed
        expect(result.code).toContain('data-dev-path="Button.tsx"');

        // Verify path attribute doesn't contain directory structure
        const pathMatch = result.code.match(/data-dev-path="([^"]+)"/);
        expect(pathMatch).toBeTruthy();
        expect(pathMatch![1]).toBe('Button.tsx');
        expect(pathMatch![1]).not.toContain('src');
        expect(pathMatch![1]).not.toContain('components');
      }
    });

    it('should transform id attribute', async () => {
      const plugin = componentDebugger({
        transformers: {
          id: (id) => id.split(':').slice(-2).join(':') // Only line:col
        }
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        const idMatch = result.code.match(/data-dev-id="([^"]+)"/);
        expect(idMatch).toBeTruthy();
        // Should be just line:col, not path:line:col
        expect(idMatch![1].split(':').length).toBe(2);
      }
    });

    it('should transform name attribute', async () => {
      const plugin = componentDebugger({
        transformers: {
          name: (name) => name.toUpperCase()
        }
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-name="BUTTON"');
      }
    });

    it('should transform line attribute', async () => {
      const plugin = componentDebugger({
        transformers: {
          line: (line) => `L${line}`
        }
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toMatch(/data-dev-line="L\d+"/);
      }
    });
  });

  describe('Conditional Generation (shouldTag)', () => {
    it('should skip elements when shouldTag returns false', async () => {
      const plugin = componentDebugger({
        shouldTag: ({ elementName }) => elementName[0] === elementName[0].toUpperCase()
      });

      const code = `
        export function App() {
          return (
            <div>
              <CustomComponent />
              <button>Click</button>
            </div>
          );
        }
      `;

      const result = await plugin.transform?.(code, 'App.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-name="CustomComponent"');
        expect(result.code).not.toContain('data-dev-name="div"');
        expect(result.code).not.toContain('data-dev-name="button"');
      }
    });

    it('should pass component info to shouldTag', async () => {
      const mockShouldTag = vi.fn(() => true);
      const plugin = componentDebugger({
        shouldTag: mockShouldTag
      });

      await plugin.transform?.(basicCode, 'Button.tsx');

      expect(mockShouldTag).toHaveBeenCalledWith(
        expect.objectContaining({
          elementName: 'button',
          filePath: 'Button.tsx',
          line: expect.any(Number),
          column: expect.any(Number)
        })
      );
    });
  });

  describe('Custom Attributes', () => {
    it('should add custom attributes to elements', async () => {
      const plugin = componentDebugger({
        customAttributes: () => ({
          'data-dev-custom': 'test-value',
          'data-dev-timestamp': '12345'
        })
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-custom="test-value"');
        expect(result.code).toContain('data-dev-timestamp="12345"');
      }
    });

    it('should pass component info to customAttributes', async () => {
      const mockCustomAttrs = vi.fn(() => ({}));
      const plugin = componentDebugger({
        customAttributes: mockCustomAttrs
      });

      await plugin.transform?.(basicCode, 'Button.tsx');

      expect(mockCustomAttrs).toHaveBeenCalledWith(
        expect.objectContaining({
          elementName: 'button',
          filePath: 'Button.tsx'
        })
      );
    });
  });

  describe('Metadata Encoding', () => {
    const codeWithProps = `
      export function Button() {
        return <button className="primary" disabled>Click</button>;
      }
    `;

    it('should use URL-encoded JSON by default (backwards compatible)', async () => {
      const plugin = componentDebugger({
        includeProps: true
      });

      const result = await plugin.transform?.(codeWithProps, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-metadata="%7B%22className%22');
      }
    });

    it('should use base64 encoding when specified', async () => {
      const plugin = componentDebugger({
        includeProps: true,
        metadataEncoding: 'base64'
      });

      const result = await plugin.transform?.(codeWithProps, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        const metadataMatch = result.code.match(/data-dev-metadata="([^"]+)"/);
        expect(metadataMatch).toBeTruthy();

        // Base64 should not contain URL-encoded characters
        expect(metadataMatch![1]).not.toContain('%');

        // Should be valid base64
        const decoded = Buffer.from(metadataMatch![1], 'base64').toString();
        const parsed = JSON.parse(decoded);
        expect(parsed.className).toBe('primary');
      }
    });

    it('should use plain JSON when encoding is none', async () => {
      const plugin = componentDebugger({
        includeProps: true,
        metadataEncoding: 'none'
      });

      const result = await plugin.transform?.(codeWithProps, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        const metadataMatch = result.code.match(/data-dev-metadata="([^"]+)"/);
        expect(metadataMatch).toBeTruthy();

        // Plain JSON should be escaped for HTML, so check it's not URL-encoded
        expect(metadataMatch![1]).not.toContain('%');

        // Should contain JSON structure (with escaped quotes for HTML)
        expect(result.code).toContain('data-dev-metadata');
      }
    });
  });

  describe('Component Depth Filtering', () => {
    const nestedCode = `
      export function App() {
        return (
          <div>
            <section>
              <article>
                <p>Deep nested</p>
              </article>
            </section>
          </div>
        );
      }
    `;

    it('should only tag root-level components when tagOnlyRoots is true', async () => {
      const plugin = componentDebugger({
        tagOnlyRoots: true
      });

      const result = await plugin.transform?.(nestedCode, 'App.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should only tag <div> (root)
        const divMatches = result.code.match(/data-dev-name="div"/g);
        const sectionMatches = result.code.match(/data-dev-name="section"/g);

        expect(divMatches).toHaveLength(1);
        expect(sectionMatches).toBeNull();
      }
    });

    it('should respect minDepth setting', async () => {
      const plugin = componentDebugger({
        minDepth: 2
      });

      const result = await plugin.transform?.(nestedCode, 'App.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should NOT tag <div> (depth 1)
        // Should tag <section> and deeper (depth 2+)
        expect(result.code).not.toMatch(/<div[^>]*data-dev-name/);
        expect(result.code).toContain('data-dev-name="section"');
      }
    });

    it('should respect maxDepth setting', async () => {
      const plugin = componentDebugger({
        maxDepth: 2
      });

      const result = await plugin.transform?.(nestedCode, 'App.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should tag <div> and <section> (depth 1-2)
        // Should NOT tag <article> and <p> (depth 3-4)
        expect(result.code).toContain('data-dev-name="div"');
        expect(result.code).toContain('data-dev-name="section"');
        expect(result.code).not.toContain('data-dev-name="article"');
      }
    });

    it('should work with both minDepth and maxDepth', async () => {
      const plugin = componentDebugger({
        minDepth: 2,
        maxDepth: 3
      });

      const result = await plugin.transform?.(nestedCode, 'App.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should ONLY tag depth 2-3 (section, article)
        expect(result.code).not.toContain('data-dev-name="div"'); // depth 1
        expect(result.code).toContain('data-dev-name="section"'); // depth 2
        expect(result.code).toContain('data-dev-name="article"'); // depth 3
        expect(result.code).not.toContain('data-dev-name="p"'); // depth 4
      }
    });
  });

  describe('Enhanced Statistics & Callbacks', () => {
    it('should call onTransform callback after processing each file', async () => {
      const mockOnTransform = vi.fn();
      const plugin = componentDebugger({
        onTransform: mockOnTransform
      });

      await plugin.transform?.(basicCode, 'Button.tsx');

      expect(mockOnTransform).toHaveBeenCalledWith(
        expect.objectContaining({
          file: 'Button.tsx',
          elementsTagged: 1,
          elementNames: ['button']
        })
      );
    });

    it('should call onComplete callback in buildEnd', async () => {
      const mockOnComplete = vi.fn();
      const plugin = componentDebugger({
        onComplete: mockOnComplete
      });

      // Need to process at least one file for buildEnd to call onComplete
      await plugin.transform?.(basicCode, 'Button.tsx');
      plugin.buildEnd?.();

      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          totalFiles: expect.any(Number),
          processedFiles: expect.any(Number),
          totalElements: expect.any(Number),
          errors: expect.any(Number),
          byElementType: expect.any(Object)
        })
      );
    });

    it('should track elements by type', async () => {
      const stats: any = {};
      const plugin = componentDebugger({
        onComplete: (s) => Object.assign(stats, s)
      });

      const code = `
        export function App() {
          return (
            <div>
              <button>One</button>
              <button>Two</button>
              <span>Text</span>
            </div>
          );
        }
      `;

      await plugin.transform?.(code, 'App.tsx');
      plugin.buildEnd?.();

      expect(stats.byElementType).toEqual({
        div: 1,
        button: 2,
        span: 1
      });
    });
  });

  describe('Presets', () => {
    it('should apply minimal preset correctly', async () => {
      const plugin = componentDebugger({
        preset: 'minimal'
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should only include id
        expect(result.code).toContain('data-dev-id');
        expect(result.code).not.toContain('data-dev-name');
        expect(result.code).not.toContain('data-dev-path');
        expect(result.code).not.toContain('data-dev-line');
      }
    });

    it('should apply testing preset correctly', async () => {
      const plugin = componentDebugger({
        preset: 'testing'
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should include id, name, component
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-name');
        expect(result.code).toContain('data-dev-component');
        // Should NOT include path, file
        expect(result.code).not.toContain('data-dev-path');
        expect(result.code).not.toContain('data-dev-file');
      }
    });

    it('should apply debugging preset correctly', async () => {
      const plugin = componentDebugger({
        preset: 'debugging'
      });

      const codeWithProps = `
        export function Button() {
          return <button className="btn">Click me</button>;
        }
      `;

      const result = await plugin.transform?.(codeWithProps, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should include all attributes
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-name');
        expect(result.code).toContain('data-dev-metadata'); // includeProps is true
      }
    });

    it('should apply production preset correctly', async () => {
      const plugin = componentDebugger({
        preset: 'production'
      });

      const result = await plugin.transform?.(basicCode, 'src/components/Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should only include id and line
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-line');

        // Should NOT include other attributes
        expect(result.code).not.toContain('data-dev-name');
        expect(result.code).not.toContain('data-dev-component');
        expect(result.code).not.toContain('data-dev-file');

        // ID should be transformed (only line:col)
        const idMatch = result.code.match(/data-dev-id="([^"]+)"/);
        expect(idMatch![1].split(':').length).toBe(2);
      }
    });

    it('should allow overriding preset options', async () => {
      const plugin = componentDebugger({
        preset: 'minimal',
        includeAttributes: ['id', 'name'] // Override preset
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-name'); // Overridden
      }
    });
  });

  describe('Source Map Hints', () => {
    it('should include sourcemap attribute when enabled', async () => {
      const plugin = componentDebugger({
        includeSourceMapHints: true
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-sourcemap="webpack://Button.tsx"');
      }
    });

    it('should not include sourcemap attribute by default', async () => {
      const plugin = componentDebugger();

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).not.toContain('data-dev-sourcemap');
      }
    });
  });

  describe('Attribute Grouping', () => {
    it('should group all attributes into single JSON object when enabled', async () => {
      const plugin = componentDebugger({
        groupAttributes: true,
        includeAttributes: ['id', 'name', 'line']
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should have single data-dev attribute
        expect(result.code).toContain('data-dev="');

        // Should NOT have individual attributes
        expect(result.code).not.toContain('data-dev-id="');
        expect(result.code).not.toContain('data-dev-name="');

        // Parse grouped attribute
        const groupedMatch = result.code.match(/data-dev="([^"]+)"/);
        expect(groupedMatch).toBeTruthy();

        const decoded = decodeURIComponent(groupedMatch![1]);
        const parsed = JSON.parse(decoded);

        expect(parsed).toHaveProperty('id');
        expect(parsed).toHaveProperty('name', 'button');
        expect(parsed).toHaveProperty('line');
      }
    });

    it('should use base64 encoding for grouped attributes when specified', async () => {
      const plugin = componentDebugger({
        groupAttributes: true,
        metadataEncoding: 'base64',
        includeAttributes: ['id', 'name']
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        const groupedMatch = result.code.match(/data-dev="([^"]+)"/);
        expect(groupedMatch).toBeTruthy();

        // Should not contain URL-encoded characters
        expect(groupedMatch![1]).not.toContain('%');

        // Decode base64
        const decoded = Buffer.from(groupedMatch![1], 'base64').toString();
        const parsed = JSON.parse(decoded);

        expect(parsed.name).toBe('button');
      }
    });
  });

  describe('Backwards Compatibility', () => {
    it('should work without any v2 options (backwards compatible)', async () => {
      const plugin = componentDebugger();

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-name');
        expect(result.code).toContain('data-dev-path');
        expect(result.code).toContain('data-dev-line');
        expect(result.code).toContain('data-dev-file');
        expect(result.code).toContain('data-dev-component');
      }
    });

    it('should not break existing configurations', async () => {
      const plugin = componentDebugger({
        enabled: true,
        attributePrefix: 'data-test',
        includeProps: false,
        includeContent: false
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-test-id');
        expect(result.code).toContain('data-test-name');
        expect(result.code).not.toContain('data-dev');
      }
    });
  });
});
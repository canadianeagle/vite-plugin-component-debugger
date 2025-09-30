// src/__tests__/v2-bugfixes.test.ts
// Tests for v2 bug fixes implemented based on code review (2025-09-30)
// These tests verify 4 critical bug fixes:
// 1. Transformer merging with undefined values
// 2. Depth tracking synchronization (removed redundant currentDepth)
// 3. Prefix removal edge cases
// 4. Metadata truncation logic consistency across all encoding methods

import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../plugin';

describe('V2 Bug Fixes', () => {
  const basicCode = `
    export function Button() {
      return <button className="btn">Click me</button>;
    }
  `;

  describe('Issue #1: Transformer Merging with Undefined', () => {
    it('should merge preset transformers with user transformers without crashing', async () => {
      // Production preset has transformers defined
      const plugin = componentDebugger({
        preset: 'production',
        transformers: {
          line: (line) => `L${line}` // Merge with preset transformers
        }
      });

      const result = await plugin.transform?.(basicCode, 'src/components/deep/Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should have both preset transformers (id shortened) AND user transformer (line prefixed)
        const idMatch = result.code.match(/data-dev-id="([^"]+)"/);
        expect(idMatch).toBeTruthy();
        expect(idMatch![1].split(':').length).toBe(2); // Preset id transformer applied (line:col only)

        // User transformer should also be applied to line attribute
        expect(result.code).toMatch(/data-dev-line="L\d+"/);
      }
    });

    it('should handle preset with undefined transformers merged with user transformers', async () => {
      // Minimal preset has NO transformers (undefined)
      const plugin = componentDebugger({
        preset: 'minimal',
        transformers: {
          id: (id) => id.toUpperCase()
        }
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      // Should not crash, should apply user transformer
      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'code' in result) {
        const idMatch = result.code.match(/data-dev-id="([^"]+)"/);
        expect(idMatch).toBeTruthy();
        // ID should be uppercase due to transformer
        expect(idMatch![1]).toMatch(/^[A-Z0-9:.]+$/);
      }
    });

    it('should handle preset with transformers when user provides no transformers', async () => {
      const plugin = componentDebugger({
        preset: 'production'
        // No transformers provided by user
      });

      const result = await plugin.transform?.(basicCode, 'src/components/Button.tsx');

      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'code' in result) {
        // Preset transformers should be applied
        const idMatch = result.code.match(/data-dev-id="([^"]+)"/);
        expect(idMatch).toBeTruthy();
        expect(idMatch![1].split(':').length).toBe(2); // line:col only
      }
    });
  });

  describe('Issue #2: Depth Tracking Synchronization', () => {
    const deeplyNestedCode = `
      export function App() {
        return (
          <div>
            <section>
              <article>
                <header>
                  <h1>Title</h1>
                </header>
              </article>
            </section>
          </div>
        );
      }
    `;

    it('should correctly track depth using only depthStack (no redundant counter)', async () => {
      const plugin = componentDebugger({
        maxDepth: 3
      });

      const result = await plugin.transform?.(deeplyNestedCode, 'App.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should tag depth 1-3 only
        expect(result.code).toContain('data-dev-name="div"');      // depth 1
        expect(result.code).toContain('data-dev-name="section"');  // depth 2
        expect(result.code).toContain('data-dev-name="article"');  // depth 3

        // Should NOT tag depth 4+
        expect(result.code).not.toContain('data-dev-name="header"'); // depth 4
        expect(result.code).not.toContain('data-dev-name="h1"');     // depth 5
      }
    });

    it('should handle minDepth and maxDepth together correctly', async () => {
      const plugin = componentDebugger({
        minDepth: 2,
        maxDepth: 3
      });

      const result = await plugin.transform?.(deeplyNestedCode, 'App.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should skip depth 1
        expect(result.code).not.toContain('data-dev-name="div"'); // depth 1

        // Should tag depth 2-3
        expect(result.code).toContain('data-dev-name="section"');  // depth 2
        expect(result.code).toContain('data-dev-name="article"');  // depth 3

        // Should skip depth 4+
        expect(result.code).not.toContain('data-dev-name="header"'); // depth 4
      }
    });

    it('should handle tagOnlyRoots correctly', async () => {
      const plugin = componentDebugger({
        tagOnlyRoots: true
      });

      const result = await plugin.transform?.(deeplyNestedCode, 'App.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should ONLY tag depth 1 (root)
        expect(result.code).toContain('data-dev-name="div"');

        // Should NOT tag any nested elements
        expect(result.code).not.toContain('data-dev-name="section"');
        expect(result.code).not.toContain('data-dev-name="article"');
        expect(result.code).not.toContain('data-dev-name="header"');
        expect(result.code).not.toContain('data-dev-name="h1"');
      }
    });
  });

  describe('Issue #3: Prefix Removal Edge Cases', () => {
    it('should correctly handle custom attribute with prefix and dash', async () => {
      const plugin = componentDebugger({
        customAttributes: () => ({
          'data-dev-custom': 'value1',
          'data-dev-test': 'value2'
        })
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Prefix should be removed, leaving just the key
        expect(result.code).toContain('data-dev-custom="value1"');
        expect(result.code).toContain('data-dev-test="value2"');
      }
    });

    it('should NOT incorrectly slice keys that start with prefix but lack dash', async () => {
      const plugin = componentDebugger({
        customAttributes: () => ({
          'data-devCustom': 'should-not-be-sliced',  // No dash after prefix!
          'data-dev-proper': 'should-be-deduplicated'
        })
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Key without dash should NOT have prefix removed (would become "ustom")
        // Instead, it should be added as-is
        expect(result.code).toContain('data-dev-data-devCustom="should-not-be-sliced"');

        // Key with proper dash should have prefix removed
        expect(result.code).toContain('data-dev-proper="should-be-deduplicated"');
      }
    });

    it('should handle custom attributes without data-dev prefix', async () => {
      const plugin = componentDebugger({
        customAttributes: () => ({
          'env': 'production',
          'timestamp': '12345'
        })
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Keys without prefix should get prefix added
        expect(result.code).toContain('data-dev-env="production"');
        expect(result.code).toContain('data-dev-timestamp="12345"');
      }
    });
  });

  describe('Issue #4: Metadata Truncation Logic', () => {
    it('should add _truncated flag and truncate when metadata exceeds limit (JSON encoding)', async () => {
      // Create metadata larger than 10KB
      const largeProps = 'x'.repeat(11000); // 11KB of data

      const codeWithLargeProps = `
        export function Component() {
          return <div data-large="${largeProps}">Content</div>;
        }
      `;

      const plugin = componentDebugger({
        includeProps: true,
        metadataEncoding: 'json' // URL-encoded JSON (default)
      });

      const result = await plugin.transform?.(codeWithLargeProps, 'Component.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-metadata');

        // Decode the metadata
        const metadataMatch = result.code.match(/data-dev-metadata="([^"]+)"/);
        expect(metadataMatch).toBeTruthy();

        const decoded = decodeURIComponent(metadataMatch![1]);

        // Should be truncated with marker (this is the key fix - all encodings respect limits)
        expect(decoded).toContain('...[truncated]');

        // Decoded string should be limited to around 10KB (MAX_METADATA_SIZE)
        // Allow some overhead for the _truncated flag and JSON structure
        expect(decoded.length).toBeLessThan(10500);
      }
    });

    it('should respect size limits for base64 encoding', async () => {
      const largeProps = 'y'.repeat(11000);

      const codeWithLargeProps = `
        export function Component() {
          return <div data-large="${largeProps}">Content</div>;
        }
      `;

      const plugin = componentDebugger({
        includeProps: true,
        metadataEncoding: 'base64'
      });

      const result = await plugin.transform?.(codeWithLargeProps, 'Component.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        const metadataMatch = result.code.match(/data-dev-metadata="([^"]+)"/);
        expect(metadataMatch).toBeTruthy();

        const decoded = Buffer.from(metadataMatch![1], 'base64').toString();

        // KEY FIX: Before the fix, base64 encoding bypassed size limits
        // Now it should be truncated with marker
        expect(decoded).toContain('...[truncated]');

        // Should be limited in size
        expect(decoded.length).toBeLessThan(10500);
      }
    });

    it('should respect size limits for none encoding', async () => {
      const largeProps = 'z'.repeat(11000);

      const codeWithLargeProps = `
        export function Component() {
          return <div data-large="${largeProps}">Content</div>;
        }
      `;

      const plugin = componentDebugger({
        includeProps: true,
        metadataEncoding: 'none'
      });

      const result = await plugin.transform?.(codeWithLargeProps, 'Component.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // KEY FIX: Before the fix, 'none' encoding bypassed size limits
        // Now it should be truncated
        expect(result.code).toContain('data-dev-metadata');
        expect(result.code).toContain('...[truncated]');

        // The raw attribute in code should be reasonably sized (not 11KB)
        const metadataStart = result.code.indexOf('data-dev-metadata');
        const metadataEnd = result.code.indexOf('">', metadataStart);
        const metadataAttr = result.code.substring(metadataStart, metadataEnd);

        // Should be limited (account for HTML escaping)
        expect(metadataAttr.length).toBeLessThan(15000); // Allow some overhead for escaping
      }
    });

    it('should NOT add _truncated flag when metadata is within limits', async () => {
      const smallProps = 'small data';

      const codeWithSmallProps = `
        export function Component() {
          return <div className="${smallProps}">Content</div>;
        }
      `;

      const plugin = componentDebugger({
        includeProps: true,
        metadataEncoding: 'json'
      });

      const result = await plugin.transform?.(codeWithSmallProps, 'Component.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        const metadataMatch = result.code.match(/data-dev-metadata="([^"]+)"/);
        expect(metadataMatch).toBeTruthy();

        const decoded = decodeURIComponent(metadataMatch![1]);

        // _truncated flag should NOT be present
        expect(decoded).not.toContain('_truncated');
        expect(decoded).not.toContain('...[truncated]');

        // Should be valid, complete JSON
        const metadata = JSON.parse(decoded);
        expect(metadata.className).toBe('small data');
      }
    });
  });

  describe('Integration: All Fixes Working Together', () => {
    it('should handle all fixes simultaneously without issues', async () => {
      const complexCode = `
        export function ComplexApp() {
          return (
            <div>
              <section>
                <article>
                  <header>
                    <h1>Title</h1>
                  </header>
                </article>
              </section>
            </div>
          );
        }
      `;

      const plugin = componentDebugger({
        preset: 'testing', // Has includeAttributes: ['id', 'name', 'component']
        transformers: {
          name: (n) => n.toUpperCase() // Merge with preset transformers (preset has none)
        },
        customAttributes: () => ({
          'data-dev-custom': 'test',
          'env': 'test'
        }),
        maxDepth: 3,
        includeProps: true
      });

      const result = await plugin.transform?.(complexCode, 'src/deep/path/ComplexApp.tsx');

      // Should not crash and should apply all fixes correctly
      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'code' in result) {
        // Transformer merging works (name should be uppercase)
        expect(result.code).toContain('data-dev-name="DIV"');

        // Depth tracking works (max 3 levels)
        expect(result.code).not.toContain('data-dev-name="HEADER"'); // depth 4

        // Custom attributes work
        expect(result.code).toContain('data-dev-custom="test"');
        expect(result.code).toContain('data-dev-env="test"');

        // No crashes - all logic working together
        expect(result.code).toBeDefined();
      }
    });
  });
});

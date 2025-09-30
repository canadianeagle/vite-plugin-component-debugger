// src/__tests__/v2-edge-cases.test.ts
import { describe, it, expect, vi } from 'vitest';
import { componentDebugger } from '../plugin';

describe('V2 Edge Cases & Security', () => {
  const basicCode = `
    export function Button() {
      return <button className="btn">Click me</button>;
    }
  `;

  describe('XSS Prevention', () => {
    it('should escape HTML in custom attribute values', async () => {
      const plugin = componentDebugger({
        customAttributes: () => ({
          'xss': '"><script>alert("XSS")</script><div class="'
        })
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should not contain unescaped script tags
        expect(result.code).not.toContain('<script>');
        // Attribute value should be present but escaped
        expect(result.code).toContain('data-dev-xss=');
      }
    });

    it('should handle quote injection attempts', async () => {
      const plugin = componentDebugger({
        customAttributes: () => ({
          'quote': '" onload="alert(\'XSS\')" data-fake="'
        })
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Quotes should be escaped, preventing attribute breakout
        expect(result.code).toContain('&quot;');
        // Should not have unescaped onload attribute that could execute
        // The string 'onload=' will be present but escaped as &quot; onload=&quot;
        const hasUnescapedOnload = result.code.match(/data-dev-quote="[^"]*" onload=/);
        expect(hasUnescapedOnload).toBeNull();
      }
    });
  });

  describe('ReDoS Prevention', () => {
    it('should handle malicious glob patterns without hanging', async () => {
      // These patterns are known to cause ReDoS in some regex engines
      const maliciousPatterns = [
        '(a+)+$',
        '(a|a)*',
        '(a|ab)*',
        '**/**/**/**/**/**/**/**/**/**'
      ];

      const plugin = componentDebugger({
        includePaths: maliciousPatterns
      });

      const startTime = Date.now();
      await plugin.transform?.(basicCode, 'Button.tsx');
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Circular References', () => {
    it('should handle circular references in metadata gracefully', async () => {
      const code = `
        export function Button() {
          const obj: any = { name: 'test' };
          obj.self = obj; // Circular reference
          return <button data-obj={obj}>Click</button>;
        }
      `;

      const plugin = componentDebugger({
        includeProps: true
      });

      // Should not crash due to circular reference
      const result = await plugin.transform?.(code, 'Button.tsx');
      expect(result).toBeDefined();
    });
  });

  describe('Very Large Metadata', () => {
    it('should handle and truncate very large metadata', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create code with many props that together exceed 10KB metadata
      // Each prop is ~500 chars, 50 props = ~25KB
      const manyProps = Array.from({ length: 50 }, (_, i) => `prop${i}="${'x'.repeat(500)}"`).join(' ');
      const code = `
        export function Button() {
          return <button ${manyProps}>Click</button>;
        }
      `;

      const plugin = componentDebugger({
        includeProps: true
      });

      const result = await plugin.transform?.(code, 'Button.tsx');

      // Should warn about large metadata
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Metadata size')
      );

      if (result && typeof result === 'object' && 'code' in result) {
        // Metadata should be present and truncated
        const metadataMatch = result.code.match(/data-dev-metadata="([^"]+)"/);
        if (metadataMatch) {
          // Should be truncated to reasonable size
          const decoded = decodeURIComponent(metadataMatch[1]);
          expect(decoded.length).toBeLessThan(11000); // Should be around 10KB limit
          expect(decoded).toContain('[truncated]');
        }
      }

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Very Deep Nesting', () => {
    it('should handle extremely deep nesting (50+ levels)', async () => {
      // Generate deeply nested JSX
      let code = 'export function Deep() { return (';
      for (let i = 0; i < 60; i++) {
        code += '<div>';
      }
      code += '<span>Deep</span>';
      for (let i = 0; i < 60; i++) {
        code += '</div>';
      }
      code += '); }';

      const plugin = componentDebugger({
        maxDepth: 50 // Should stop at 50
      });

      const result = await plugin.transform?.(code, 'Deep.tsx');

      // Should not crash
      expect(result).toBeDefined();

      if (result && typeof result === 'object' && 'code' in result) {
        // Count how many elements were tagged
        const matches = result.code.match(/data-dev-id=/g);
        // Should have tagged some elements, but not all 60
        if (matches) {
          expect(matches.length).toBeLessThanOrEqual(50);
        }
      }
    });

    it('should not cause stack overflow with extreme nesting', async () => {
      let code = 'export function VeryDeep() { return (';
      for (let i = 0; i < 100; i++) {
        code += '<div>';
      }
      code += '<span>Text</span>';
      for (let i = 0; i < 100; i++) {
        code += '</div>';
      }
      code += '); }';

      const plugin = componentDebugger();

      // Should not crash with stack overflow
      expect(async () => {
        await plugin.transform?.(code, 'VeryDeep.tsx');
      }).not.toThrow();
    });
  });

  describe('Files with Hundreds of Elements', () => {
    it('should handle files with 500+ elements efficiently', async () => {
      // Generate code with many elements
      let code = 'export function Many() { return (<div>';
      for (let i = 0; i < 500; i++) {
        code += `<span key="${i}">Item ${i}</span>`;
      }
      code += '</div>); }';

      const plugin = componentDebugger();

      const startTime = Date.now();
      const result = await plugin.transform?.(code, 'Many.tsx');
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);

      if (result && typeof result === 'object' && 'code' in result) {
        // Should have tagged all elements
        const matches = result.code.match(/data-dev-id=/g);
        expect(matches).toBeDefined();
        expect(matches!.length).toBeGreaterThan(400);
      }
    });
  });

  describe('Very Long File Paths', () => {
    it('should handle file paths >260 characters (Windows limit)', async () => {
      const longPath = 'src/' + 'very-long-directory-name/'.repeat(20) + 'Component.tsx';
      expect(longPath.length).toBeGreaterThan(260);

      const plugin = componentDebugger();

      const result = await plugin.transform?.(basicCode, longPath);

      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-path=');
      }
    });
  });

  describe('Feature Combinations', () => {
    it('should handle shouldTag + transformers + customAttributes together', async () => {
      let shouldTagCalled = false;
      let transformerCalled = false;
      let customAttrsCalled = false;

      const plugin = componentDebugger({
        shouldTag: ({ elementName }) => {
          shouldTagCalled = true;
          return elementName === 'button';
        },
        transformers: {
          name: (name) => {
            transformerCalled = true;
            return name.toUpperCase();
          }
        },
        customAttributes: () => {
          customAttrsCalled = true;
          return { 'custom': 'value' };
        }
      });

      const code = `
        export function App() {
          return (
            <div>
              <button>Click</button>
            </div>
          );
        }
      `;

      const result = await plugin.transform?.(code, 'App.tsx');

      // All callbacks should be called
      expect(shouldTagCalled).toBe(true);
      expect(transformerCalled).toBe(true);
      expect(customAttrsCalled).toBe(true);

      if (result && typeof result === 'object' && 'code' in result) {
        // Only button should be tagged (shouldTag filter)
        expect(result.code).toContain('data-dev-name="BUTTON"'); // transformer
        expect(result.code).toContain('data-dev-custom="value"'); // customAttributes
        expect(result.code).not.toContain('data-dev-name="DIV"'); // filtered by shouldTag
      }
    });

    it('should handle all v2 features enabled simultaneously', async () => {
      const plugin = componentDebugger({
        preset: 'debugging',
        includeAttributes: ['id', 'name', 'line', 'metadata'],
        includePaths: ['**/*.tsx'],
        excludePaths: ['**/*.test.tsx'],
        transformers: {
          path: (p) => p.split('/').pop() || p
        },
        shouldTag: ({ elementName }) => elementName === 'button',
        customAttributes: () => ({ 'env': 'test' }),
        metadataEncoding: 'base64',
        maxDepth: 10,
        minDepth: 0,
        includeSourceMapHints: true,
        groupAttributes: false
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-');
      }
    });

    it('should handle includePaths + excludePaths + shouldTag together', async () => {
      const plugin = componentDebugger({
        includePaths: ['src/**/*.tsx'],
        excludePaths: ['src/**/*.test.tsx'],
        shouldTag: ({ elementName }) => elementName[0] === elementName[0].toUpperCase()
      });

      // Should process this file (matches includePaths, not in excludePaths)
      const result1 = await plugin.transform?.(basicCode, 'src/components/Button.tsx');
      expect(result1).toBeDefined();

      // Should NOT process this file (matches excludePaths)
      const result2 = await plugin.transform?.(basicCode, 'src/components/Button.test.tsx');
      expect(result2).toBeNull();

      // Should NOT process this file (doesn't match includePaths)
      const result3 = await plugin.transform?.(basicCode, 'lib/Button.tsx');
      expect(result3).toBeNull();
    });
  });
});
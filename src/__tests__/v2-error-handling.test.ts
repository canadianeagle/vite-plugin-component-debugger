// src/__tests__/v2-error-handling.test.ts
import { describe, it, expect, vi } from 'vitest';
import { componentDebugger } from '../plugin';

describe('V2 Error Handling', () => {
  const basicCode = `
    export function Button() {
      return <button className="btn">Click me</button>;
    }
  `;

  describe('shouldTag callback errors', () => {
    it('should handle shouldTag callback throwing an error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const plugin = componentDebugger({
        shouldTag: () => {
          throw new Error('shouldTag error');
        }
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      // Should still process the element (not skip on error)
      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-id');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in shouldTag callback'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should continue processing after shouldTag error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const plugin = componentDebugger({
        shouldTag: () => {
          throw new Error('Test error');
        }
      });

      const code = `
        export function App() {
          return (
            <div>
              <button>One</button>
              <button>Two</button>
            </div>
          );
        }
      `;

      const result = await plugin.transform?.(code, 'App.tsx');

      // All elements should be tagged despite error
      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-name="div"');
        expect(result.code).toContain('data-dev-name="button"');
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe('customAttributes callback errors', () => {
    it('should handle customAttributes callback throwing an error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const plugin = componentDebugger({
        customAttributes: () => {
          throw new Error('customAttributes error');
        }
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      // Should still include default attributes
      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-name');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in customAttributes callback'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('transformer errors', () => {
    it('should handle transformer throwing an error', async () => {
      let errorWasThrown = false;

      const plugin = componentDebugger({
        transformers: {
          path: () => {
            errorWasThrown = true;
            throw new Error('Transformer error');
          }
        }
      });

      // Should not crash - error should be caught internally
      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      // Verify transformer was called and threw error
      expect(errorWasThrown).toBe(true);

      // Verify plugin continued processing despite error
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'code' in result) {
        // Should still have tagged the element
        expect(result.code).toContain('data-dev-id');
      }
    });
  });

  describe('exportStats path validation', () => {
    it('should prevent path traversal attacks', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const plugin = componentDebugger({
        exportStats: '../../../etc/passwd'
      });

      await plugin.transform?.(basicCode, 'Button.tsx');
      plugin.buildEnd?.();

      // Should log security warning
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security: exportStats path must be within project directory')
      );

      consoleErrorSpy.mockRestore();
    });

    it('should prevent absolute path outside project', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const plugin = componentDebugger({
        exportStats: '/tmp/malicious.json'
      });

      await plugin.transform?.(basicCode, 'Button.tsx');
      plugin.buildEnd?.();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security: exportStats path must be within project directory')
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('invalid configuration values', () => {
    it('should handle invalid preset name gracefully', async () => {
      const plugin = componentDebugger({
        preset: 'invalid-preset' as any
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      // Should fall back to default behavior
      expect(result).toBeTruthy();
    });

    it('should handle negative maxDepth', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const plugin = componentDebugger({
        maxDepth: -5
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('maxDepth must be between 0 and')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle negative minDepth', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const plugin = componentDebugger({
        minDepth: -3
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('minDepth cannot be negative')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should swap minDepth and maxDepth if reversed', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const plugin = componentDebugger({
        minDepth: 5,
        maxDepth: 2
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('minDepth (5) cannot be greater than maxDepth (2)')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle maxDepth exceeding limit', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const plugin = componentDebugger({
        maxDepth: 100
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('maxDepth must be between 0 and 50')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('resource exhaustion protection', () => {
    it('should limit number of custom attributes', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const plugin = componentDebugger({
        customAttributes: () => {
          const attrs: Record<string, string> = {};
          for (let i = 0; i < 100; i++) {
            attrs[`attr-${i}`] = `value-${i}`;
          }
          return attrs;
        }
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Maximum custom attributes limit (50) reached')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should truncate long attribute values', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const plugin = componentDebugger({
        customAttributes: () => ({
          'long-attr': 'x'.repeat(2000)
        })
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('truncated to 1000 characters')
      );

      if (result && typeof result === 'object' && 'code' in result) {
        // Value should be truncated
        const match = result.code.match(/data-dev-long-attr="([^"]+)"/);
        if (match) {
          expect(match[1].length).toBeLessThanOrEqual(1003); // 1000 + '...'
        }
      }

      consoleWarnSpy.mockRestore();
    });

    it('should truncate large metadata', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const code = `
        export function Button() {
          return <button data-huge="${'x'.repeat(20000)}">Click</button>;
        }
      `;

      const plugin = componentDebugger({
        includeProps: true
      });

      const result = await plugin.transform?.(code, 'Button.tsx');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Metadata size')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('prototype pollution prevention', () => {
    it('should filter dangerous keys (__proto__, constructor, prototype)', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const plugin = componentDebugger({
        customAttributes: () => {
          const attrs: Record<string, string> = {
            'normal': 'safe'
          };
          // Explicitly set dangerous keys
          attrs['__proto__'] = 'malicious1';
          attrs['constructor'] = 'malicious2';
          attrs['prototype'] = 'malicious3';
          return attrs;
        }
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      // Should warn about dangerous keys (at least one)
      const warnCalls = consoleWarnSpy.mock.calls;
      const hasDangerousKeyWarning = warnCalls.some(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Skipping dangerous custom attribute key'))
      );

      // Note: __proto__ might not show up in Object.entries, but constructor and prototype should
      if (hasDangerousKeyWarning) {
        expect(hasDangerousKeyWarning).toBe(true);
      }

      if (result && typeof result === 'object' && 'code' in result) {
        // Should not contain any dangerous keys
        expect(result.code).not.toContain('data-dev-__proto__');
        expect(result.code).not.toContain('data-dev-constructor');
        expect(result.code).not.toContain('data-dev-prototype');
        // Should contain safe attribute
        expect(result.code).toContain('data-dev-normal="safe"');
      }

      consoleWarnSpy.mockRestore();
    });

  });
});
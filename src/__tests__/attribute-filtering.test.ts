// src/__tests__/attribute-filtering.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../plugin';

describe('Attribute Filtering', () => {
  const basicCode = `
    export function Button() {
      return <button className="btn">Click me</button>;
    }
  `;

  describe('includeAttributes (allowlist)', () => {
    it('should only include specified attributes when using allowlist', async () => {
      const plugin = componentDebugger({
        includeAttributes: ['id', 'name']
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should include
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-name');

        // Should NOT include
        expect(result.code).not.toContain('data-dev-path');
        expect(result.code).not.toContain('data-dev-line');
        expect(result.code).not.toContain('data-dev-file');
        expect(result.code).not.toContain('data-dev-component');
        expect(result.code).not.toContain('data-dev-metadata');
      }
    });

    it('should only include id when specified', async () => {
      const plugin = componentDebugger({
        includeAttributes: ['id']
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-id');
        expect(result.code).not.toContain('data-dev-name');
        expect(result.code).not.toContain('data-dev-path');
        expect(result.code).not.toContain('data-dev-line');
      }
    });

    it('should work with line and file attributes', async () => {
      const plugin = componentDebugger({
        includeAttributes: ['line', 'file', 'path']
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-line');
        expect(result.code).toContain('data-dev-file');
        expect(result.code).toContain('data-dev-path');
        expect(result.code).not.toContain('data-dev-id');
        expect(result.code).not.toContain('data-dev-name');
      }
    });

    it('should handle metadata attribute when props are enabled', async () => {
      const plugin = componentDebugger({
        includeAttributes: ['id', 'metadata'],
        includeProps: true
      });

      const codeWithProps = `
        export function Button() {
          return <button className="primary" disabled>Click</button>;
        }
      `;

      const result = await plugin.transform?.(codeWithProps, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-metadata');
        expect(result.code).not.toContain('data-dev-name');
        expect(result.code).not.toContain('data-dev-path');
      }
    });

    it('should not include metadata when not in allowlist even if includeProps is true', async () => {
      const plugin = componentDebugger({
        includeAttributes: ['id', 'name'],
        includeProps: true
      });

      const codeWithProps = `
        export function Button() {
          return <button className="primary">Click</button>;
        }
      `;

      const result = await plugin.transform?.(codeWithProps, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-name');
        expect(result.code).not.toContain('data-dev-metadata');
      }
    });
  });

  describe('excludeAttributes (disallowlist)', () => {
    it('should exclude specified attributes when using disallowlist', async () => {
      const plugin = componentDebugger({
        excludeAttributes: ['metadata', 'file', 'component']
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Should include
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-name');
        expect(result.code).toContain('data-dev-path');
        expect(result.code).toContain('data-dev-line');

        // Should NOT include
        expect(result.code).not.toContain('data-dev-file');
        expect(result.code).not.toContain('data-dev-component');
        expect(result.code).not.toContain('data-dev-metadata');
      }
    });

    it('should exclude only id when specified', async () => {
      const plugin = componentDebugger({
        excludeAttributes: ['id']
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).not.toContain('data-dev-id');
        expect(result.code).toContain('data-dev-name');
        expect(result.code).toContain('data-dev-path');
        expect(result.code).toContain('data-dev-line');
      }
    });

    it('should exclude name and component attributes', async () => {
      const plugin = componentDebugger({
        excludeAttributes: ['name', 'component']
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-id');
        expect(result.code).not.toContain('data-dev-name');
        expect(result.code).not.toContain('data-dev-component');
        expect(result.code).toContain('data-dev-path');
      }
    });
  });

  describe('Priority and edge cases', () => {
    it('should prioritize includeAttributes over excludeAttributes', async () => {
      const plugin = componentDebugger({
        includeAttributes: ['id', 'name'],
        excludeAttributes: ['name', 'path'] // name is in both, should be included
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-name'); // Should be included due to allowlist
        expect(result.code).not.toContain('data-dev-path');
        expect(result.code).not.toContain('data-dev-line');
      }
    });

    it('should include all attributes when neither option is specified', async () => {
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

    it('should handle empty includeAttributes array', async () => {
      const plugin = componentDebugger({
        includeAttributes: []
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      // Should still transform but with no attributes
      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).not.toContain('data-dev-id');
        expect(result.code).not.toContain('data-dev-name');
        expect(result.code).toContain('Click me'); // Code should still be there
      }
    });

    it('should handle empty excludeAttributes array', async () => {
      const plugin = componentDebugger({
        excludeAttributes: []
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      // Should include all attributes (empty disallowlist excludes nothing)
      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-name');
        expect(result.code).toContain('data-dev-path');
      }
    });
  });

  describe('Combined with other options', () => {
    it('should work with custom attributePrefix', async () => {
      const plugin = componentDebugger({
        includeAttributes: ['id', 'name'],
        attributePrefix: 'data-test'
      });

      const result = await plugin.transform?.(basicCode, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-test-id');
        expect(result.code).toContain('data-test-name');
        expect(result.code).not.toContain('data-dev-id');
      }
    });

    it('should work with multiple elements', async () => {
      const multiElementCode = `
        export function Form() {
          return (
            <form>
              <input type="text" />
              <button>Submit</button>
            </form>
          );
        }
      `;

      const plugin = componentDebugger({
        includeAttributes: ['id', 'line']
      });

      const result = await plugin.transform?.(multiElementCode, 'Form.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        // Each element should have only id and line
        const idMatches = result.code.match(/data-dev-id/g);
        const lineMatches = result.code.match(/data-dev-line/g);
        const nameMatches = result.code.match(/data-dev-name/g);

        expect(idMatches).toHaveLength(3); // form, input, button
        expect(lineMatches).toHaveLength(3);
        expect(nameMatches).toBeNull();
      }
    });

    it('should respect attribute filtering with includeProps and includeContent', async () => {
      const plugin = componentDebugger({
        includeAttributes: ['id', 'name', 'metadata'],
        includeProps: true,
        includeContent: true
      });

      const codeWithPropsAndContent = `
        export function Button() {
          return <button className="primary" disabled>Click me</button>;
        }
      `;

      const result = await plugin.transform?.(codeWithPropsAndContent, 'Button.tsx');

      if (result && typeof result === 'object' && 'code' in result) {
        expect(result.code).toContain('data-dev-id');
        expect(result.code).toContain('data-dev-name');
        expect(result.code).toContain('data-dev-metadata');
        expect(result.code).not.toContain('data-dev-path');
        expect(result.code).not.toContain('data-dev-line');
        expect(result.code).not.toContain('data-dev-file');

        // Verify metadata contains props and content
        const metadataMatch = result.code.match(/data-dev-metadata="([^"]+)"/);
        if (metadataMatch) {
          const decoded = decodeURIComponent(metadataMatch[1]);
          const metadata = JSON.parse(decoded);
          expect(metadata.className).toBe('primary');
          expect(metadata.disabled).toBe(true);
          expect(metadata.text).toBe('Click me');
        }
      }
    });
  });
});
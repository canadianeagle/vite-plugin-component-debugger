// src/__tests__/plugin.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../plugin';

describe('componentDebugger', () => {
  it('should create a plugin with correct name', () => {
    const plugin = componentDebugger();
    expect(plugin.name).toBe('vite-plugin-component-debugger');
  });

  it('should respect enabled option', async () => {
    const plugin = componentDebugger({ enabled: false });
    const result = await plugin.transform?.('const a = <div>Test</div>', 'test.tsx');
    expect(result).toBeNull();
  });

  it('should skip non-JSX/TSX files', async () => {
    const plugin = componentDebugger();
    const result = await plugin.transform?.('const a = 1', 'test.js');
    expect(result).toBeNull();
  });

  it('should tag JSX elements', async () => {
    const plugin = componentDebugger();
    const code = `
      export function Button() {
        return <button className="btn">Click me</button>;
      }
    `;
    
    const result = await plugin.transform?.(code, 'Button.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      expect(result.code).toContain('data-dev-id');
      expect(result.code).toContain('data-dev-name="button"');
      expect(result.code).toContain('data-dev-component="button"');
      expect(result.code).toContain('Click me');
    }
  });

  it('should exclude Fragment elements', async () => {
    const plugin = componentDebugger();
    const code = `
      export function Component() {
        return <Fragment><div>Content</div></Fragment>;
      }
    `;
    
    const result = await plugin.transform?.(code, 'Component.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      expect(result.code).toContain('data-dev-name="div"');
      expect(result.code).not.toContain('data-dev-name="Fragment"');
    }
  });

  it('should respect custom attribute prefix', async () => {
    const plugin = componentDebugger({ attributePrefix: 'data-track' });
    const code = `
      export function Button() {
        return <button>Click</button>;
      }
    `;
    
    const result = await plugin.transform?.(code, 'Button.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      expect(result.code).toContain('data-track-id');
      expect(result.code).toContain('data-track-name');
      expect(result.code).not.toContain('data-dev-id');
    }
  });

  it('should include props when enabled', async () => {
    const plugin = componentDebugger({ includeProps: true });
    const code = `
      export function Button() {
        return <button className="primary" disabled>Click</button>;
      }
    `;
    
    const result = await plugin.transform?.(code, 'Button.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      expect(result.code).toContain('data-dev-metadata');
      // The metadata should contain encoded className
      expect(result.code).toContain('className');
    }
  });

  it('should exclude props when disabled', async () => {
    const plugin = componentDebugger({ includeProps: false, includeContent: false });
    const code = `
      export function Button() {
        return <button className="primary">Click</button>;
      }
    `;
    
    const result = await plugin.transform?.(code, 'Button.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      expect(result.code).not.toContain('data-dev-metadata');
    }
  });

  it('should handle member expressions', async () => {
    const plugin = componentDebugger();
    const code = `
      export function Component() {
        return <React.Fragment><Motion.div>Animated</Motion.div></React.Fragment>;
      }
    `;
    
    const result = await plugin.transform?.(code, 'Component.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      expect(result.code).toContain('data-dev-name="Motion.div"');
      expect(result.code).not.toContain('data-dev-name="React.Fragment"');
    }
  });

  it('should exclude Three.js elements by default', async () => {
    const plugin = componentDebugger();
    const code = `
      export function Scene() {
        return (
          <div>
            <mesh>
              <boxGeometry />
              <meshBasicMaterial />
            </mesh>
          </div>
        );
      }
    `;
    
    const result = await plugin.transform?.(code, 'Scene.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      expect(result.code).toContain('data-dev-name="div"');
      expect(result.code).not.toContain('data-dev-name="mesh"');
      expect(result.code).not.toContain('data-dev-name="boxGeometry"');
      expect(result.code).not.toContain('data-dev-name="meshBasicMaterial"');
    }
  });

  it('should allow tagging Three.js elements when customExcludes is empty', async () => {
    const plugin = componentDebugger({ customExcludes: new Set() });
    const code = `
      export function Scene() {
        return <mesh />;
      }
    `;
    
    const result = await plugin.transform?.(code, 'Scene.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      expect(result.code).toContain('data-dev-name="mesh"');
    }
  });
});
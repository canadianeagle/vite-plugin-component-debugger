// src/__tests__/multi-line-jsx.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../plugin';

describe('Multi-line JSX Element Handling', () => {
  it('should correctly handle multi-line JSX elements with attributes', async () => {
    const plugin = componentDebugger();
    const code = `export function TreeSelectExample() {
  return (
    <TreeSelect
      getItemId={(item) => item.guid}
      getItemChildren={(item) => item.children}
      onSelect={(item) => console.log(item)}
      className="tree-select-container"
    >
      <TreeItem value="1">Item 1</TreeItem>
    </TreeSelect>
  );
}`;

    const result = await plugin.transform?.(code, 'TreeSelect.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      // Check that the code is valid JavaScript/JSX
      expect(() => {
        // This would throw if the syntax is invalid
        const babel = require('@babel/parser');
        babel.parse(result.code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        });
      }).not.toThrow();
      
      // Verify attributes are added
      expect(result.code).toContain('data-dev-name="TreeSelect"');
      expect(result.code).toContain('data-dev-name="TreeItem"');
      
      // Verify the original attributes are preserved
      expect(result.code).toContain('getItemId={(item) => item.guid}');
      expect(result.code).toContain('getItemChildren={(item) => item.children}');
      expect(result.code).toContain('className="tree-select-container"');
      
      // Verify line numbers
      expect(result.code).toMatch(/data-dev-name="TreeSelect"[^>]*data-dev-line="3"/);
      expect(result.code).toMatch(/data-dev-name="TreeItem"[^>]*data-dev-line="9"/);
    }
  });

  it('should handle self-closing multi-line JSX elements', async () => {
    const plugin = componentDebugger();
    const code = `function SelfClosingExample() {
  return (
    <CustomInput
      type="text"
      placeholder="Enter text"
      onChange={(e) => console.log(e.target.value)}
      className="input-field"
      disabled={false}
    />
  );
}`;

    const result = await plugin.transform?.(code, 'SelfClosing.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      // Verify syntax is valid
      expect(() => {
        const babel = require('@babel/parser');
        babel.parse(result.code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        });
      }).not.toThrow();
      
      // Verify attributes are added
      expect(result.code).toContain('data-dev-name="CustomInput"');
      expect(result.code).toMatch(/data-dev-name="CustomInput"[^>]*data-dev-line="3"/);
      
      // Verify it's still self-closing
      expect(result.code).toContain('/>');
      
      // Ensure attributes are inserted before the self-closing tag
      const regex = /data-dev-component="CustomInput"\/>/;
      expect(result.code).toMatch(regex);
    }
  });

  it('should handle JSX elements with spread attributes', async () => {
    const plugin = componentDebugger();
    const code = `function SpreadExample() {
  const props = { className: 'btn', onClick: () => {} };
  
  return (
    <button
      {...props}
      id="submit-btn"
      disabled
    >
      Submit
    </button>
  );
}`;

    const result = await plugin.transform?.(code, 'Spread.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      // Verify syntax is valid
      expect(() => {
        const babel = require('@babel/parser');
        babel.parse(result.code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        });
      }).not.toThrow();
      
      // Verify attributes are added
      expect(result.code).toContain('data-dev-name="button"');
      expect(result.code).toMatch(/data-dev-name="button"[^>]*data-dev-line="5"/);
      
      // Verify spread is preserved
      expect(result.code).toContain('{...props}');
    }
  });

  it('should handle JSX elements with complex nested attributes', async () => {
    const plugin = componentDebugger();
    const code = `function ComplexAttributes() {
  return (
    <Component
      style={{
        backgroundColor: 'red',
        padding: '10px',
        margin: '5px'
      }}
      data={{
        items: [1, 2, 3],
        config: {
          enabled: true
        }
      }}
      render={(item) => (
        <div>{item}</div>
      )}
    />
  );
}`;

    const result = await plugin.transform?.(code, 'Complex.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      // Verify syntax is valid
      expect(() => {
        const babel = require('@babel/parser');
        babel.parse(result.code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        });
      }).not.toThrow();
      
      // Verify attributes are added to both Component and the div in render
      expect(result.code).toContain('data-dev-name="Component"');
      expect(result.code).toContain('data-dev-name="div"');
      
      // Verify line numbers
      expect(result.code).toMatch(/data-dev-name="Component"[^>]*data-dev-line="3"/);
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="16"/);
    }
  });

  it('should handle JSX elements with comments between attributes', async () => {
    const plugin = componentDebugger();
    const code = `function WithComments() {
  return (
    <div
      className="container"
      // This is a comment
      onClick={() => {}}
      /* Multi-line
         comment */
      style={{ color: 'blue' }}
    >
      Content
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'Comments.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      // Verify syntax is valid
      expect(() => {
        const babel = require('@babel/parser');
        babel.parse(result.code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        });
      }).not.toThrow();
      
      // Verify attributes are added
      expect(result.code).toContain('data-dev-name="div"');
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="3"/);
    }
  });

  it('should handle JSX elements with spaces before closing brackets', async () => {
    const plugin = componentDebugger();
    const code = `function SpacesExample() {
  return (
    <div className="with-space" >
      <input type="text" disabled />
      <CustomComponent
        prop1="value1"
        prop2="value2"
        />
      <AnotherComponent prop="value"   />
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'Spaces.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      // Verify syntax is valid
      expect(() => {
        const babel = require('@babel/parser');
        babel.parse(result.code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        });
      }).not.toThrow();
      
      // Verify all elements are tagged
      expect(result.code).toContain('data-dev-name="div"');
      expect(result.code).toContain('data-dev-name="input"');
      expect(result.code).toContain('data-dev-name="CustomComponent"');
      expect(result.code).toContain('data-dev-name="AnotherComponent"');
      
      // Verify the original formatting is preserved (spaces may be adjusted due to attribute insertion)
      expect(result.code).toContain('className="with-space"');
      expect(result.code).toContain('disabled');
      expect(result.code).toContain('prop="value"');
    }
  });

  it('should handle JSX elements with newlines before closing brackets', async () => {
    const plugin = componentDebugger();
    const code = `function NewlinesExample() {
  return (
    <div
      className="container"
    >
      <input
        type="text"
        placeholder="Enter text"
      />
      <CustomComponent
        prop1="value1"
        prop2="value2"
        
      />
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'Newlines.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      // Verify syntax is valid
      expect(() => {
        const babel = require('@babel/parser');
        babel.parse(result.code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        });
      }).not.toThrow();
      
      // Verify all elements are tagged
      expect(result.code).toContain('data-dev-name="div"');
      expect(result.code).toContain('data-dev-name="input"');
      expect(result.code).toContain('data-dev-name="CustomComponent"');
      
      // Verify line numbers are correct
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="3"/);
      expect(result.code).toMatch(/data-dev-name="input"[^>]*data-dev-line="6"/);
      expect(result.code).toMatch(/data-dev-name="CustomComponent"[^>]*data-dev-line="10"/);
    }
  });
});
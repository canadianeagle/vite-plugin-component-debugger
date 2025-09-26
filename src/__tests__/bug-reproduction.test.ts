// src/__tests__/bug-reproduction.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../plugin';

describe('Bug Reproduction: Invalid Assignment Target', () => {
  it('should fix the exact issue from the bug report with TreeSelect generics', async () => {
    const plugin = componentDebugger();
    
    // This is the exact scenario from the bug report
    const code = `
import React from 'react';
import { TreeSelect, SelectionMode } from 'some-ui-library';

interface ISearchFieldItem {
  guid: string;
  children?: ISearchFieldItem[];
}

export function SearchField() {
  const popupRootItems: ISearchFieldItem[] = [];
  
  return (
    <div>
      <Content>
        <div className={styles.popupContent}>
          <div className={styles.popupTreeview}>
            <TreeSelect<ISearchFieldItem, string>
              selectionMode={SelectionMode.Multiple}
              items={popupRootItems}
              getItemId={(item) => item.guid}
              getItemChildren={(item) => item.children}
            />
          </div>
        </div>
      </Content>
    </div>
  );
}
    `.trim();
    
    const result = await plugin.transform?.(code, 'app/shared/legacy/Components/SearchField.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== BUG REPRODUCTION TEST ===');
      console.log('BEFORE (broken):');
      console.log('<TreeSelect data-attributes<ISearchFieldItem, string>'); // Invalid syntax
      console.log('\nAFTER (fixed):');
      console.log('TRANSFORMED CODE:');
      console.log(result.code);
      
      // Verify the fix: TreeSelect with generics should have data attributes AFTER the generics
      expect(result.code).toContain('TreeSelect<ISearchFieldItem, string>');
      expect(result.code).toContain('data-dev-name="TreeSelect"');
      
      // The critical test: ensure data attributes come AFTER the generic parameters
      const treeSelectMatch = result.code.match(/TreeSelect<[^>]+>\s+data-dev-id/);
      expect(treeSelectMatch).toBeTruthy();
      
      // Ensure we don't have the broken pattern where attributes come before generics
      const brokenPattern = result.code.match(/TreeSelect\s+data-dev-[^<]*<[^>]+>/);
      expect(brokenPattern).toBeFalsy();
    }
  });

  it('should handle various generic patterns without causing syntax errors', async () => {
    const plugin = componentDebugger();
    
    // Test different valid generic patterns
    const testCases = [
      {
        name: 'Simple generic',
        code: 'function Test() { return <Component<T> prop="value" />; }',
        expectedPattern: /Component<T>\s+data-dev-/
      },
      {
        name: 'Multiple generics',
        code: 'function Test() { return <Generic<A, B> prop="value" />; }',
        expectedPattern: /Generic<A, B>\s+data-dev-/
      },
      {
        name: 'Nested generics',
        code: 'function Test() { return <Nested<Array<T>> prop="value" />; }',
        expectedPattern: /Nested<Array<T>>\s+data-dev-/
      },
    ];
    
    for (const testCase of testCases) {
      const result = await plugin.transform?.(testCase.code, 'test.tsx');
      
      if (result && typeof result === 'object' && 'code' in result) {
        // Should contain the proper pattern: generics followed by data attributes
        expect(result.code).toMatch(testCase.expectedPattern);
        
        console.log(`✅ ${testCase.name}:`, result.code.trim());
      }
    }
  });
  
  it('should preserve exact original syntax while adding attributes correctly', async () => {
    const plugin = componentDebugger();
    
    const code = `
export function PreserveSyntax() {
  return (
    <div>
      {/* This exact pattern was causing "Invalid assignment target" */}
      <TreeSelect<ISearchFieldItem, string>
        selectionMode={SelectionMode.Multiple}
        items={popupRootItems}
        getItemId={(item) => item.guid}
        getItemChildren={(item) => item.children}
      />
    </div>
  );
}
    `;
    
    const result = await plugin.transform?.(code, 'PreserveSyntax.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== SYNTAX PRESERVATION TEST ===');
      console.log(result.code);
      
      // The generic syntax should be preserved exactly
      expect(result.code).toContain('<TreeSelect<ISearchFieldItem, string>');
      
      // And data attributes should be properly placed after it
      expect(result.code).toMatch(/TreeSelect<ISearchFieldItem, string>\s+data-dev-id/);
      
      // The transformed code should be valid TypeScript/JSX
      // (We can't compile it here, but the syntax should look correct)
      const lines = result.code.split('\n');
      const treeSelectLine = lines.find(line => line.includes('TreeSelect<'));
      
      if (treeSelectLine) {
        // Should match pattern: <ComponentName<Generics> data-attributes...
        expect(treeSelectLine).toMatch(/^\s*<TreeSelect<[^>]+>\s+data-dev-/);
      }
    }
  });
});
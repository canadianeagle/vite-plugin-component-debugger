// src/__tests__/typescript-generics.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../plugin';

describe('TypeScript Generics Support', () => {
  it('should handle JSX elements with TypeScript generic parameters', async () => {
    const plugin = componentDebugger();
    const code = `
      interface ISearchFieldItem {
        guid: string;
        children?: ISearchFieldItem[];
      }

      export function SearchField() {
        return (
          <div>
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
    
    const result = await plugin.transform?.(code, 'SearchField.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== TYPESCRIPT GENERICS TEST ===');
      console.log('TRANSFORMED CODE:');
      console.log(result.code);
      
      // The transformed code should be valid TypeScript/JSX
      // It should not break the generic syntax
      expect(result.code).toContain('TreeSelect<ISearchFieldItem, string>');
      expect(result.code).toContain('data-dev-name="TreeSelect"');
      
      // Check that the attributes are placed correctly after the generic parameters
      const treeSelectLine = result.code.split('\n').find(line => line.includes('TreeSelect'));
      expect(treeSelectLine).toMatch(/TreeSelect<ISearchFieldItem, string>\s+data-dev/);
    }
  });

  it('should handle multiple generic parameters', async () => {
    const plugin = componentDebugger();
    const code = `
      export function GenericComponent() {
        return (
          <div>
            <GenericButton<string, number, boolean>
              onClick={() => {}}
            />
            <DataTable<User, UserFilter>
              data={users}
              filter={userFilter}
            />
          </div>
        );
      }
    `;
    
    const result = await plugin.transform?.(code, 'GenericComponent.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== MULTIPLE GENERICS TEST ===');
      console.log('TRANSFORMED CODE:');
      console.log(result.code);
      
      // Should preserve generic syntax
      expect(result.code).toContain('GenericButton<string, number, boolean>');
      expect(result.code).toContain('DataTable<User, UserFilter>');
      
      // Should have data attributes
      expect(result.code).toContain('data-dev-name="GenericButton"');
      expect(result.code).toContain('data-dev-name="DataTable"');
    }
  });

  it('should handle nested generic types', async () => {
    const plugin = componentDebugger();
    const code = `
      export function NestedGenerics() {
        return (
          <div>
            <NestedComponent<Array<Record<string, number>>>
              data={nestedData}
            />
            <Map<string, Array<User>>
              entries={mapEntries}
            />
          </div>
        );
      }
    `;
    
    const result = await plugin.transform?.(code, 'NestedGenerics.tsx');
    
    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== NESTED GENERICS TEST ===');
      console.log('TRANSFORMED CODE:');
      console.log(result.code);
      
      // Should preserve nested generic syntax
      expect(result.code).toContain('NestedComponent<Array<Record<string, number>>>');
      expect(result.code).toContain('Map<string, Array<User>>');
      expect(result.code).toContain('data-dev-name="NestedComponent"');
      expect(result.code).toContain('data-dev-name="Map"');
    }
  });
});
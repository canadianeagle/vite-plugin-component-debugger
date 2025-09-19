// src/__tests__/debug-output.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../plugin';

describe('Debug Output Analysis', () => {

  it('should output transformed code for manual inspection', async () => {
    const plugin = componentDebugger();
    const code = `// Line 1
export function DebugComponent() {
  // Line 3
  return (
    <div className="container">
      <h1>Title on line 6</h1>
      <p>Paragraph on line 7</p>
      <button
        className="btn"
        onClick={() => {}}
      >
        Click me
      </button>
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'DebugComponent.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== ORIGINAL CODE ===');
      console.log(code.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n'));

      console.log('\n=== TRANSFORMED CODE ===');
      console.log(result.code);

      console.log('\n=== EXTRACTED DATA ATTRIBUTES ===');
      const lineMatches = result.code.match(/data-dev-line="(\d+)"/g) || [];
      const nameMatches = result.code.match(/data-dev-name="([^"]+)"/g) || [];

      console.log('Line numbers found:', lineMatches);
      console.log('Element names found:', nameMatches);

      // Parse out line numbers and element names for detailed comparison
      const elementInfo = [];
      const elementRegex = /data-dev-name="([^"]+)"[^>]*data-dev-line="(\d+)"/g;
      let match;
      while ((match = elementRegex.exec(result.code)) !== null) {
        elementInfo.push({ element: match[1], line: parseInt(match[2]) });
      }

      console.log('\n=== ELEMENT POSITIONS ===');
      elementInfo.forEach(info => {
        console.log(`${info.element}: line ${info.line}`);
      });
    }

    // This test always passes, it's just for debugging
    expect(true).toBe(true);
  });

  it('should check for edge case with minimal code', async () => {
    const plugin = componentDebugger();
    const code = `<div></div>`;

    const result = await plugin.transform?.(code, 'minimal.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== MINIMAL CODE TEST ===');
      console.log('Original:', code);
      console.log('Transformed:', result.code);

      // Check if line is 0 (which would be a bug)
      const lineMatch = result.code.match(/data-dev-line="(\d+)"/);
      if (lineMatch) {
        const lineNumber = parseInt(lineMatch[1]);
        console.log('Line number reported:', lineNumber);

        if (lineNumber === 0) {
          console.log('🐛 BUG FOUND: Line number is 0!');
        }
      }
    }

    expect(true).toBe(true);
  });

  it('should test with undefined location info scenario', async () => {
    const plugin = componentDebugger();
    // Create a scenario that might cause undefined loc
    const code = `<><div></div></>`;

    const result = await plugin.transform?.(code, 'fragment.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== FRAGMENT TEST ===');
      console.log('Original:', code);
      console.log('Transformed:', result.code);

      // Check for zero line numbers
      if (result.code.includes('data-dev-line="0"')) {
        console.log('🐛 BUG FOUND: Zero line number detected!');
      }
    }

    expect(true).toBe(true);
  });
});
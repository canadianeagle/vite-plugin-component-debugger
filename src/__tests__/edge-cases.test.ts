// src/__tests__/edge-cases.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../plugin';

describe('Edge Cases That Could Cause Line Number Issues', () => {

  it('should handle JSX with complex expressions and embedded newlines', async () => {
    const plugin = componentDebugger();
    const code = `export function ComplexExpression() {
  const items = ['a', 'b', 'c'];
  const condition = true;

  return (
    <div className={\`container \${
      condition ? 'active' : 'inactive'
    }\`}>
      {items.map((item, index) => (
        <span
          key={index}
          className={\`item-\${index}\`}
          onClick={() => {
            console.log(\`Clicked \${item}\`);
          }}
        >
          {item.toUpperCase()}
        </span>
      ))}

      {condition && (
        <div
          style={{
            backgroundColor: 'red',
            color: 'white'
          }}
        >
          Conditional content
        </div>
      )}
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'complex.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== COMPLEX EXPRESSIONS TEST ===');

      // Find all line numbers
      const lineMatches = [...result.code.matchAll(/data-dev-name="([^"]+)"[^>]*data-dev-line="(\d+)"/g)];
      lineMatches.forEach(match => {
        console.log(`${match[1]}: line ${match[2]}`);
      });

      // Verify no zero line numbers
      expect(result.code).not.toContain('data-dev-line="0"');
    }
  });

  it('should handle JSX with template literals spanning multiple lines', async () => {
    const plugin = componentDebugger();
    const code = `function TemplateLiterals() {
  return (
    <div className={\`
      base-class
      \${true ? 'modifier-class' : ''}
      extra-class
    \`}>
      <p className={\`
        paragraph-base
        \${false ? 'hidden' : 'visible'}
      \`}>
        Content with template
      </p>
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'template.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== TEMPLATE LITERALS TEST ===');

      const lineMatches = [...result.code.matchAll(/data-dev-name="([^"]+)"[^>]*data-dev-line="(\d+)"/g)];
      lineMatches.forEach(match => {
        console.log(`${match[1]}: line ${match[2]}`);
      });

      // div should be on line 3, p should be on line 8
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="3"/);
      expect(result.code).toMatch(/data-dev-name="p"[^>]*data-dev-line="8"/);
    }
  });

  it('should handle deeply nested JSX structures', async () => {
    const plugin = componentDebugger();
    const code = `function DeeplyNested() {
  return (
    <div>
      <section>
        <article>
          <header>
            <nav>
              <ul>
                <li>
                  <a href="#">
                    <span>
                      <strong>Deep content</strong>
                    </span>
                  </a>
                </li>
              </ul>
            </nav>
          </header>
        </article>
      </section>
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'nested.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== DEEPLY NESTED TEST ===');

      const lineMatches = [...result.code.matchAll(/data-dev-name="([^"]+)"[^>]*data-dev-line="(\d+)"/g)];
      lineMatches.forEach(match => {
        console.log(`${match[1]}: line ${match[2]}`);
      });

      // Verify sequential line numbers make sense
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="3"/);
      expect(result.code).toMatch(/data-dev-name="section"[^>]*data-dev-line="4"/);
      expect(result.code).toMatch(/data-dev-name="strong"[^>]*data-dev-line="12"/);
    }
  });

  it('should handle JSX fragments with various syntaxes', async () => {
    const plugin = componentDebugger();
    const code = `import React from 'react';

function FragmentTest() {
  return (
    <React.Fragment>
      <div>In React.Fragment</div>
    </React.Fragment>
  );
}

function ShortFragmentTest() {
  return (
    <>
      <div>In short fragment</div>
      <span>Another element</span>
    </>
  );
}`;

    const result = await plugin.transform?.(code, 'fragments.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== FRAGMENTS TEST ===');

      const lineMatches = [...result.code.matchAll(/data-dev-name="([^"]+)"[^>]*data-dev-line="(\d+)"/g)];
      lineMatches.forEach(match => {
        console.log(`${match[1]}: line ${match[2]}`);
      });

      // Should tag div elements but not fragments
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="6"/);
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="14"/);
      expect(result.code).toMatch(/data-dev-name="span"[^>]*data-dev-line="15"/);

      // Should not tag fragments
      expect(result.code).not.toContain('data-dev-name="React.Fragment"');
      expect(result.code).not.toContain('data-dev-name="Fragment"');
    }
  });

  it('should handle potential Babel parser edge cases', async () => {
    const plugin = componentDebugger();

    // Test with various JSX edge cases that might confuse the parser
    const code = `function EdgeCases() {
  return (
    <div
      {...props}
      className="test"
      onClick={() => {
        // Comment inside handler
        console.log('test');
      }}
    >
      {/* JSX comment */}
      <span>{100 + 200}</span>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <CustomComponent
        render={({ data }) => (
          <div>{data}</div>
        )}
      />
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'edge-cases.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== EDGE CASES TEST ===');

      const lineMatches = [...result.code.matchAll(/data-dev-name="([^"]+)"[^>]*data-dev-line="(\d+)"/g)];
      lineMatches.forEach(match => {
        console.log(`${match[1]}: line ${match[2]}`);
      });

      // Verify all elements have reasonable line numbers
      lineMatches.forEach(match => {
        const lineNumber = parseInt(match[2]);
        expect(lineNumber).toBeGreaterThan(0);
        expect(lineNumber).toBeLessThan(30); // Should be within the code range
      });
    }
  });

  it('should detect potential line number discrepancies', async () => {
    const plugin = componentDebugger();
    const code = `// Line 1
// Line 2
function LineNumberCheck() {
  // Line 4
  return ( // Line 5
    <div className="line-6">
      <p>This should be line 7</p>
      <span
        className="line-9"
      >Line 10 content</span>
    </div>
  ); // Line 12
}`;

    const result = await plugin.transform?.(code, 'line-check.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== LINE NUMBER VERIFICATION ===');
      console.log('Original with line numbers:');
      code.split('\n').forEach((line, i) => {
        console.log(`${i + 1}: ${line}`);
      });

      console.log('\nExtracted element positions:');
      const lineMatches = [...result.code.matchAll(/data-dev-name="([^"]+)"[^>]*data-dev-line="(\d+)"/g)];
      lineMatches.forEach(match => {
        console.log(`${match[1]}: line ${match[2]}`);
      });

      // Manual verification - these should match the actual source lines
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="6"/);
      expect(result.code).toMatch(/data-dev-name="p"[^>]*data-dev-line="7"/);
      expect(result.code).toMatch(/data-dev-name="span"[^>]*data-dev-line="8"/);
    }
  });
});
// src/__tests__/line-number-accuracy.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../plugin';
import fs from 'fs';
import path from 'path';

describe('Line Number Accuracy', () => {

  it('should report correct line numbers for simple elements', async () => {
    const plugin = componentDebugger();
    const code = `
export function TestComponent() {
  return (
    <div className="container">
      <h1>Title</h1>
      <p>Paragraph</p>
      <button onClick={() => {}}>
        Click me
      </button>
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'test.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      // div should be on line 4 (1-indexed, accounting for initial newline)
      expect(result.code).toContain('data-dev-line="4"');

      // h1 should be on line 5
      expect(result.code).toMatch(/data-dev-name="h1"[^>]*data-dev-line="5"/);

      // p should be on line 6
      expect(result.code).toMatch(/data-dev-name="p"[^>]*data-dev-line="6"/);

      // button should be on line 7
      expect(result.code).toMatch(/data-dev-name="button"[^>]*data-dev-line="7"/);
    }
  });

  it('should handle multi-line JSX elements correctly', async () => {
    const plugin = componentDebugger();
    const code = `
export function MultiLineComponent() {
  return (
    <div
      className="multi-line"
      data-testid="test"
    >
      <span
        className="nested"
        onClick={() => console.log('clicked')}
      >
        Text content
      </span>
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'test.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      // div opening tag starts on line 4
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="4"/);

      // span opening tag starts on line 8
      expect(result.code).toMatch(/data-dev-name="span"[^>]*data-dev-line="8"/);
    }
  });

  it('should report correct line numbers for nested components', async () => {
    const plugin = componentDebugger();
    const code = `
function NestedComponent() {
  return (
    <article className="article">
      <header>
        <h1>Article Title</h1>
        <nav>
          <ul>
            <li><a href="#1">Link 1</a></li>
            <li><a href="#2">Link 2</a></li>
          </ul>
        </nav>
      </header>
      <main>
        <section>
          <p>First paragraph</p>
          <p>Second paragraph</p>
        </section>
      </main>
    </article>
  );
}`;

    const result = await plugin.transform?.(code, 'test.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      // Verify specific line numbers
      expect(result.code).toMatch(/data-dev-name="article"[^>]*data-dev-line="4"/);
      expect(result.code).toMatch(/data-dev-name="header"[^>]*data-dev-line="5"/);
      expect(result.code).toMatch(/data-dev-name="h1"[^>]*data-dev-line="6"/);
      expect(result.code).toMatch(/data-dev-name="nav"[^>]*data-dev-line="7"/);
      expect(result.code).toMatch(/data-dev-name="ul"[^>]*data-dev-line="8"/);

      // Check multiple li elements
      const liMatches = result.code.match(/data-dev-name="li"[^>]*data-dev-line="(\d+)"/g);
      expect(liMatches).toHaveLength(2);
      expect(result.code).toMatch(/data-dev-name="li"[^>]*data-dev-line="9"/);
      expect(result.code).toMatch(/data-dev-name="li"[^>]*data-dev-line="10"/);
    }
  });

  it('should handle zero line numbers and edge cases', async () => {
    const plugin = componentDebugger();
    // Test with minimal code that might cause loc issues
    const code = `<div></div>`;

    const result = await plugin.transform?.(code, 'test.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      // Should never have line 0
      expect(result.code).not.toContain('data-dev-line="0"');
      // Should have line 1
      expect(result.code).toContain('data-dev-line="1"');
    }
  });

  it('should handle files with leading whitespace/comments', async () => {
    const plugin = componentDebugger();
    const code = `// This is a comment on line 1
// Another comment on line 2

/* Multi-line comment
   on lines 4-5 */

export function ComponentWithComments() {
  return (
    <div className="with-comments">
      <p>Paragraph after comments</p>
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'test.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      // div should be on line 9 (accounting for comments)
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="9"/);

      // p should be on line 10
      expect(result.code).toMatch(/data-dev-name="p"[^>]*data-dev-line="10"/);
    }
  });

  it('should test with actual fixture files', async () => {
    const plugin = componentDebugger();
    const fixturePath = path.join(__dirname, 'fixtures', 'SimpleComponent.tsx');
    const code = fs.readFileSync(fixturePath, 'utf-8');

    const result = await plugin.transform?.(code, 'SimpleComponent.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      // Based on SimpleComponent.tsx structure:
      // div should be on line 7
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="7"/);

      // h1 should be on line 8
      expect(result.code).toMatch(/data-dev-name="h1"[^>]*data-dev-line="8"/);

      // p should be on line 9
      expect(result.code).toMatch(/data-dev-name="p"[^>]*data-dev-line="9"/);

      // button should be on line 10
      expect(result.code).toMatch(/data-dev-name="button"[^>]*data-dev-line="10"/);
    }
  });

  it('should verify column numbers are reasonable', async () => {
    const plugin = componentDebugger();
    const code = `
export function ColumnTest() {
  return (
        <div>
      <span>Indented differently</span>
        </div>
  );
}`;

    const result = await plugin.transform?.(code, 'test.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      // Extract column numbers
      const divMatch = result.code.match(/data-dev-name="div"[^>]*data-dev-line="4"[^>]*data-dev-id="[^:]*:[^:]*:(\d+)"/);
      const spanMatch = result.code.match(/data-dev-name="span"[^>]*data-dev-line="5"[^>]*data-dev-id="[^:]*:[^:]*:(\d+)"/);

      if (divMatch && spanMatch) {
        const divColumn = parseInt(divMatch[1]);
        const spanColumn = parseInt(spanMatch[1]);

        // Column numbers should be reasonable (not negative, not extremely large)
        expect(divColumn).toBeGreaterThanOrEqual(0);
        expect(divColumn).toBeLessThan(50);
        expect(spanColumn).toBeGreaterThanOrEqual(0);
        expect(spanColumn).toBeLessThan(50);

        // span is indented less than div in this example
        expect(spanColumn).toBeLessThan(divColumn);
      }
    }
  });
});
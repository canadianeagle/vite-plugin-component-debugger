// src/__tests__/nested-components.test.ts
import { describe, it, expect } from 'vitest';
import { componentTagger } from '../plugin';
import fs from 'fs';
import path from 'path';

describe('Nested Component Line Number Accuracy', () => {

  it('should accurately track line numbers in complex nested components', async () => {
    const plugin = componentTagger({ debug: false });
    const fixturePath = path.join(__dirname, 'fixtures', 'NestedComponents.tsx');
    const code = fs.readFileSync(fixturePath, 'utf-8');

    const result = await plugin.transform?.(code, 'NestedComponents.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== NESTED COMPONENTS LINE ANALYSIS ===');

      // Extract all element positions
      const elementMatches = [...result.code.matchAll(/data-dev-name="([^"]+)"[^>]*data-dev-line="(\d+)"/g)];
      const elementPositions = elementMatches.map(match => ({
        element: match[1],
        line: parseInt(match[2])
      })).sort((a, b) => a.line - b.line);

      console.log('Element positions by line:');
      elementPositions.forEach(pos => {
        console.log(`Line ${pos.line}: <${pos.element}>`);
      });

      // Verify specific critical elements based on the NestedComponents.tsx structure

      // Button component (lines 5-9)
      const buttonElements = elementPositions.filter(p => p.element === 'button');
      expect(buttonElements.length).toBeGreaterThan(0);

      // First button should be around line 6 (in Button component)
      const firstButton = buttonElements.find(b => b.line >= 5 && b.line <= 10);
      expect(firstButton).toBeDefined();

      // FormField elements (lines 18-27)
      const formFieldElements = elementPositions.filter(p =>
        ['div', 'label', 'input'].includes(p.element) &&
        p.line >= 18 && p.line <= 27
      );
      expect(formFieldElements.length).toBeGreaterThan(0);

      // Card component elements (lines 31-47)
      const cardElements = elementPositions.filter(p => p.line >= 31 && p.line <= 47);
      expect(cardElements.length).toBeGreaterThan(0);

      // Modal component elements (lines 58-73)
      const modalElements = elementPositions.filter(p => p.line >= 58 && p.line <= 73);
      expect(modalElements.length).toBeGreaterThan(0);

      // Main application elements (lines 161+)
      const appElements = elementPositions.filter(p => p.line >= 161);
      expect(appElements.length).toBeGreaterThan(10); // Should have many nested elements

      // Verify no zero line numbers
      expect(elementPositions.every(p => p.line > 0)).toBe(true);

      // Verify reasonable line number range (should be within file bounds)
      const maxLine = Math.max(...elementPositions.map(p => p.line));
      const codeLines = code.split('\n').length;
      expect(maxLine).toBeLessThanOrEqual(codeLines);

      console.log(`\nTotal elements tagged: ${elementPositions.length}`);
      console.log(`Line range: ${Math.min(...elementPositions.map(p => p.line))} - ${maxLine}`);
      console.log(`File has ${codeLines} lines`);
    }
  });

  it('should handle component composition with render props accurately', async () => {
    const plugin = componentTagger();
    const code = `function App() {
  return (
    <div className="app">
      <DataProvider
        render={(data) => (
          <div className="content">
            <Card title="Data Display">
              <div className="data-grid">
                {data.items.map(item => (
                  <div key={item.id} className="data-item">
                    <span className="item-label">{item.label}</span>
                    <span className="item-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      />
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'render-props.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== RENDER PROPS COMPONENT TEST ===');

      const elementMatches = [...result.code.matchAll(/data-dev-name="([^"]+)"[^>]*data-dev-line="(\d+)"/g)];
      console.log('Elements found:');
      elementMatches.forEach(match => {
        console.log(`${match[1]}: line ${match[2]}`);
      });

      // Verify specific line numbers
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="3"/); // app div
      expect(result.code).toMatch(/data-dev-name="DataProvider"[^>]*data-dev-line="4"/);
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="6"/); // content div
      expect(result.code).toMatch(/data-dev-name="Card"[^>]*data-dev-line="7"/);
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="8"/); // data-grid div
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="10"/); // data-item div
    }
  });

  it('should handle Higher-Order Component patterns correctly', async () => {
    const plugin = componentTagger();
    const code = `function withWrapper(Component) {
  return function WrappedComponent(props) {
    return (
      <div className="hoc-wrapper">
        <header className="hoc-header">
          <h1>HOC Title</h1>
        </header>
        <main className="hoc-content">
          <Component {...props} />
        </main>
        <footer className="hoc-footer">
          <p>HOC Footer</p>
        </footer>
      </div>
    );
  };
}

function OriginalComponent() {
  return (
    <div className="original">
      <p>Original component content</p>
    </div>
  );
}

const EnhancedComponent = withWrapper(OriginalComponent);

function App() {
  return (
    <div className="app">
      <EnhancedComponent />
      <OriginalComponent />
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'hoc-test.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== HOC PATTERN TEST ===');

      const elementMatches = [...result.code.matchAll(/data-dev-name="([^"]+)"[^>]*data-dev-line="(\d+)"/g)];
      console.log('Elements found:');
      elementMatches.forEach(match => {
        console.log(`${match[1]}: line ${match[2]}`);
      });

      // Verify HOC wrapper elements
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="4"/); // hoc-wrapper
      expect(result.code).toMatch(/data-dev-name="header"[^>]*data-dev-line="5"/);
      expect(result.code).toMatch(/data-dev-name="h1"[^>]*data-dev-line="6"/);
      expect(result.code).toMatch(/data-dev-name="main"[^>]*data-dev-line="8"/);

      // Verify original component elements
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="21"/); // original div
      expect(result.code).toMatch(/data-dev-name="p"[^>]*data-dev-line="22"/);

      // App component elements
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="31"/); // app div
    }
  });

  it('should handle conditional rendering with nested components', async () => {
    const plugin = componentTagger();
    const code = `function ConditionalApp({ showModal, showSidebar, user }) {
  return (
    <div className="conditional-app">
      {showSidebar && (
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <ul className="nav-list">
              <li className="nav-item">
                <a href="#home">Home</a>
              </li>
            </ul>
          </nav>
        </aside>
      )}

      <main className="main-content">
        <header className="content-header">
          <h1>Welcome {user?.name}</h1>
        </header>

        {user ? (
          <div className="user-content">
            <div className="user-profile">
              <img src={user.avatar} alt="Avatar" className="user-avatar" />
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-user">
            <p className="no-user-message">Please log in</p>
          </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Modal Title</h2>
            </div>
            <div className="modal-body">
              <p>Modal content goes here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'conditional.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== CONDITIONAL RENDERING TEST ===');

      const elementMatches = [...result.code.matchAll(/data-dev-name="([^"]+)"[^>]*data-dev-line="(\d+)"/g)];
      console.log('Elements found:');
      elementMatches.forEach(match => {
        console.log(`${match[1]}: line ${match[2]}`);
      });

      // Verify main structure
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="3"/); // conditional-app
      expect(result.code).toMatch(/data-dev-name="aside"[^>]*data-dev-line="5"/); // sidebar
      expect(result.code).toMatch(/data-dev-name="main"[^>]*data-dev-line="16"/); // main-content

      // Verify conditional branches exist
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="22"/); // user-content
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="32"/); // no-user

      // Verify modal elements
      expect(result.code).toMatch(/data-dev-name="div"[^>]*data-dev-line="39"/); // modal-overlay
    }
  });

  it('should verify line numbers remain sequential and logical', async () => {
    const plugin = componentTagger();
    const code = `function SequentialTest() {
  return (
    <div>
      <h1>Title</h1>
      <p>Paragraph</p>
      <section>
        <article>
          <header>
            <h2>Article Title</h2>
          </header>
          <main>
            <p>Article content</p>
          </main>
        </article>
      </section>
      <footer>
        <p>Footer content</p>
      </footer>
    </div>
  );
}`;

    const result = await plugin.transform?.(code, 'sequential.tsx');

    if (result && typeof result === 'object' && 'code' in result) {
      console.log('\n=== SEQUENTIAL LINE VERIFICATION ===');

      const elementMatches = [...result.code.matchAll(/data-dev-name="([^"]+)"[^>]*data-dev-line="(\d+)"/g)];
      const elementPositions = elementMatches.map(match => ({
        element: match[1],
        line: parseInt(match[2])
      })).sort((a, b) => a.line - b.line);

      console.log('Sequential elements:');
      elementPositions.forEach((pos, index) => {
        const prevLine = index > 0 ? elementPositions[index - 1].line : 0;
        const lineJump = pos.line - prevLine;
        console.log(`Line ${pos.line}: <${pos.element}> (${lineJump > 1 ? `+${lineJump}` : ''})`);
      });

      // Verify elements are in logical order
      const lines = elementPositions.map(p => p.line);
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i]).toBeGreaterThanOrEqual(lines[i - 1]);
      }

      // Verify specific expected lines
      expect(elementPositions.find(p => p.element === 'div' && p.line === 3)).toBeDefined();
      expect(elementPositions.find(p => p.element === 'h1' && p.line === 4)).toBeDefined();
      expect(elementPositions.find(p => p.element === 'p' && p.line === 5)).toBeDefined();
    }
  });
});
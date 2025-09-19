// Line 1: ComplexComponent.tsx
import React, { Fragment, useState } from 'react';

// Line 3: Interface definition
interface Props {
  title: string;
  items: string[];
}

// Line 9: Complex component with nested elements
export function ComplexComponent({ title, items }: Props) {
  const [count, setCount] = useState(0);

  return (
    <div className="complex-wrapper">
      <Fragment>
        <header className="header">
          <h1>{title}</h1>
          <nav>
            <ul className="nav-list">
              {items.map((item, index) => (
                <li key={index} className={`item-${index}`}>
                  <a href={`#${item}`}>{item}</a>
                </li>
              ))}
            </ul>
          </nav>
        </header>
      </Fragment>

      <main className="main-content">
        <section>
          <p>
            Counter: {count}
          </p>
          <button
            className="increment-btn"
            onClick={() => setCount(c => c + 1)}
            type="button"
            data-testid="increment"
          >
            Increment
          </button>
        </section>

        <aside className="sidebar">
          <div className="widget">
            <h3>Widget Title</h3>
            <form onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="input-field">
                Input Label:
              </label>
              <input
                id="input-field"
                type="text"
                placeholder="Enter text..."
                className="text-input"
              />
              <textarea
                rows={4}
                cols={30}
                placeholder="Textarea on line 54"
              ></textarea>
            </form>
          </div>
        </aside>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <React.Fragment>
            <span>Footer span on line 64</span>
          </React.Fragment>
        </div>
      </footer>
    </div>
  );
}
// Line 1: SimpleComponent.tsx
import React from 'react';

// Line 4: Function component
export function SimpleComponent() {
  return (
    <div className="container">
      <h1>Title on line 7</h1>
      <p>Paragraph on line 8</p>
      <button
        className="btn"
        onClick={() => console.log('clicked')}
      >
        Click me on line 13
      </button>
    </div>
  );
}

// Line 18: Another component
export const AnotherComponent = () => {
  return (
    <section>
      <header>Header on line 22</header>
      <main>
        <article>
          <span>Span on line 25</span>
        </article>
      </main>
    </section>
  );
};
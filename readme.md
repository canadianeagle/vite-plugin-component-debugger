# vite-plugin-component-debugger

A Vite plugin that automatically adds data attributes to JSX/TSX elements during development, making it easier to track, debug, and understand component rendering in your React applications.

## Features

- 🏷️ **Automatic Tagging**: Adds data attributes to JSX/TSX elements with component information
- 📍 **Location Tracking**: Includes file path, line number, and column for each component
- 📦 **Props Collection**: Optionally captures component props in the metadata
- 📝 **Content Extraction**: Can include text content from components
- 🎯 **Selective Tagging**: Configurable exclusion rules for specific elements
- ⚡ **Performance Focused**: Minimal impact on build times
- 🔧 **Fully Configurable**: Extensive options for customization

## Installation

```bash
npm install --save-dev vite-plugin-component-debugger
```

or

```bash
yarn add -D vite-plugin-component-debugger
```

or

```bash
pnpm add -D vite-plugin-component-debugger
```

## Usage

### Basic Setup

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import componentTagger from 'vite-plugin-component-debugger';

export default defineConfig({
  plugins: [
    react(),
    componentTagger()
  ]
});
```

### With Configuration

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import componentTagger from 'vite-plugin-component-debugger';

export default defineConfig({
  plugins: [
    react(),
    componentTagger({
      // Custom prefix for data attributes
      attributePrefix: 'data-dev',
      
      // File extensions to process
      extensions: ['.jsx', '.tsx'],
      
      // Elements to exclude from tagging
      excludeElements: ['Fragment', 'React.Fragment'],
      
      // Include component props in metadata
      includeProps: true,
      
      // Include text content
      includeContent: true,
      
      // Custom elements to exclude (e.g., Three.js elements)
      customExcludes: new Set(['mesh', 'group', 'camera']),
      
      // Enable/disable the plugin
      enabled: process.env.NODE_ENV === 'development'
    })
  ]
});
```

## Output Example

Given this React component:

```jsx
// src/components/Button.tsx (line 10)
<button className="btn-primary" onClick={handleClick}>
  Click me
</button>
```

The plugin will transform it to:

```jsx
<button 
  data-dev-id="src/components/Button.tsx:10:2"
  data-dev-name="button"
  data-dev-path="src/components/Button.tsx"
  data-dev-line="10"
  data-dev-file="Button.tsx"
  data-dev-component="button"
  data-dev-metadata="%7B%22className%22%3A%22btn-primary%22%2C%22text%22%3A%22Click%20me%22%7D"
  className="btn-primary" 
  onClick={handleClick}
>
  Click me
</button>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable the plugin |
| `extensions` | `string[]` | `['.jsx', '.tsx']` | File extensions to process |
| `attributePrefix` | `string` | `'data-dev'` | Prefix for data attributes |
| `excludeElements` | `string[]` | `['Fragment', 'React.Fragment']` | Elements to exclude from tagging |
| `includeProps` | `boolean` | `true` | Include component props in metadata |
| `includeContent` | `boolean` | `true` | Include text content in metadata |
| `customExcludes` | `Set<string>` | Three.js elements | Custom elements to exclude |

## Use Cases

### 1. Development Debugging

Quickly identify which component rendered which element in the DOM:

```javascript
// In browser console
document.querySelectorAll('[data-dev-component="Button"]')
  .forEach(el => {
    console.log(`Button at ${el.dataset.devPath}:${el.dataset.devLine}`);
  });
```

### 2. Automated Testing

Use the data attributes in your E2E tests:

```javascript
// Cypress example
cy.get('[data-dev-component="SubmitButton"]').click();
cy.get('[data-dev-path*="LoginForm"]').should('be.visible');
```

### 3. Performance Monitoring

Track component render locations:

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.dataset?.devId) {
          console.log(`Component added: ${node.dataset.devId}`);
        }
      });
    }
  });
});
```

### 4. Visual Debugging Tools

Build custom debugging overlays:

```javascript
// Show component boundaries on hover
document.addEventListener('mouseover', (e) => {
  const target = e.target;
  if (target.dataset?.devComponent) {
    target.style.outline = '2px solid red';
    console.log(`Component: ${target.dataset.devComponent}`);
    console.log(`Location: ${target.dataset.devPath}:${target.dataset.devLine}`);
  }
});
```

## Environment-based Configuration

Only enable in development:

```typescript
export default defineConfig({
  plugins: [
    react(),
    componentTagger({
      enabled: process.env.NODE_ENV === 'development'
    })
  ]
});
```

Or with different configs per environment:

```typescript
const isDev = process.env.NODE_ENV === 'development';
const isStaging = process.env.NODE_ENV === 'staging';

export default defineConfig({
  plugins: [
    react(),
    componentTagger({
      enabled: isDev || isStaging,
      attributePrefix: isStaging ? 'data-staging' : 'data-dev',
      includeProps: isDev, // Only include props in development
    })
  ]
});
```

## Working with React Three Fiber

The plugin automatically excludes Three.js/React Three Fiber elements by default:

```typescript
componentTagger({
  // These are excluded by default:
  customExcludes: new Set([
    'mesh', 'group', 'scene', 'camera',
    'ambientLight', 'directionalLight', 'pointLight',
    'boxGeometry', 'sphereGeometry', 'planeGeometry',
    'meshBasicMaterial', 'meshStandardMaterial',
    // ... and many more
  ])
});
```

To include them:

```typescript
componentTagger({
  customExcludes: new Set() // Empty set to tag everything
});
```

## Build Statistics

The plugin provides build statistics in the console:

```
📊 Component Debugger Statistics:
   Total files scanned: 45
   Files processed: 32
   Elements tagged: 287
```

## Performance Considerations

- The plugin runs only during build/development
- Uses efficient AST traversal with caching
- Minimal impact on HMR (Hot Module Replacement)
- Automatically skips `node_modules`

## TypeScript Support

The plugin is written in TypeScript and provides full type definitions:

```typescript
import componentTagger, { type TagOptions } from 'vite-plugin-component-debugger';

const config: TagOptions = {
  enabled: true,
  attributePrefix: 'data-track'
};

export default defineConfig({
  plugins: [
    react(),
    componentTagger(config)
  ]
});
```

## Troubleshooting

### Elements not being tagged

1. Check that the file extension is included in `extensions`
2. Verify the element isn't in `excludeElements` or `customExcludes`
3. Ensure the plugin is enabled

### Build performance issues

1. Reduce the scope by limiting `extensions`
2. Add more elements to `excludeElements`
3. Disable `includeProps` and `includeContent` if not needed

### Attributes not showing in production

Make sure to disable the plugin in production:

```typescript
componentTagger({
  enabled: process.env.NODE_ENV !== 'production'
})
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you find this plugin helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting issues
- 💡 Suggesting new features
- 🤝 Contributing code
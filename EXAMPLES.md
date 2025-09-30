# vite-plugin-component-debugger Examples

Comprehensive examples for all features and use cases.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Attribute Filtering](#attribute-filtering)
3. [Path Filtering](#path-filtering)
4. [Attribute Transformers](#attribute-transformers)
5. [Conditional Tagging](#conditional-tagging)
6. [Custom Attributes](#custom-attributes)
7. [Metadata Encoding](#metadata-encoding)
8. [Depth Filtering](#depth-filtering)
9. [Statistics & Callbacks](#statistics--callbacks)
10. [Presets](#presets)
11. [Advanced Patterns](#advanced-patterns)

---

## Quick Start

### Minimal Setup
```typescript
// vite.config.ts
import componentDebugger from 'vite-plugin-component-debugger';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    componentDebugger({
      enabled: process.env.NODE_ENV === 'development'
    }),
    react()
  ]
});
```

### Using a Preset
```typescript
componentDebugger({
  preset: 'minimal', // Only includes ID
  enabled: process.env.NODE_ENV === 'development'
})
```

---

## Attribute Filtering

### Include Only Specific Attributes
```typescript
// Minimal DOM footprint - only ID
componentDebugger({
  includeAttributes: ['id']
})

// Result: <button data-dev-id="Button.tsx:10:2">Click</button>
```

### Exclude Verbose Attributes
```typescript
// Remove clutter while keeping essentials
componentDebugger({
  excludeAttributes: ['metadata', 'file', 'component']
})

// Result: <button data-dev-id="..." data-dev-name="button" data-dev-path="..." data-dev-line="10">
```

### Testing Configuration
```typescript
// Optimized for E2E tests
componentDebugger({
  includeAttributes: ['id', 'name', 'component'],
  enabled: true
})

// Playwright/Cypress usage:
// await page.click('[data-dev-component="SubmitButton"]')
```

---

## Path Filtering

### Include Specific Directories
```typescript
componentDebugger({
  includePaths: [
    'src/components/**',
    'src/features/**',
    'src/pages/**'
  ]
})
```

### Exclude Test Files
```typescript
componentDebugger({
  excludePaths: [
    '**/*.test.tsx',
    '**/*.test.ts',
    '**/*.stories.tsx',
    '**/__tests__/**',
    '**/__mocks__/**'
  ]
})
```

### Combined Include/Exclude
```typescript
componentDebugger({
  // Process only source files
  includePaths: ['src/**'],

  // But skip tests and stories
  excludePaths: [
    '**/*.test.tsx',
    '**/*.stories.tsx'
  ]
})
```

---

## Attribute Transformers

### Shorten Paths for Privacy
```typescript
componentDebugger({
  transformers: {
    // Only show last 2 path segments
    path: (p) => p.split('/').slice(-2).join('/'),

    // Remove full path from ID, keep only line:col
    id: (id) => {
      const parts = id.split(':');
      return parts.slice(-2).join(':');
    }
  }
})

// Before: data-dev-path="src/components/auth/LoginForm.tsx"
// After:  data-dev-path="auth/LoginForm.tsx"
```

### Anonymize for Production
```typescript
componentDebugger({
  preset: 'production', // Built-in privacy transformers
  enabled: process.env.NODE_ENV === 'production'
})
```

### Custom Formatting
```typescript
componentDebugger({
  transformers: {
    line: (line) => `L${line}`,
    name: (name) => name.toUpperCase(),
    component: (comp) => `<${comp}>`
  }
})

// Result: data-dev-line="L42" data-dev-name="BUTTON" data-dev-component="<Button>"
```

---

## Conditional Tagging

### Only Tag Custom Components
```typescript
componentDebugger({
  shouldTag: ({ elementName }) => {
    // Only tag if starts with uppercase (custom components)
    return elementName[0] === elementName[0].toUpperCase();
  }
})

// Tags: <CustomButton>, <UserProfile>
// Skips: <div>, <button>, <span>
```

### Tag Only Specific Components
```typescript
componentDebugger({
  shouldTag: ({ elementName }) => {
    const targetComponents = ['Button', 'Form', 'Modal', 'Card'];
    return targetComponents.includes(elementName);
  }
})
```

### Complex Conditional Logic
```typescript
componentDebugger({
  shouldTag: ({ elementName, filePath, props }) => {
    // Tag all components in features directory
    if (filePath.includes('features/')) return true;

    // Tag components with data-testid
    if (props && 'data-testid' in props) return true;

    // Tag specific component types
    return elementName.endsWith('Button') || elementName.endsWith('Form');
  }
})
```

---

## Custom Attributes

### Add Git Information
```typescript
import { execSync } from 'child_process';

const gitBranch = execSync('git branch --show-current').toString().trim();
const gitCommit = execSync('git rev-parse --short HEAD').toString().trim();

componentDebugger({
  customAttributes: () => ({
    'data-dev-branch': gitBranch,
    'data-dev-commit': gitCommit,
    'data-dev-build': Date.now().toString()
  })
})

// Result: data-dev-branch="feat/new-feature" data-dev-commit="a3b4c5d"
```

### Add Environment Info
```typescript
componentDebugger({
  customAttributes: () => ({
    'data-dev-env': process.env.NODE_ENV || 'development',
    'data-dev-version': process.env.npm_package_version || '0.0.0'
  })
})
```

### Component-Specific Attributes
```typescript
componentDebugger({
  customAttributes: ({ elementName, filePath }) => {
    const attrs: Record<string, string> = {};

    // Add category based on file path
    if (filePath.includes('features/')) {
      attrs['data-dev-category'] = 'feature';
    } else if (filePath.includes('components/')) {
      attrs['data-dev-category'] = 'component';
    }

    // Add component type
    if (elementName.includes('Button')) {
      attrs['data-dev-type'] = 'interactive';
    }

    return attrs;
  }
})
```

---

## Metadata Encoding

### URL-Encoded JSON (Default)
```typescript
componentDebugger({
  includeProps: true,
  metadataEncoding: 'json' // Default, backwards compatible
})

// Result: data-dev-metadata="%7B%22className%22%3A%22primary%22%7D"
```

### Base64 Encoding
```typescript
componentDebugger({
  includeProps: true,
  metadataEncoding: 'base64' // Cleaner, no URL encoding
})

// Result: data-dev-metadata="eyJjbGFzc05hbWUiOiJwcmltYXJ5In0="
```

### Plain JSON (Escaped)
```typescript
componentDebugger({
  includeProps: true,
  metadataEncoding: 'none' // HTML-escaped JSON
})

// Result: data-dev-metadata="{&quot;className&quot;:&quot;primary&quot;}"
```

---

## Depth Filtering

### Only Tag Root Elements
```typescript
componentDebugger({
  tagOnlyRoots: true
})

// Tags only top-level JSX in each file
```

### Tag Specific Depth Range
```typescript
componentDebugger({
  minDepth: 2,  // Start at depth 2
  maxDepth: 4   // Stop at depth 4
})

// Useful for focusing on specific nesting levels
```

### Skip Deeply Nested Elements
```typescript
componentDebugger({
  maxDepth: 3  // Only tag up to 3 levels deep
})

// Reduces noise in deeply nested component trees
```

---

## Statistics & Callbacks

### Log File Processing
```typescript
componentDebugger({
  onTransform: ({ file, elementsTagged, elementNames }) => {
    console.log(`✓ ${file}: ${elementsTagged} elements`);
    console.log(`  Elements: ${elementNames.join(', ')}`);
  }
})
```

### Export Statistics
```typescript
componentDebugger({
  exportStats: 'build-stats.json',

  onComplete: (stats) => {
    console.log(`\nBuild Complete!`);
    console.log(`Files: ${stats.processedFiles}/${stats.totalFiles}`);
    console.log(`Elements: ${stats.totalElements}`);
    console.log(`\nTop Components:`);

    Object.entries(stats.byElementType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([name, count]) => {
        console.log(`  ${name}: ${count}`);
      });
  }
})
```

### Integration with Analytics
```typescript
import { sendMetrics } from './analytics';

componentDebugger({
  onComplete: async (stats) => {
    await sendMetrics({
      build_time: Date.now(),
      files_processed: stats.processedFiles,
      total_elements: stats.totalElements,
      component_breakdown: stats.byElementType
    });
  }
})
```

---

## Presets

### Minimal
```typescript
componentDebugger({ preset: 'minimal' })
// Only includes ID - smallest footprint
```

### Testing
```typescript
componentDebugger({ preset: 'testing' })
// Includes ID, name, component - perfect for E2E tests
```

### Debugging
```typescript
componentDebugger({ preset: 'debugging' })
// Includes everything + props + content - full visibility
```

### Production
```typescript
componentDebugger({ preset: 'production' })
// Privacy-focused: ID and line only, with shortened paths
```

### Override Preset Options
```typescript
componentDebugger({
  preset: 'minimal',
  // Add extra attributes on top of preset
  includeAttributes: ['id', 'name', 'line']
})
```

---

## Advanced Patterns

### Environment-Specific Configuration
```typescript
const config = {
  development: {
    preset: 'debugging',
    debug: true,
    exportStats: 'dev-stats.json'
  },
  staging: {
    preset: 'testing',
    attributePrefix: 'data-staging'
  },
  production: {
    preset: 'production',
    includePaths: ['src/features/**'],
    transformers: {
      path: (p) => 'REDACTED',
      id: (id) => id.split(':').slice(-1)[0] // Only line number
    }
  }
};

export default defineConfig({
  plugins: [
    componentDebugger({
      ...config[process.env.NODE_ENV],
      enabled: true
    }),
    react()
  ]
});
```

### Monorepo Setup
```typescript
// apps/web/vite.config.ts
componentDebugger({
  includePaths: [
    'src/**',
    '../../packages/ui/src/**',
    '../../packages/features/src/**'
  ],
  transformers: {
    path: (p) => {
      // Normalize monorepo paths
      return p
        .replace(/^.*packages\//, '@/')
        .replace(/^.*apps\//, '');
    }
  }
})
```

### Feature Flag Integration
```typescript
componentDebugger({
  shouldTag: ({ elementName, filePath }) => {
    // Only tag components in enabled features
    const enabledFeatures = loadFeatureFlags();

    return enabledFeatures.some(feature =>
      filePath.includes(`features/${feature}`)
    );
  }
})
```

### Performance Monitoring
```typescript
const startTimes = new Map();

componentDebugger({
  onTransform: ({ file, elementsTagged }) => {
    const now = Date.now();
    if (!startTimes.has(file)) {
      startTimes.set(file, now);
    }
  },

  onComplete: (stats) => {
    const avgTime = Array.from(startTimes.values())
      .reduce((sum, time) => sum + (Date.now() - time), 0) / startTimes.size;

    console.log(`Average transform time: ${avgTime.toFixed(2)}ms`);
  }
})
```

### Grouped Attributes (Single Attribute)
```typescript
componentDebugger({
  groupAttributes: true,
  includeAttributes: ['id', 'name', 'line'],
  metadataEncoding: 'base64'
})

// Result: data-dev="eyJpZCI6Ii4uLiIsIm5hbWUiOiJidXR0b24iLCJsaW5lIjoxMH0="

// Parse in browser:
const data = JSON.parse(atob(element.getAttribute('data-dev')));
console.log(data.name, data.line);
```

---

## Real-World Use Cases

### E2E Testing Setup
```typescript
// vite.config.test.ts
export default defineConfig({
  plugins: [
    componentDebugger({
      preset: 'testing',
      includePaths: ['src/**'],
      excludePaths: ['**/*.test.tsx'],
      enabled: true
    }),
    react()
  ]
});
```

### Debug Overlay Integration
```typescript
// Create a debug overlay that shows component info on hover
componentDebugger({
  includeAttributes: ['id', 'name', 'path', 'line'],
  enabled: process.env.DEBUG_MODE === 'true',

  customAttributes: ({ elementName, line }) => ({
    'data-debug-label': `${elementName}:${line}`
  })
})

// Then in your app:
// document.addEventListener('mouseover', (e) => {
//   const label = e.target.dataset.debugLabel;
//   showOverlay(label);
// });
```

### Component Analytics
```typescript
componentDebugger({
  includeAttributes: ['id', 'component'],

  customAttributes: ({ elementName }) => ({
    'data-analytics-component': elementName,
    'data-analytics-timestamp': Date.now().toString()
  }),

  onComplete: (stats) => {
    // Send component usage data to analytics
    trackComponentUsage(stats.byElementType);
  }
})
```
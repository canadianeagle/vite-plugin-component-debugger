---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## Describe the bug
A clear and concise description of what the bug is.

## To Reproduce
Steps to reproduce the behavior:
1. Install the plugin with '...'
2. Configure with '...'
3. Run build/dev with '...'
4. See error

## Expected behavior
A clear and concise description of what you expected to happen.

## Actual behavior
What actually happened instead.

## Environment
- Plugin version: [e.g. 1.0.0]
- Vite version: [e.g. 5.0.0]
- React version: [e.g. 18.2.0]
- Node.js version: [e.g. 18.0.0]
- OS: [e.g. macOS 13.0, Windows 11, Ubuntu 22.04]
- Package manager: [e.g. pnpm 8.0.0]

## Minimal reproduction
If possible, provide a minimal reproduction repository or code snippet.

```javascript
// Your vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import componentDebugger from 'vite-plugin-component-debugger';

export default defineConfig({
  plugins: [
    react(),
    componentDebugger({
      // your config
    })
  ]
});
```

## Additional context
Add any other context about the problem here, including:
- Console errors or warnings
- Build output
- Relevant configuration files
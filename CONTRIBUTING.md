# Contributing to vite-plugin-component-debugger

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/vite-plugin-component-debugger.git
   cd vite-plugin-component-debugger
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```

## 🛠️ Development Setup

### Prerequisites
- Node.js 14.18.0 or higher
- pnpm (we don't use npm or yarn)

### Available Scripts
```bash
# Run tests
pnpm run test

# Run tests with coverage
pnpm run test:coverage

# Build the plugin
pnpm run build

# Watch mode during development
pnpm run dev

# Lint code
pnpm run lint

# Run full check (lint + test + build)
pnpm run check
```

### Project Structure
```
src/
├── index.ts           # Main entry point
├── plugin.ts          # Core plugin implementation
├── utils/             # Utility functions
│   └── component-debugger.ts
└── __tests__/         # Test files
    └── plugin.test.ts
```

## 📝 Guidelines

### Code Style
- Follow existing TypeScript conventions
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Testing
- Write tests for new features
- Ensure existing tests pass: `pnpm run test`
- Aim for good test coverage
- Test both positive and negative cases

### Commits
- Use clear, descriptive commit messages
- Follow conventional commit format when possible:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `test:` for adding tests
  - `refactor:` for code refactoring

### Pull Requests
1. **Before submitting**:
   - Run `pnpm run check` to ensure all checks pass
   - Update documentation if needed
   - Add tests for new functionality

2. **PR Description**:
   - Describe what the PR does
   - Reference any related issues
   - Include screenshots for UI changes
   - List breaking changes (if any)

3. **Review Process**:
   - PRs require review before merging
   - Address feedback promptly
   - Keep PRs focused and atomic

## 🐛 Bug Reports

When reporting bugs, please include:
- Plugin version
- Vite version
- React version
- Node.js version
- Operating system
- Minimal reproduction case
- Error messages or logs

Use the bug report template in GitHub Issues.

## 💡 Feature Requests

When requesting features:
- Describe the problem you're solving
- Explain the proposed solution
- Consider the impact on existing users
- Think about implementation complexity

Use the feature request template in GitHub Issues.

## 🏗️ Architecture

### Plugin Design
The plugin works by:
1. Intercepting Vite's transform hook for `.jsx`/`.tsx` files
2. Parsing code with Babel parser
3. Walking the AST to find JSX elements
4. Adding data attributes using magic-string
5. Preserving source maps

### Key Dependencies
- `@babel/parser` - Parse JSX/TSX into AST
- `estree-walker` - Traverse AST nodes
- `magic-string` - Modify source code efficiently
- `vite` - Plugin integration (peer dependency)

### Performance Considerations
- Use efficient AST traversal
- Cache parsing results when possible
- Minimize impact on HMR
- Skip processing for excluded elements

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions

## 🆘 Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Use the bug report template
- **Features**: Use the feature request template
- **Contributing**: Tag maintainers in issues

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to vite-plugin-component-debugger! 🎉
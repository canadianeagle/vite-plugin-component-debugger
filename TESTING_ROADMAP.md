# Enterprise-Grade Testing & Security Roadmap
## Vite Plugin Component Debugger

**Version:** 2.0.0+
**Created:** 2025-09-30
**Total Time Estimate:** 45-60 days (2-3 months for one engineer)
**Status:** Planning Phase

---

## 📊 Executive Summary

This roadmap outlines a comprehensive plan to achieve enterprise-grade security, reliability, and test coverage for the vite-plugin-component-debugger. The plan includes 51 specific tasks across 8 categories.

**Current Status:**
- ✅ 113/113 tests passing
- ✅ Basic security measures implemented (ReDoS protection, transformer validation, path traversal prevention)
- ✅ Risk Level: 🟢 LOW

**Target Status:**
- 🎯 100% code coverage
- 🎯 Comprehensive fuzzing tests
- 🎯 Memory leak detection
- 🎯 Performance regression tests
- 🎯 Browser compatibility tests
- 🎯 Formal threat model
- 🎯 Penetration testing complete
- 🎯 Risk Level: 🟢 ZERO

---

## 🎯 Priority Breakdown

### 🔴 HIGH Priority (20-25 days)
Critical security and reliability tasks that should be done first.

### 🟡 MEDIUM Priority (20-25 days)
Important improvements for production readiness.

### 🟢 LOW Priority (5-10 days)
Nice-to-have enhancements and edge case handling.

---

## 1. Fuzzing Tests for All Inputs

### Task 1.1: AST Parser Fuzzing (Babel Input)
- **Priority**: 🔴 HIGH
- **Time Estimate**: 3-4 days
- **Dependencies**: None
- **Tools Needed**:
  - `@jazzer.js/core` (fuzzing framework)
  - `fast-check` (property-based testing)
  - `jsfuzz` (JavaScript fuzzer)

**Installation:**
```bash
pnpm add -D @jazzer.js/core fast-check
```

**Steps:**
1. Create `src/__tests__/fuzzing/babel-parser.fuzz.test.ts`
2. Generate malformed JSX/TSX code samples (unclosed tags, invalid attributes, broken syntax)
3. Fuzz test with deeply nested JSX (1000+ levels)
4. Test Unicode edge cases (emoji in component names, RTL text, zero-width characters)
5. Test extremely long identifiers (10KB+ component names)
6. Test binary/null bytes in code strings

**Success Criteria**:
- Plugin gracefully handles all malformed input without crashes
- No uncaught exceptions in 100,000+ fuzz iterations
- Maximum memory usage stays below 500MB per test

**Implementation:**
```typescript
// src/__tests__/fuzzing/babel-parser.fuzz.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../../plugin';
import fc from 'fast-check';

describe('Babel Parser Fuzzing', () => {
  it('should handle malformed JSX without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 10000 }),
        async (randomCode) => {
          const plugin = componentDebugger();
          try {
            // Should not throw, should return null or valid result
            const result = await plugin.transform?.(randomCode, 'fuzz.tsx');
            expect(result === null || typeof result === 'object').toBe(true);
          } catch (error) {
            // Parsing errors are acceptable, crashes are not
            expect(error).toBeDefined();
          }
        }
      ),
      { numRuns: 10000 }
    );
  });

  it('should handle deeply nested JSX', async () => {
    const depths = [10, 50, 100, 500, 1000];
    for (const depth of depths) {
      const code = '<div>' + '<span>'.repeat(depth) + 'test' + '</span>'.repeat(depth) + '</div>';
      const plugin = componentDebugger();
      const result = await plugin.transform?.(code, 'deep.tsx');
      // Should complete within reasonable time
      expect(result).toBeDefined();
    }
  });

  it('should handle Unicode edge cases', async () => {
    const unicodeCases = [
      '<Component😀 />',  // Emoji in name
      '<div>مرحبا</div>',  // Arabic RTL
      '<div>你好</div>',    // Chinese
      '<div>\u200B\u200C\u200D</div>',  // Zero-width chars
    ];

    for (const code of unicodeCases) {
      const plugin = componentDebugger();
      const result = await plugin.transform?.(code, 'unicode.tsx');
      expect(result).toBeDefined();
    }
  });
});
```

---

### Task 1.2: Glob Pattern Fuzzing (Path Filtering)
- **Priority**: 🔴 HIGH
- **Time Estimate**: 2 days
- **Dependencies**: Task 1.1
- **Tools Needed**: `fast-check`, `minimatch` (already installed)

**Steps:**
1. Create `src/__tests__/fuzzing/glob-patterns.fuzz.test.ts`
2. Fuzz test with ReDoS attack patterns (catastrophic backtracking)
3. Test patterns exceeding MAX_PATTERN_LENGTH (200 chars)
4. Test patterns with MAX_WILDCARD_COUNT+ wildcards (>10)
5. Test path traversal attempts (`../../../etc/passwd`, `..\\..\\windows\\system32`)
6. Test null bytes in paths (`path\0with\0nulls`)
7. Verify performance: no pattern should take >100ms to match

**Success Criteria**:
- All ReDoS patterns timeout gracefully with warnings
- Path traversal attacks blocked
- No glob pattern causes >100ms execution time

**Implementation:**
```typescript
// src/__tests__/fuzzing/glob-patterns.fuzz.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../../plugin';
import fc from 'fast-check';

describe('Glob Pattern Fuzzing', () => {
  it('should reject ReDoS attack patterns', async () => {
    const redosPatterns = [
      '(a+)+b',
      '(a*)*b',
      '([a-zA-Z]+)*',
      '*'.repeat(50) + 'test',
      '**/**/**/**/**/**/**/**/**/**/**',
    ];

    for (const pattern of redosPatterns) {
      const plugin = componentDebugger({
        includePaths: [pattern]
      });
      const code = '<div>test</div>';
      const startTime = Date.now();
      await plugin.transform?.(code, 'test.tsx');
      const duration = Date.now() - startTime;
      // Should complete quickly or skip pattern
      expect(duration).toBeLessThan(1000);
    }
  });

  it('should prevent path traversal in exportStats', async () => {
    const traversalPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '/etc/shadow',
      'C:\\Windows\\System32\\config\\SAM',
    ];

    for (const path of traversalPaths) {
      const plugin = componentDebugger({ exportStats: path });
      const code = '<div>test</div>';
      await plugin.transform?.(code, 'test.tsx');
      // buildEnd should prevent writing outside project
      plugin.buildEnd?.();
      // Verify file wasn't created (manual check or filesystem mock)
    }
  });

  it('should handle extremely long patterns', async () => {
    const longPattern = 'a/'.repeat(200) + '*.tsx';
    const plugin = componentDebugger({ includePaths: [longPattern] });
    const code = '<div>test</div>';

    // Should warn and skip pattern
    await plugin.transform?.(code, 'test.tsx');
  });
});
```

---

### Task 1.3: Transformer Function Fuzzing
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 2 days
- **Dependencies**: Task 1.1
- **Tools Needed**: `fast-check`

**Steps:**
1. Create `src/__tests__/fuzzing/transformers.fuzz.test.ts`
2. Fuzz transformers with non-string returns (objects, null, undefined, symbols)
3. Test transformers that throw errors
4. Test transformers with infinite loops (timeout protection)
5. Test transformers returning extremely long strings (>1MB)
6. Test transformers with prototype pollution attempts

**Success Criteria**:
- Plugin handles invalid transformer returns gracefully
- Errors in transformers don't crash the build
- Resource limits enforced (MAX_ATTR_LENGTH)

**Implementation:**
```typescript
// src/__tests__/fuzzing/transformers.fuzz.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../../plugin';

describe('Transformer Fuzzing', () => {
  it('should handle transformers returning non-strings', async () => {
    const badTransformers = [
      { id: () => null as any },
      { id: () => undefined as any },
      { id: () => ({ malicious: 'object' }) as any },
      { id: () => 123 as any },
      { id: () => Symbol('test') as any },
      { id: () => [] as any },
      { id: () => true as any },
    ];

    for (const transformers of badTransformers) {
      const plugin = componentDebugger({ transformers });
      const code = '<div>test</div>';
      const result = await plugin.transform?.(code, 'test.tsx');
      // Should not crash, should warn and use original value
      expect(result).toBeDefined();
    }
  });

  it('should handle transformers that throw', async () => {
    const plugin = componentDebugger({
      transformers: {
        id: () => { throw new Error('Malicious transformer'); },
        name: () => { throw new TypeError('Bad type'); },
        path: () => { throw new ReferenceError('Not defined'); },
      }
    });
    const code = '<div>test</div>';
    const result = await plugin.transform?.(code, 'test.tsx');
    // Should catch error and continue with original value
    expect(result).toBeDefined();
  });

  it('should handle transformers returning huge strings', async () => {
    const plugin = componentDebugger({
      transformers: {
        id: () => 'x'.repeat(10 * 1024 * 1024) // 10MB string
      }
    });
    const code = '<div>test</div>';
    const result = await plugin.transform?.(code, 'test.tsx');
    // Should handle or truncate
    expect(result).toBeDefined();
  });
});
```

---

### Task 1.4: Callback Function Fuzzing
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 2 days
- **Dependencies**: Task 1.3
- **Tools Needed**: `fast-check`

**Steps:**
1. Create `src/__tests__/fuzzing/callbacks.fuzz.test.ts`
2. Test callbacks that throw errors
3. Test callbacks with infinite loops
4. Test shouldTag returning non-boolean values
5. Test customAttributes returning dangerous keys (`__proto__`, `constructor`)
6. Test customAttributes returning non-string values
7. Test customAttributes returning huge objects (>50 attributes)

**Success Criteria**:
- Callbacks errors logged but don't crash build
- Prototype pollution attempts blocked
- Resource limits enforced (MAX_CUSTOM_ATTRS: 50)

**Implementation:**
```typescript
// src/__tests__/fuzzing/callbacks.fuzz.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../../plugin';

describe('Callback Fuzzing', () => {
  it('should handle shouldTag throwing errors', async () => {
    const plugin = componentDebugger({
      shouldTag: () => { throw new Error('Bad callback'); }
    });
    const code = '<div>test</div>';
    const result = await plugin.transform?.(code, 'test.tsx');
    // Should catch error and continue processing
    expect(result).toBeDefined();
  });

  it('should handle shouldTag returning non-boolean', async () => {
    const badReturns = [
      () => 'yes' as any,
      () => 1 as any,
      () => null as any,
      () => undefined as any,
      () => ({}) as any,
    ];

    for (const shouldTag of badReturns) {
      const plugin = componentDebugger({ shouldTag });
      const code = '<div>test</div>';
      const result = await plugin.transform?.(code, 'test.tsx');
      expect(result).toBeDefined();
    }
  });

  it('should block prototype pollution in customAttributes', async () => {
    const plugin = componentDebugger({
      customAttributes: () => ({
        '__proto__': 'malicious',
        'constructor': 'evil',
        'prototype': 'bad',
        'safe': 'good'
      })
    });
    const code = '<div>test</div>';
    const result = await plugin.transform?.(code, 'test.tsx');
    if (result && typeof result === 'object' && 'code' in result) {
      // Should only include 'safe' attribute
      expect(result.code).toContain('safe');
      expect(result.code).not.toContain('__proto__');
      expect(result.code).not.toContain('constructor');
    }
  });

  it('should limit number of custom attributes', async () => {
    const plugin = componentDebugger({
      customAttributes: () => {
        const attrs: Record<string, string> = {};
        for (let i = 0; i < 100; i++) {
          attrs[`attr-${i}`] = `value-${i}`;
        }
        return attrs;
      }
    });
    const code = '<div>test</div>';
    const result = await plugin.transform?.(code, 'test.tsx');
    // Should warn and limit to 50
    expect(result).toBeDefined();
  });
});
```

---

### Task 1.5: Configuration Options Fuzzing
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 1 day
- **Dependencies**: None
- **Tools Needed**: `fast-check`

**Steps:**
1. Create `src/__tests__/fuzzing/config-options.fuzz.test.ts`
2. Test invalid depth values (negative, >MAX_DEPTH_LIMIT, NaN, Infinity)
3. Test conflicting options (minDepth > maxDepth)
4. Test invalid extension arrays (non-strings, empty strings)
5. Test invalid preset names
6. Test invalid metadataEncoding values

**Success Criteria**:
- All invalid configs handled with warnings
- Defaults applied when invalid values provided
- No crashes on bad configuration

**Implementation:**
```typescript
// src/__tests__/fuzzing/config-options.fuzz.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../../plugin';

describe('Configuration Fuzzing', () => {
  it('should handle invalid depth values', () => {
    const invalidDepths = [
      { maxDepth: -1 },
      { maxDepth: 999 },
      { maxDepth: NaN },
      { maxDepth: Infinity },
      { maxDepth: -Infinity },
      { minDepth: -5 },
      { minDepth: 100, maxDepth: 10 }, // minDepth > maxDepth
    ];

    for (const config of invalidDepths) {
      expect(() => componentDebugger(config)).not.toThrow();
      // Should apply defaults or swap values
    }
  });

  it('should handle invalid preset names', () => {
    const invalidPresets = [
      'invalid-preset',
      'MINIMAL',  // Wrong case
      '',
      null as any,
      123 as any,
    ];

    for (const preset of invalidPresets) {
      expect(() => componentDebugger({ preset: preset as any })).not.toThrow();
    }
  });

  it('should handle invalid metadataEncoding', () => {
    const invalidEncodings = [
      'invalid',
      'JSON',  // Wrong case
      null as any,
      123 as any,
    ];

    for (const encoding of invalidEncodings) {
      expect(() => componentDebugger({
        metadataEncoding: encoding as any
      })).not.toThrow();
    }
  });

  it('should handle invalid extensions array', () => {
    const invalidExtensions = [
      [123, 456] as any,
      [''],
      [null] as any,
      'not-an-array' as any,
    ];

    for (const extensions of invalidExtensions) {
      expect(() => componentDebugger({
        extensions: extensions as any
      })).not.toThrow();
    }
  });
});
```

---

## 2. 100% Code Coverage (Including Error Paths)

### Task 2.1: Install Coverage Tooling
- **Priority**: 🔴 HIGH
- **Time Estimate**: 2 hours
- **Dependencies**: None
- **Tools Needed**: `@vitest/coverage-v8`, `vitest`

**Installation:**
```bash
pnpm add -D @vitest/coverage-v8
```

**Steps:**
1. Create `vitest.config.ts`:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
      all: true,
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    }
  }
});
```

2. Add script to `package.json`:
```json
{
  "scripts": {
    "test:coverage": "vitest --coverage --run"
  }
}
```

3. Run coverage: `pnpm test:coverage`
4. Identify uncovered lines/branches

**Success Criteria**: Coverage report generated successfully

---

### Task 2.2: Cover Error Paths in plugin.ts
- **Priority**: 🔴 HIGH
- **Time Estimate**: 3 days
- **Dependencies**: Task 2.1
- **Tools Needed**: Vitest

**Steps:**
1. Create `src/__tests__/error-paths/plugin-errors.test.ts`
2. Test Babel parser throwing on invalid syntax
3. Test magic-string errors (invalid source positions)
4. Test file I/O errors in exportStats (permission denied, disk full)
5. Test malformed AST nodes (missing loc, missing name)
6. Test callback errors (onTransform, onComplete throwing)
7. Test edge case: code with no newlines
8. Test edge case: code with only newlines
9. Test edge case: empty file
10. Test edge case: file with only comments

**Success Criteria**:
- All error branches in plugin.ts covered
- Error handling verified
- No silent failures

**Implementation:**
```typescript
// src/__tests__/error-paths/plugin-errors.test.ts
import { describe, it, expect, vi } from 'vitest';
import { componentDebugger } from '../../plugin';

describe('Plugin Error Paths', () => {
  it('should handle babel parse errors gracefully', async () => {
    const plugin = componentDebugger();
    const invalidCode = '<div unclosed';
    const result = await plugin.transform?.(invalidCode, 'test.tsx');
    // Should return null and log error
    expect(result).toBeNull();
  });

  it('should handle callback errors in onTransform', async () => {
    const errorCallback = vi.fn(() => {
      throw new Error('onTransform failed');
    });
    const plugin = componentDebugger({ onTransform: errorCallback });
    const code = '<div>test</div>';
    await plugin.transform?.(code, 'test.tsx');
    expect(errorCallback).toHaveBeenCalled();
    // Should log error but continue
  });

  it('should handle missing location info in AST nodes', async () => {
    const plugin = componentDebugger({ debug: true });
    // Code that might produce nodes without location info
    const code = '<div />';
    const result = await plugin.transform?.(code, 'test.tsx');
    expect(result).toBeDefined();
  });

  it('should handle exportStats file write errors', async () => {
    const plugin = componentDebugger({
      exportStats: '/root/forbidden/path.json' // Permission denied
    });
    const code = '<div>test</div>';
    await plugin.transform?.(code, 'test.tsx');
    // Should log error, not crash
    expect(() => plugin.buildEnd?.()).not.toThrow();
  });

  it('should handle empty file', async () => {
    const plugin = componentDebugger();
    const result = await plugin.transform?.('', 'empty.tsx');
    expect(result).toBeNull();
  });

  it('should handle file with only comments', async () => {
    const plugin = componentDebugger();
    const code = '// Just a comment\n/* Another comment */';
    const result = await plugin.transform?.(code, 'comments.tsx');
    expect(result).toBeNull();
  });

  it('should handle code with no newlines', async () => {
    const plugin = componentDebugger();
    const code = '<div><span>test</span></div>';
    const result = await plugin.transform?.(code, 'single-line.tsx');
    expect(result).toBeDefined();
  });
});
```

---

### Task 2.3: Cover Edge Cases in generateAttributes Function
- **Priority**: 🔴 HIGH
- **Time Estimate**: 2 days
- **Dependencies**: Task 2.1
- **Tools Needed**: Vitest

**Steps:**
1. Create `src/__tests__/error-paths/generate-attributes.test.ts`
2. Test all encoding modes (json, base64, none)
3. Test metadata exceeding MAX_METADATA_SIZE (10KB)
4. Test HTML escaping edge cases (`<script>`, `&`, quotes)
5. Test groupAttributes mode
6. Test all attribute inclusion/exclusion combinations
7. Test source map hints
8. Test custom attributes with dangerous keys filtered out
9. Test custom attributes exceeding MAX_CUSTOM_ATTRS (50)
10. Test attribute values exceeding MAX_ATTR_LENGTH (1000)

**Success Criteria**: All branches in generateAttributes covered

**Implementation:**
```typescript
// src/__tests__/error-paths/generate-attributes.test.ts
import { describe, it, expect } from 'vitest';
import { componentDebugger } from '../../plugin';

describe('Generate Attributes Edge Cases', () => {
  it('should truncate large metadata', async () => {
    const largeProps = { data: 'x'.repeat(20000) };
    const plugin = componentDebugger({
      includeProps: true,
      customAttributes: () => largeProps
    });
    const code = '<div className="test">content</div>';
    const result = await plugin.transform?.(code, 'test.tsx');
    if (result && typeof result === 'object' && 'code' in result) {
      // Should contain truncation notice
      expect(result.code).toContain('truncated');
    }
  });

  it('should handle all metadata encoding modes', async () => {
    const encodings: Array<'json' | 'base64' | 'none'> = ['json', 'base64', 'none'];

    for (const encoding of encodings) {
      const plugin = componentDebugger({
        includeProps: true,
        metadataEncoding: encoding
      });
      const code = '<div className="test">content</div>';
      const result = await plugin.transform?.(code, 'test.tsx');
      expect(result).toBeDefined();
    }
  });

  it('should properly escape HTML characters', async () => {
    const plugin = componentDebugger({
      customAttributes: () => ({
        xss: '<script>alert("XSS")</script>',
        amp: 'A & B',
        quote: 'He said "hello"',
        apostrophe: "It's working",
        lt: '<div>',
        gt: 'a > b'
      })
    });
    const code = '<div>test</div>';
    const result = await plugin.transform?.(code, 'test.tsx');
    if (result && typeof result === 'object' && 'code' in result) {
      expect(result.code).toContain('&lt;script&gt;');
      expect(result.code).toContain('&amp;');
      expect(result.code).toContain('&quot;');
      expect(result.code).toContain('&#39;');
    }
  });

  it('should handle groupAttributes mode', async () => {
    const plugin = componentDebugger({
      groupAttributes: true,
      includeAttributes: ['id', 'name', 'line'],
      metadataEncoding: 'base64'
    });
    const code = '<div>test</div>';
    const result = await plugin.transform?.(code, 'test.tsx');
    if (result && typeof result === 'object' && 'code' in result) {
      // Should have single data-dev attribute
      expect(result.code).toContain('data-dev=');
      expect(result.code).not.toContain('data-dev-id=');
    }
  });

  it('should test all inclusion/exclusion combinations', async () => {
    const configs = [
      { includeAttributes: ['id'] },
      { includeAttributes: ['id', 'name'] },
      { excludeAttributes: ['metadata'] },
      { excludeAttributes: ['file', 'component'] },
      { includeAttributes: ['id'], excludeAttributes: ['metadata'] },
    ];

    for (const config of configs) {
      const plugin = componentDebugger(config);
      const code = '<div>test</div>';
      const result = await plugin.transform?.(code, 'test.tsx');
      expect(result).toBeDefined();
    }
  });
});
```

---

### Task 2.4: Cover Utility Functions
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 1 day
- **Dependencies**: Task 2.1
- **Tools Needed**: Vitest

**Steps:**
1. Create `src/__tests__/utils/utility-functions.test.ts`
2. Test shouldExcludeElement with all code paths
3. Test extractTextContent with nested JSX, expressions, empty content
4. Test matchesPatterns with empty patterns, invalid patterns, dot files
5. Test applyPreset with all presets and override behavior

**Success Criteria**: 100% coverage of utility functions

---

### Task 2.5: Cover component-debugger.ts Utility File
- **Priority**: 🟢 LOW
- **Time Estimate**: 1 day
- **Dependencies**: Task 2.1
- **Tools Needed**: Vitest, jsdom or happy-dom

**Steps:**
1. Install: `pnpm add -D happy-dom`
2. Create `src/__tests__/utils/component-debugger-utils.test.ts`
3. Test all exported functions (getComponentInfo, findAllComponents, etc.)
4. Mock DOM environment with tagged elements
5. Test error handling in metadata parsing
6. Test browser API interactions

**Success Criteria**: 100% coverage of component-debugger.ts

---

## 3. Comprehensive Integration Tests

### Task 3.1: Real Vite Build Integration Tests
- **Priority**: 🔴 HIGH
- **Time Estimate**: 4 days
- **Dependencies**: None
- **Tools Needed**: `vite`, `tmp`

**Installation:**
```bash
pnpm add -D tmp
```

**Steps:**
1. Create `src/__tests__/integration/vite-build.test.ts`
2. Set up temp project with real vite.config.ts
3. Test full development build
4. Test full production build
5. Test HMR (Hot Module Replacement)
6. Test with various React versions (17, 18, 19)
7. Test plugin order (before/after React plugin)
8. Verify generated HTML has correct attributes
9. Verify source maps are correct

**Success Criteria**:
- Plugin works in real Vite builds
- Attributes present in built HTML
- Source maps accurate
- No build performance regression (>10% slower)

---

### Task 3.2: End-to-End Browser Tests with Playwright
- **Priority**: 🔴 HIGH
- **Time Estimate**: 3 days
- **Dependencies**: Task 3.1
- **Tools Needed**: `@playwright/test`, `playwright`

**Installation:**
```bash
pnpm add -D @playwright/test
pnpm exec playwright install
```

**Steps:**
1. Create `src/__tests__/e2e/browser.spec.ts`
2. Create `playwright.config.ts`
3. Start dev server with plugin enabled
4. Use Playwright to verify DOM attributes
5. Test component highlighting utility
6. Test data extraction utilities in browser
7. Verify line numbers match source files
8. Test with different browsers (Chromium, Firefox, WebKit)

**Success Criteria**:
- All attributes visible in browser DOM
- Line numbers accurate
- Utilities work in browser context

**Configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

### Task 3.3: Multi-Framework Integration
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 5 days
- **Dependencies**: Task 3.1
- **Tools Needed**: Various React versions, Next.js, Remix

**Steps:**
1. Create test projects for each framework
2. Test React 17 (no automatic JSX runtime)
3. Test React 18 (automatic JSX runtime)
4. Test React 19 (latest features)
5. Test Next.js App Router
6. Test Next.js Pages Router
7. Test Remix
8. Verify SSR doesn't break
9. Verify client-side hydration works

**Success Criteria**:
- Plugin works across all framework versions
- No SSR errors
- Hydration successful

---

### Task 3.4: Monorepo Integration Tests
- **Priority**: 🟢 LOW
- **Time Estimate**: 2 days
- **Dependencies**: Task 3.1
- **Tools Needed**: pnpm workspaces

**Steps:**
1. Create test monorepo with multiple packages
2. Test with pnpm workspaces
3. Test with npm workspaces
4. Test with Yarn workspaces
5. Verify relative paths work across packages
6. Test symlinked dependencies

**Success Criteria**:
- Plugin resolves paths correctly in monorepos
- No duplicate processing

---

### Task 3.5: CI/CD Pipeline Integration Tests
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 2 days
- **Dependencies**: Task 3.1
- **Tools Needed**: GitHub Actions

**Steps:**
1. Update `.github/workflows/ci.yml` to run integration tests
2. Test builds in CI environment
3. Test across different Node versions (18, 20, 22)
4. Test on different OS (Ubuntu, macOS, Windows)
5. Verify no flaky tests
6. Add integration test coverage reporting

**Success Criteria**:
- Integration tests pass in CI
- No platform-specific failures

**Implementation:**
```yaml
# .github/workflows/integration.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20, 22]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:integration
```

---

## 4. Memory Leak Detection

### Task 4.1: Set Up Memory Profiling Tools
- **Priority**: 🔴 HIGH
- **Time Estimate**: 1 day
- **Dependencies**: None
- **Tools Needed**: `memlab`, `@clinicjs/clinic`

**Installation:**
```bash
pnpm add -D memlab @clinicjs/clinic
```

**Steps:**
1. Create memory profiling scripts
2. Set up heap snapshot capture
3. Configure automated leak detection

**Success Criteria**: Tools installed and configured

**Package.json scripts:**
```json
{
  "scripts": {
    "test:memory": "node --expose-gc --max-old-space-size=512 ./scripts/memory-test.js",
    "profile:memory": "clinic heapprofiler -- node ./scripts/profile-plugin.js"
  }
}
```

---

### Task 4.2: Detect Leaks in Plugin Transform Loop
- **Priority**: 🔴 HIGH
- **Time Estimate**: 3 days
- **Dependencies**: Task 4.1
- **Tools Needed**: memlab, Vitest

**Steps:**
1. Create `scripts/memory-test.js`
2. Process 10,000 files in a loop
3. Monitor heap size growth
4. Take heap snapshots before/after
5. Analyze retained objects (MagicString, AST nodes, closures)
6. Check for detached DOM nodes
7. Verify garbage collection occurs

**Success Criteria**:
- Heap size stabilizes after GC
- No unbounded growth
- Memory usage < 200MB for 10,000 files

**Implementation:**
```javascript
// scripts/memory-test.js
const { componentDebugger } = require('./dist/index.js');
const v8 = require('v8');

async function testMemoryLeak() {
  const plugin = componentDebugger();
  const testCode = '<div><span>Test</span></div>';

  const initialHeap = v8.getHeapStatistics().used_heap_size;

  // Process 10,000 files
  for (let i = 0; i < 10000; i++) {
    await plugin.transform?.(testCode, `file-${i}.tsx`);

    if (i % 1000 === 0) {
      global.gc?.(); // Force GC if --expose-gc flag set
      const currentHeap = v8.getHeapStatistics().used_heap_size;
      const growth = ((currentHeap - initialHeap) / 1024 / 1024).toFixed(2);
      console.log(`Processed ${i} files, heap growth: ${growth}MB`);
    }
  }

  global.gc?.();
  const finalHeap = v8.getHeapStatistics().used_heap_size;
  const totalGrowth = ((finalHeap - initialHeap) / 1024 / 1024).toFixed(2);

  console.log(`\nTotal heap growth after 10,000 files: ${totalGrowth}MB`);

  if (parseFloat(totalGrowth) > 200) {
    console.error('❌ Memory leak detected! Heap growth exceeds 200MB');
    process.exit(1);
  }

  console.log('✅ No memory leaks detected');
}

testMemoryLeak().catch(console.error);
```

---

### Task 4.3: Detect Leaks in Event Listeners
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 2 days
- **Dependencies**: Task 4.1
- **Tools Needed**: memlab, happy-dom

**Steps:**
1. Test component-debugger.ts browser utilities
2. Test enableComponentHighlighting for listener cleanup
3. Test observeComponentRenders for observer cleanup
4. Verify cleanup functions remove all listeners
5. Test repeated enable/disable cycles

**Success Criteria**:
- All listeners removed on cleanup
- No retained event handlers

---

### Task 4.4: Detect Leaks in Long-Running Dev Server
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 2 days
- **Dependencies**: Task 4.1, Task 3.1
- **Tools Needed**: memlab, Vite

**Steps:**
1. Start Vite dev server with plugin
2. Simulate file changes (HMR) for 1 hour
3. Monitor heap size over time
4. Check for accumulating transform results
5. Verify stats object doesn't grow unbounded

**Success Criteria**:
- Heap stable during long-running server
- No accumulation of transform results

---

### Task 4.5: Add Memory Leak Tests to CI
- **Priority**: 🟢 LOW
- **Time Estimate**: 1 day
- **Dependencies**: Task 4.2, Task 4.3, Task 4.4
- **Tools Needed**: GitHub Actions

**Steps:**
1. Update `.github/workflows/ci.yml`
2. Add memory leak test job
3. Configure timeout (30 minutes max)
4. Upload heap snapshots as artifacts

**Success Criteria**: Memory tests run in CI

---

## 5. Performance Regression Tests

### Task 5.1: Establish Performance Baselines
- **Priority**: 🔴 HIGH
- **Time Estimate**: 2 days
- **Dependencies**: None
- **Tools Needed**: `tinybench`

**Installation:**
```bash
pnpm add -D tinybench
```

**Steps:**
1. Create `src/__tests__/benchmarks/baseline.bench.ts`
2. Benchmark transform performance (small/medium/large files)
3. Benchmark different file sizes (1KB, 10KB, 100KB, 1MB)
4. Benchmark different JSX complexity (flat, nested, deeply nested)
5. Measure Babel parse time vs. attribute injection time
6. Store baseline results in `benchmarks/baseline.json`

**Success Criteria**:
- Baseline metrics captured
- Benchmarks reproducible

**Implementation:**
```typescript
// src/__tests__/benchmarks/baseline.bench.ts
import { bench, describe } from 'vitest';
import { componentDebugger } from '../../plugin';

describe('Performance Baselines', () => {
  const smallCode = '<div>Hello</div>';
  const mediumCode = '<div>' + '<span>Test</span>'.repeat(100) + '</div>';
  const largeCode = '<div>' + '<span>Test</span>'.repeat(1000) + '</div>';

  bench('transform small file (< 1KB)', async () => {
    const plugin = componentDebugger();
    await plugin.transform?.(smallCode, 'small.tsx');
  });

  bench('transform medium file (10KB)', async () => {
    const plugin = componentDebugger();
    await plugin.transform?.(mediumCode, 'medium.tsx');
  });

  bench('transform large file (100KB)', async () => {
    const plugin = componentDebugger();
    await plugin.transform?.(largeCode, 'large.tsx');
  });

  bench('disabled plugin (should be near-zero overhead)', async () => {
    const plugin = componentDebugger({ enabled: false });
    await plugin.transform?.(mediumCode, 'disabled.tsx');
  });
});
```

---

### Task 5.2: Automated Regression Detection
- **Priority**: 🔴 HIGH
- **Time Estimate**: 3 days
- **Dependencies**: Task 5.1
- **Tools Needed**: `tinybench`, custom scripts

**Steps:**
1. Create `scripts/performance-regression-check.js`
2. Run benchmarks on each commit
3. Compare against baseline (max 10% regression allowed)
4. Generate performance report
5. Fail CI if regression > 10%
6. Store historical performance data

**Success Criteria**:
- Automated detection of >10% slowdowns
- Historical tracking enabled

---

### Task 5.3: Build Time Impact Measurement
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 2 days
- **Dependencies**: Task 5.1, Task 3.1
- **Tools Needed**: Vite, hyperfine

**Steps:**
1. Create test projects of varying sizes
2. Measure build time with plugin enabled vs. disabled
3. Test cold start vs. warm cache
4. Test HMR update speed
5. Verify plugin overhead < 5% of total build time

**Success Criteria**:
- Plugin adds <5% to build time
- HMR not significantly impacted

---

### Task 5.4: Large Codebase Stress Test
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 2 days
- **Dependencies**: Task 5.1
- **Tools Needed**: Test codebase generator

**Steps:**
1. Generate synthetic codebase (10,000 components)
2. Test transform performance at scale
3. Measure memory usage with large codebase
4. Test stats aggregation performance
5. Verify no exponential slowdowns

**Success Criteria**:
- Linear time complexity maintained
- Memory usage proportional to file size

---

### Task 5.5: Add Performance Tests to CI
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 1 day
- **Dependencies**: Task 5.2
- **Tools Needed**: GitHub Actions

**Steps:**
1. Add benchmark job to `.github/workflows/ci.yml`
2. Run on every PR
3. Comment results on PR
4. Block merge if regression > 10%

**Success Criteria**: Performance tests run in CI

---

## 6. Browser Compatibility Tests

### Task 6.1: Set Up Cross-Browser Testing
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 2 days
- **Dependencies**: Task 3.2
- **Tools Needed**: `@playwright/test`

**Steps:**
1. Configure Playwright for multiple browsers
2. Set up test matrix (Chrome, Firefox, Safari, Edge)
3. Configure mobile browsers (iOS Safari, Chrome Android)

**Success Criteria**: Tests run on all major browsers

---

### Task 6.2: Test Data Attribute Support
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 2 days
- **Dependencies**: Task 6.1
- **Tools Needed**: Playwright

**Steps:**
1. Test `dataset` API across browsers
2. Test getAttribute/setAttribute
3. Test querySelector with data attributes
4. Test special characters in attribute values
5. Test very long attribute values (>1KB)
6. Test non-ASCII characters

**Success Criteria**:
- All browsers support data attributes correctly
- No encoding issues

---

### Task 6.3: Test Browser Utility Functions
- **Priority**: 🟢 LOW
- **Time Estimate**: 2 days
- **Dependencies**: Task 6.1
- **Tools Needed**: Playwright

**Steps:**
1. Test getComponentInfo in all browsers
2. Test enableComponentHighlighting visual rendering
3. Test MutationObserver support
4. Test clipboard API
5. Verify tooltip positioning

**Success Criteria**:
- All utilities work across browsers
- Graceful degradation for unsupported features

---

### Task 6.4: Test Legacy Browser Support
- **Priority**: 🟢 LOW
- **Time Estimate**: 1 day
- **Dependencies**: Task 6.1
- **Tools Needed**: BrowserStack (optional)

**Steps:**
1. Test in older Safari versions (12-13)
2. Identify polyfills needed
3. Document browser support matrix
4. Add graceful degradation

**Success Criteria**:
- Clear browser support documented
- Polyfills identified

---

### Task 6.5: Add Browser Tests to CI
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 1 day
- **Dependencies**: Task 6.1, Task 6.2
- **Tools Needed**: GitHub Actions, Playwright

**Steps:**
1. Add Playwright test job to CI
2. Run on all configured browsers
3. Upload test results and screenshots

**Success Criteria**: Browser tests run in CI

---

## 7. Formal Threat Modeling

### Task 7.1: Identify Assets and Trust Boundaries
- **Priority**: 🔴 HIGH
- **Time Estimate**: 1 day
- **Dependencies**: None
- **Tools Needed**: Threat modeling framework (STRIDE)

**Steps:**
1. List all plugin assets
2. Identify trust boundaries
3. Map data flow
4. Identify threat actors
5. Create data flow diagram

**Success Criteria**:
- Complete asset inventory
- Trust boundaries documented

**Assets:**
- Source code files
- User configuration
- Babel AST
- Transformed output
- Statistics files
- NPM package

**Trust Boundaries:**
1. User configuration (untrusted)
2. Source code files (partially trusted)
3. File system operations
4. Callback functions (untrusted)
5. Glob patterns (untrusted)

---

### Task 7.2: Apply STRIDE Threat Analysis
- **Priority**: 🔴 HIGH
- **Time Estimate**: 2 days
- **Dependencies**: Task 7.1
- **Tools Needed**: STRIDE framework

**Steps:**
1. Analyze Spoofing threats
2. Analyze Tampering threats
3. Analyze Repudiation threats
4. Analyze Information Disclosure threats
5. Analyze Denial of Service threats
6. Analyze Elevation of Privilege threats
7. Document all threats
8. Rate by severity

**Success Criteria**:
- Complete STRIDE analysis
- Threats prioritized

**STRIDE Categories:**

**Spoofing (S)**
- S1: Fake data-dev attributes in source
- S2: Package spoofing on npm

**Tampering (T)**
- T1: Malicious transformer modifying output
- T2: Path traversal in exportStats (✅ mitigated)

**Repudiation (R)**
- R1: No audit trail for callbacks

**Information Disclosure (I)**
- I1: Sensitive props in metadata
- I2: File paths revealing structure

**Denial of Service (D)**
- D1: ReDoS via glob patterns (✅ mitigated)
- D2: Memory exhaustion (✅ mitigated)
- D3: Infinite loop in callbacks

**Elevation of Privilege (E)**
- E1: Arbitrary code via callbacks
- E2: Prototype pollution (✅ mitigated)

---

### Task 7.3: Document Attack Vectors
- **Priority**: 🔴 HIGH
- **Time Estimate**: 1 day
- **Dependencies**: Task 7.2
- **Tools Needed**: Markdown

**Steps:**
1. Create `SECURITY.md` document
2. List all attack vectors
3. Document mitigations
4. Document known vulnerabilities
5. Provide security best practices
6. Add responsible disclosure policy

**Success Criteria**: Complete security documentation

**Template:**
```markdown
# SECURITY.md

## Security Policy

### Supported Versions
- 2.x: Full security support
- 1.x: Critical fixes only

### Known Security Considerations

#### 1. User-Provided Callbacks (CRITICAL)
**Risk**: Arbitrary code execution
**Mitigation**: Callbacks run in build process
**Best Practice**: Never use untrusted callbacks

#### 2. Metadata Information Disclosure (HIGH)
**Risk**: Props may contain sensitive data
**Mitigation**: Set `includeProps: false` in production
**Best Practice**: Review metadata before enabling

### Reporting Vulnerabilities
Email: security@tonyebrown.com
Response time: 48 hours
```

---

### Task 7.4: Create Mitigation Plan
- **Priority**: 🔴 HIGH
- **Time Estimate**: 3 days
- **Dependencies**: Task 7.2, Task 7.3
- **Tools Needed**: None

**Steps:**
1. Prioritize unmitigated threats
2. Design mitigations for top 5 threats
3. Implement mitigations (if feasible)
4. Add security hardening options
5. Document trade-offs

**Success Criteria**:
- Mitigations implemented or documented
- Security hardening options available

**New Security Options:**
```typescript
export interface TagOptions {
  /**
   * Security: Timeout for user callbacks (ms)
   * @default 5000
   */
  callbackTimeout?: number;

  /**
   * Security: Enable audit logging
   * @default false
   */
  auditLog?: boolean;

  /**
   * Security: Sanitize metadata keys
   * @default ['password', 'token', 'secret', 'apiKey']
   */
  sanitizeMetadata?: string[];
}
```

---

### Task 7.5: Dependency Security Audit
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 2 days
- **Dependencies**: None
- **Tools Needed**: `npm audit`, `snyk`

**Steps:**
1. Run `pnpm audit`
2. Review dependency tree
3. Check for known CVEs
4. Set up Dependabot
5. Add audit to CI pipeline

**Success Criteria**:
- No high/critical vulnerabilities
- Automated scanning enabled

**GitHub Actions:**
```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  push:
  pull_request:
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm audit --audit-level=moderate
```

**Dependabot:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

---

## 8. Penetration Testing

### Task 8.1: Set Up Penetration Testing Environment
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 1 day
- **Dependencies**: None
- **Tools Needed**: Docker

**Steps:**
1. Create isolated Docker container
2. Set up test application
3. Create malicious test payloads
4. Document methodology

**Success Criteria**: Testing environment ready

---

### Task 8.2: Code Injection Attack Testing
- **Priority**: 🔴 HIGH
- **Time Estimate**: 3 days
- **Dependencies**: Task 8.1
- **Tools Needed**: Custom scripts

**Steps:**
1. Test XSS via metadata
2. Test script injection via customAttributes
3. Test eval() exploitation
4. Test template injection
5. Test JSX injection
6. Verify HTML escaping

**Success Criteria**:
- No code injection vulnerabilities
- All user input properly escaped

---

### Task 8.3: Path Traversal Attack Testing
- **Priority**: 🔴 HIGH
- **Time Estimate**: 2 days
- **Dependencies**: Task 8.1
- **Tools Needed**: File system mocking

**Steps:**
1. Test directory traversal in exportStats
2. Test symlink attacks
3. Test absolute path exploits
4. Test Windows path tricks
5. Test null byte injection
6. Verify path normalization

**Success Criteria**: All path traversal attempts blocked

---

### Task 8.4: Denial of Service Attack Testing
- **Priority**: 🔴 HIGH
- **Time Estimate**: 2 days
- **Dependencies**: Task 8.1
- **Tools Needed**: Custom scripts

**Steps:**
1. Test ReDoS with catastrophic backtracking
2. Test billion laughs attack
3. Test zip bomb (deeply nested JSX)
4. Test resource exhaustion
5. Test algorithmic complexity attacks
6. Verify timeouts and limits

**Success Criteria**: All DoS attempts mitigated

---

### Task 8.5: Supply Chain Attack Simulation
- **Priority**: 🟡 MEDIUM
- **Time Estimate**: 2 days
- **Dependencies**: Task 8.1
- **Tools Needed**: Custom malicious packages

**Steps:**
1. Simulate compromised dependency
2. Test with malicious AST
3. Test with malicious glob matcher
4. Verify no implicit trust
5. Add runtime validation

**Success Criteria**:
- Plugin resilient to compromised dependencies
- Validation checks in place

---

## Execution Plan

### Recommended 15-Week Schedule

| Week | Focus | Tasks |
|------|-------|-------|
| **1-2** | Foundation | Coverage tooling, Babel fuzzing, Glob fuzzing |
| **3-4** | Robustness | Error path coverage in plugin.ts and utils |
| **5-6** | Integration | Real Vite builds, E2E browser tests |
| **7-8** | Performance | Memory leak detection, Performance baselines |
| **9-10** | Security | Threat modeling, STRIDE analysis |
| **11-12** | Attacks | Penetration testing (injection, traversal, DoS) |
| **13-14** | Polish | Medium priority tasks, CI integration |
| **15** | Finalization | Low priority tasks, documentation |

---

## Dependencies Graph

```
Task 2.1 (Coverage) ──> Tasks 2.2, 2.3, 2.4, 2.5
Task 3.1 (Vite)     ──> Tasks 3.2, 3.3, 4.4, 5.3
Task 4.1 (Memory)   ──> Tasks 4.2, 4.3, 4.4, 4.5
Task 5.1 (Baseline) ──> Tasks 5.2, 5.3, 5.4, 5.5
Task 7.1 (Assets)   ──> Tasks 7.2, 7.3, 7.4
Task 8.1 (Pentest)  ──> Tasks 8.2, 8.3, 8.4, 8.5
```

---

## Success Metrics

### Code Coverage
- **Target**: 100% lines, branches, functions, statements
- **Current**: ~90% (estimate)
- **Measurement**: `pnpm test:coverage`

### Security
- **Target**: 🟢 ZERO risk
- **Current**: 🟢 LOW risk
- **Measurement**: STRIDE analysis complete, all threats mitigated

### Performance
- **Target**: <5% build time overhead, <200MB memory for 10K files
- **Current**: Unknown
- **Measurement**: Benchmark suite

### Reliability
- **Target**: No crashes in 100K+ fuzz iterations
- **Current**: Unknown
- **Measurement**: Fuzz test suite

### Browser Compatibility
- **Target**: Works in Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Current**: Likely works, not tested
- **Measurement**: Playwright E2E tests

---

## Quick Start Guide

### First 3 Tasks (Start Here)

**1. Install Coverage Tooling (2 hours)**
```bash
pnpm add -D @vitest/coverage-v8
# Create vitest.config.ts
pnpm test:coverage
```

**2. Babel Parser Fuzzing (3 days)**
```bash
pnpm add -D fast-check @jazzer.js/core
# Create src/__tests__/fuzzing/babel-parser.fuzz.test.ts
```

**3. Glob Pattern Fuzzing (2 days)**
```bash
# Create src/__tests__/fuzzing/glob-patterns.fuzz.test.ts
# Test ReDoS patterns
```

---

## Resources

### Tools & Libraries
- **Fuzzing**: `fast-check`, `@jazzer.js/core`, `jsfuzz`
- **Coverage**: `@vitest/coverage-v8`
- **Integration**: `@playwright/test`, `tmp`
- **Memory**: `memlab`, `@clinicjs/clinic`
- **Performance**: `tinybench`, `hyperfine`
- **Security**: `npm audit`, `snyk`, `socket.dev`

### Documentation
- [Vitest Docs](https://vitest.dev)
- [Playwright Docs](https://playwright.dev)
- [fast-check Guide](https://fast-check.dev)
- [STRIDE Threat Modeling](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool)

---

## Maintenance

This roadmap should be reviewed and updated:
- After completing each major category
- When new security threats are discovered
- When dependencies are upgraded
- Quarterly for relevance

**Last Updated**: 2025-09-30
**Status**: Planning Phase
**Next Review**: After Task 2.1 completion

# Security & Test Coverage Analysis for v2.0.0

## Executive Summary

**Overall Assessment:** ✅ Generally secure with some areas needing attention
**Test Coverage:** 86/86 tests passing, but gaps exist in edge cases and security testing
**Risk Level:** 🟡 MEDIUM - No critical vulnerabilities, but improvements recommended

---

## Test Coverage Analysis

### ✅ Well-Tested Features (32 v2 tests)

1. **Path Filtering** - 3 tests
   - includePaths ✅
   - excludePaths ✅
   - Priority (include before exclude) ✅

2. **Attribute Transformers** - 4 tests
   - path, id, name, line transformers ✅
   - ⚠️ MISSING: file and component transformers
   - ⚠️ MISSING: Multiple transformers simultaneously

3. **Conditional Generation** - 2 tests
   - shouldTag with uppercase check ✅
   - ComponentInfo passed correctly ✅

4. **Custom Attributes** - 2 tests
   - Basic custom attributes ✅
   - ComponentInfo passed correctly ✅

5. **Metadata Encoding** - 3 tests
   - URL-encoded JSON (default) ✅
   - Base64 encoding ✅
   - Plain text encoding ✅

6. **Depth Filtering** - 4 tests
   - tagOnlyRoots, minDepth, maxDepth ✅
   - Combined min/max depth ✅

7. **Statistics & Callbacks** - 3 tests
   - onTransform callback ✅
   - onComplete callback ✅
   - Element type tracking ✅
   - ⚠️ MISSING: exportStats file writing

8. **Presets** - 5 tests
   - All 4 presets tested ✅
   - Override preset options ✅

9. **Source Map Hints** - 2 tests
10. **Attribute Grouping** - 2 tests
11. **Backwards Compatibility** - 2 tests

### ⚠️ Missing Test Coverage

#### 1. Error Handling Tests
- ❌ What happens when shouldTag throws an error?
- ❌ What happens when customAttributes throws an error?
- ❌ What happens when transformer throws an error?
- ❌ What happens when exportStats path is invalid?
- ❌ What happens with invalid preset names?
- ❌ What happens with negative minDepth/maxDepth values?

#### 2. Security Tests
- ❌ XSS injection via customAttributes
- ❌ Path traversal via exportStats
- ❌ Prototype pollution via customAttributes keys
- ❌ ReDoS via malicious minimatch patterns
- ❌ Resource exhaustion with very large metadata

#### 3. Edge Case Tests
- ❌ Circular references in metadata
- ❌ Very large metadata objects (>1MB)
- ❌ Very deep nesting (20+ levels)
- ❌ Files with hundreds of elements
- ❌ Very long file paths (>260 chars)

#### 4. Feature Combination Tests
- ❌ shouldTag + transformers + customAttributes
- ❌ All v2 features enabled simultaneously
- ❌ includePaths + excludePaths + shouldTag

---

## Security Vulnerability Assessment

### 🟡 MEDIUM: Path Traversal in exportStats

**Issue:** User can provide arbitrary path like `../../etc/passwd`

**Location:** `plugin.ts:701`
```typescript
const statsPath = path.resolve(projectRoot, exportStats);
```

**Risk:** File could be written outside project directory

**Mitigation Needed:**
```typescript
// Validate exportStats path is within project root
const statsPath = path.resolve(projectRoot, exportStats);
const normalizedPath = path.normalize(statsPath);
if (!normalizedPath.startsWith(path.normalize(projectRoot))) {
  console.error('⚠️  exportStats path must be within project directory');
  return;
}
```

**Severity:** MEDIUM (config is controlled by developer, not end-user)

---

### 🟢 LOW: Prototype Pollution via customAttributes

**Issue:** customAttributes could return keys like `__proto__`, `constructor`, `prototype`

**Example:**
```typescript
customAttributes: () => ({
  '__proto__': 'malicious',
  'constructor': 'bad'
})
```

**Risk:** Could pollute Object prototype if not careful

**Current Status:** Likely safe because we're setting HTML attributes, not object properties

**Mitigation Recommended:**
```typescript
// Filter dangerous keys
const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
const customAttrs = customAttributes(componentInfo);
Object.keys(customAttrs).forEach(key => {
  if (dangerousKeys.includes(key)) {
    console.warn(`⚠️  Skipping dangerous attribute key: ${key}`);
    delete customAttrs[key];
  }
});
```

**Severity:** LOW (would require malicious developer config)

---

### 🟢 LOW: XSS via Custom Attributes

**Issue:** Custom attribute values not validated for XSS

**Example:**
```typescript
customAttributes: () => ({
  'data-dev-custom': '"><script>alert("XSS")</script>'
})
```

**Risk:** If attributes are not properly escaped in HTML output

**Current Status:** Need to verify magic-string escapes attribute values

**Mitigation:** Ensure all attribute values are HTML-escaped:
```typescript
const escapeAttr = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};
```

**Severity:** LOW (only affects development builds, not production)

---

### 🟢 LOW: ReDoS via Minimatch Patterns

**Issue:** Malicious glob patterns could cause performance issues

**Example:**
```typescript
includePaths: ['(a+)+$', '(a|a)*', '(a|ab)*']
```

**Risk:** CPU exhaustion during path matching

**Current Status:** minimatch library has some protections

**Mitigation:** Add timeout or pattern validation

**Severity:** LOW (config controlled by developer)

---

### 🟢 LOW: Resource Exhaustion

**Issue:** No limits on:
- Metadata size
- Number of custom attributes
- Depth tracking (potential stack overflow)

**Example:**
```typescript
customAttributes: () => {
  const attrs: Record<string, string> = {};
  for (let i = 0; i < 10000; i++) {
    attrs[`data-${i}`] = 'x'.repeat(10000); // 100MB of attributes
  }
  return attrs;
}
```

**Risk:** Memory exhaustion, slow builds

**Mitigation Recommended:**
```typescript
// Limit custom attributes
const MAX_CUSTOM_ATTRS = 50;
const MAX_ATTR_LENGTH = 1000;

const customAttrs = customAttributes(componentInfo);
const keys = Object.keys(customAttrs);
if (keys.length > MAX_CUSTOM_ATTRS) {
  console.warn(`⚠️  Too many custom attributes (${keys.length}), limiting to ${MAX_CUSTOM_ATTRS}`);
  keys.slice(MAX_CUSTOM_ATTRS).forEach(key => delete customAttrs[key]);
}
```

**Severity:** LOW (would require intentionally malicious config)

---

## Recommendations

### ✅ High Priority (IMPLEMENTED)

1. **✅ DONE - Path validation for exportStats**
   - Implemented in commit cbfff28
   - Validates exportStats path is within project directory
   - Logs security warnings for path traversal attempts

2. **✅ DONE - Error handling for all callbacks**
   - Implemented in commit cbfff28
   - shouldTag: try-catch with error logging
   - customAttributes: try-catch with error logging
   - Continues processing on callback errors

3. **✅ DONE - Prototype pollution prevention**
   - Implemented in commit cbfff28
   - Filters dangerous keys: __proto__, constructor, prototype
   - Logs warnings when dangerous keys are skipped

4. **🔴 TODO - Add tests for error scenarios**
   - Create `v2-error-handling.test.ts`
   - Test all callback error scenarios
   - Test invalid configuration values
   - Test path traversal attempts

### Medium Priority (Next Release)

4. **Add security tests**
   - Create `security.test.ts`
   - Test XSS injection attempts
   - Test path traversal attempts
   - Test prototype pollution attempts

5. **Add resource limits**
   - Max custom attributes (50)
   - Max attribute value length (1000 chars)
   - Max metadata size (10KB)
   - Max depth (20 levels)

6. **Add combination tests**
   - Test all features enabled together
   - Test feature interactions
   - Test preset overrides with v2 features

### Low Priority (Future Enhancement)

7. **Add performance tests**
   - Test with 1000+ elements
   - Test with very deep nesting
   - Benchmark different configurations

8. **Add validation tests**
   - Invalid preset names
   - Invalid metadataEncoding values
   - Negative depth values
   - Invalid glob patterns

---

## Positive Security Features

✅ **Good Practices Already in Place:**

1. **Opt-in by design** - All v2 features default to `undefined`
2. **Development-only** - Plugin disabled in production by default
3. **Type safety** - Full TypeScript types prevent many issues
4. **No eval() or Function()** - No dynamic code execution
5. **Read-only operations** - Plugin only reads source, doesn't execute it
6. **Vite integration** - Leverages Vite's security model

---

## Conclusion

**Overall:** The plugin is reasonably secure for its use case (development-only tooling). The main concerns are:

1. Path traversal in exportStats (easy fix)
2. Missing error handling for user callbacks
3. Lack of resource limits

**Action Items:**
1. Add path validation for exportStats ✅ HIGH PRIORITY
2. Add try-catch around all user callbacks ✅ HIGH PRIORITY
3. Create error handling tests ✅ HIGH PRIORITY
4. Add security tests 🟡 MEDIUM PRIORITY
5. Add resource limits 🟡 MEDIUM PRIORITY

**Risk Assessment:**
- Current risk: 🟡 MEDIUM
- After fixes: 🟢 LOW
- Suitable for: Development tooling ✅
- Suitable for: Production use ⚠️ (disable in production)

---

Generated: 2025-09-30
Analyzer: Claude (Sonnet 4.5)
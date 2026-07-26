// Regression coverage for the defects fixed in v2.2.2.
// Every test here failed against v2.2.1.
import { describe, it, expect, vi } from 'vitest';
import { componentDebugger } from '../plugin';
import * as publicEntry from '../index';
import { sanitizeExportPath } from '../utils';
import { compilePatterns, matchesCompiledPatterns } from '../helpers/path-matching';
import { generateAttributes } from '../helpers/attribute-generator';

const transform = async (plugin: any, code: string, id: string) =>
  await plugin.transform.call({} as any, code, id);

/** Assert a transform produced output, then hand back the code. */
const codeOf = (result: any): string => {
  expect(result, 'transform returned null - assertions would pass vacuously').not.toBeNull();
  expect(result.code).toBeTypeOf('string');
  return result.code;
};

describe('metadata encoding', () => {
  it('does not double-escape quotes with metadataEncoding: "none"', async () => {
    const plugin = componentDebugger({ includeProps: true, metadataEncoding: 'none' });
    const code = codeOf(await transform(plugin, `<div title="hi" />`, '/proj/App.tsx'));

    expect(code).not.toContain('&amp;quot;');

    const raw = code.match(/data-dev-metadata="([^"]*)"/)![1];
    const decoded = raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    expect(JSON.parse(decoded)).toEqual({ title: 'hi' });
  });

  it('honours metadataEncoding: "none" when groupAttributes is set', async () => {
    const plugin = componentDebugger({
      groupAttributes: true,
      metadataEncoding: 'none',
      includeAttributes: ['name']
    });
    const code = codeOf(await transform(plugin, `<div />`, '/proj/App.tsx'));

    // Previously URL-encoded regardless of the 'none' setting
    expect(code).not.toContain('%7B');
    const raw = code.match(/data-dev="([^"]*)"/)![1];
    expect(JSON.parse(raw.replace(/&quot;/g, '"'))).toEqual({ name: 'div' });
  });

  it('emits valid JSON at every truncation cut point', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (let pad = 10180; pad < 10240; pad++) {
      const value = 'x'.repeat(pad) + '\\'.repeat(20) + 'y'.repeat(3000);
      const attrs = generateAttributes(
        { path: 'a.tsx', line: 1, column: 0, file: 'a.tsx', name: 'div', props: { t: value } },
        'data-dev',
        ['metadata']
      );
      const raw = attrs.match(/data-dev-metadata="([^"]*)"/)![1];
      const decoded = decodeURIComponent(raw.replace(/&amp;/g, '&').replace(/&quot;/g, '"'));
      // Slicing serialized JSON used to cut escape sequences in half
      expect(() => JSON.parse(decoded), `invalid JSON at pad=${pad}`).not.toThrow();
    }
    warn.mockRestore();
  });
});

describe('file id handling', () => {
  it('processes ids that carry a Vite query suffix', async () => {
    for (const id of ['/proj/App.tsx?v=abc123', '/proj/App.tsx?t=1700000000', '/proj/App.jsx?import']) {
      const code = codeOf(await transform(componentDebugger(), `<div />`, id));
      expect(code).toContain('data-dev-id=');
    }
  });

  it('strips the query before deriving path attributes', async () => {
    const plugin = componentDebugger({ includeAttributes: ['file'] });
    const code = codeOf(await transform(plugin, `<div />`, '/proj/App.tsx?v=abc'));
    expect(code).toContain('data-dev-file="App.tsx"');
    expect(code).not.toContain('?v=abc');
  });

  it('still skips node_modules and unknown extensions', async () => {
    expect(await transform(componentDebugger(), `<div />`, '/proj/node_modules/x/A.tsx?v=1')).toBeNull();
    expect(await transform(componentDebugger(), `<div />`, '/proj/App.vue')).toBeNull();
  });
});

describe('public entry point', () => {
  it('exposes the plugin as both a default and a named export', () => {
    expect(publicEntry.default).toBeTypeOf('function');
    expect(publicEntry.componentDebugger).toBeTypeOf('function');
    expect(publicEntry.componentDebugger).toBe(publicEntry.default);
  });

  it('returns a well-formed Vite plugin object', () => {
    const plugin = publicEntry.componentDebugger();
    expect(plugin.name).toBe('vite-plugin-component-debugger');
    expect(plugin.enforce).toBe('pre');
  });
});

describe('element naming', () => {
  it('resolves deeply nested member expressions', async () => {
    const plugin = componentDebugger({ includeAttributes: ['name'] });
    const code = codeOf(await transform(plugin, `const a = <A.B.C />;`, '/proj/App.tsx'));
    // Previously emitted "undefined.C"
    expect(code).toContain('data-dev-name="A.B.C"');
    expect(code).not.toContain('undefined');
  });

  it('still resolves single-level member expressions', async () => {
    const plugin = componentDebugger({ includeAttributes: ['name'] });
    const code = codeOf(await transform(plugin, `const a = <Foo.Bar />;`, '/proj/App.tsx'));
    expect(code).toContain('data-dev-name="Foo.Bar"');
  });
});

describe('fragment depth consistency', () => {
  const cases: Array<[string, string]> = [
    ['shorthand', `<><div /></>`],
    ['explicit', `<Fragment><div /></Fragment>`],
    ['namespaced', `<React.Fragment><div /></React.Fragment>`]
  ];

  it.each(cases)('tagOnlyRoots tags the child of a %s fragment', async (_label, source) => {
    const plugin = componentDebugger({ tagOnlyRoots: true, includeAttributes: ['name'] });
    const code = codeOf(await transform(plugin, `const a = ${source};`, '/proj/App.tsx'));
    expect(code).toContain('data-dev-name="div"');
  });

  it('keeps counting non-fragment nesting', async () => {
    const plugin = componentDebugger({ tagOnlyRoots: true, includeAttributes: ['name'] });
    const code = codeOf(await transform(plugin, `const a = <div><span /></div>;`, '/proj/App.tsx'));
    expect(code).toContain('data-dev-name="div"');
    expect(code).not.toContain('data-dev-name="span"');
  });
});

describe('per-file transform statistics', () => {
  it('reports only the current file\'s element names', async () => {
    const seen: any[] = [];
    const plugin = componentDebugger({ onTransform: (s) => seen.push(s) });

    await transform(plugin, `<div />`, '/proj/A.tsx');
    await transform(plugin, `<span />`, '/proj/B.tsx');

    expect(seen[0].elementNames).toEqual(['div']);
    expect(seen[1].elementNames).toEqual(['span']); // was ['div','span']
    expect(seen[1].elementsTagged).toBe(1);
  });

  it('resets accumulated stats on buildStart', async () => {
    let completion: any;
    const plugin: any = componentDebugger({ onComplete: (s) => (completion = s) });

    await transform(plugin, `<div />`, '/proj/A.tsx');
    plugin.buildStart.call({} as any, {} as any);
    await transform(plugin, `<span />`, '/proj/B.tsx');

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    plugin.buildEnd.call({} as any);
    log.mockRestore();

    expect(completion.totalElements).toBe(1); // was 2
    expect(Object.keys(completion.byElementType)).toEqual(['span']);
  });

  it('counts element names that collide with Object.prototype members', async () => {
    let completion: any;
    const plugin: any = componentDebugger({ onComplete: (s) => (completion = s) });

    await transform(plugin, `const a = <constructor />;`, '/proj/A.tsx');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    plugin.buildEnd.call({} as any);
    log.mockRestore();

    // Was the string "function Object() { [native code] }1"
    expect(completion.byElementType.constructor).toBe(1);
  });
});

describe('attribute name safety', () => {
  it('rejects a customAttributes key that would inject JSX', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = componentDebugger({
      includeAttributes: [],
      customAttributes: () => ({ 'x={alert(1)} y': 'z' })
    });
    const result: any = await transform(plugin, `const a = <div />;`, '/proj/App.tsx');
    warn.mockRestore();

    // Nothing safe to emit, so the file is left untouched
    if (result !== null) {
      expect(result.code).not.toContain('alert(1)');
    }
  });

  it('rejects an attributePrefix that would break out of the attribute', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = componentDebugger({
      attributePrefix: 'a"onerror="evil()',
      includeAttributes: ['name']
    });
    const result: any = await transform(plugin, `const a = <div />;`, '/proj/App.tsx');
    warn.mockRestore();

    if (result !== null) {
      expect(result.code).not.toContain('onerror');
    }
  });

  // The prefix used to be stripped AFTER the dangerous-key check, so
  // 'data-dev-<dangerous>' slipped through as '<dangerous>'.
  //
  // Note: '__proto__' alone is a weak probe. Assigning a string to __proto__ on a
  // plain object is silently discarded, so that case looks fixed even when the
  // guard is bypassed. 'constructor' and 'prototype' create real own properties
  // and are what actually distinguish the two code paths.
  it.each(['constructor', 'prototype', '__proto__'])(
    'drops a prefixed %s custom key',
    async (dangerous) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const plugin = componentDebugger({
        includeAttributes: ['id'],
        customAttributes: () => ({ [`data-dev-${dangerous}`]: 'pwned' } as any)
      });
      const code = codeOf(await transform(plugin, `<div />`, '/proj/App.tsx'));
      warn.mockRestore();

      expect(code).not.toContain(dangerous);
      expect(code).not.toContain('pwned');
    }
  );

  it('drops an unprefixed dangerous custom key', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = componentDebugger({
      includeAttributes: ['id'],
      customAttributes: () => ({ constructor: 'pwned' } as any)
    });
    const code = codeOf(await transform(plugin, `<div />`, '/proj/App.tsx'));
    warn.mockRestore();

    expect(code).not.toContain('pwned');
  });

  it('still allows normal custom attributes', async () => {
    const plugin = componentDebugger({
      includeAttributes: [],
      customAttributes: () => ({ env: 'test', 'data-dev-branch': 'main' })
    });
    const code = codeOf(await transform(plugin, `<div />`, '/proj/App.tsx'));
    expect(code).toContain('data-dev-env="test"');
    expect(code).toContain('data-dev-branch="main"');
  });
});

describe('path filtering', () => {
  it('matches forward-slash globs against Windows-style separators', () => {
    const compiled = compilePatterns(['src/**']);
    expect(matchesCompiledPatterns('src\\components\\App.tsx', compiled)).toBe(true);
    expect(matchesCompiledPatterns('src/components/App.tsx', compiled)).toBe(true);
    expect(matchesCompiledPatterns('lib\\App.tsx', compiled)).toBe(false);
  });

  it('treats an uncompilable pattern as non-matching rather than crashing', () => {
    const compiled = compilePatterns(['*'.repeat(20)]); // exceeds wildcard cap
    expect(compiled[0].regex).toBeNull();
    expect(matchesCompiledPatterns('anything.tsx', compiled)).toBe(false);
  });
});

describe('exportStats path containment', () => {
  it('rejects a sibling directory that shares the root prefix', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(sanitizeExportPath('/home/u/project-evil/out.json', '/home/u/project')).toBeNull();
    err.mockRestore();
  });

  it('accepts paths inside the root', () => {
    expect(sanitizeExportPath('stats.json', '/home/u/project')).toBe('/home/u/project/stats.json');
    expect(sanitizeExportPath('build/stats.json', '/home/u/project')).toBe(
      '/home/u/project/build/stats.json'
    );
  });

  it('rejects traversal segments', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(sanitizeExportPath('../out.json', '/home/u/project')).toBeNull();
    err.mockRestore();
  });
});

describe('three.js import exclusion', () => {
  it('does not skip components from unrelated packages containing "three"', async () => {
    const plugin = componentDebugger({ includeAttributes: ['name'] });
    const code = codeOf(
      await transform(
        plugin,
        `import { Card } from 'three-column-layout';\nconst a = <Card />;`,
        '/proj/App.tsx'
      )
    );
    expect(code).toContain('data-dev-name="Card"');
  });

  it('still skips real three.js and drei imports', async () => {
    const plugin = componentDebugger({ includeAttributes: ['name'] });
    const result: any = await transform(
      plugin,
      `import { Text } from '@react-three/drei';\nimport { Mesh } from 'three';\nconst a = <Text />;`,
      '/proj/App.tsx'
    );
    expect(result).toBeNull(); // nothing tagged
  });
});

describe('production preset', () => {
  it('emits a shortened path, matching the documented behaviour', async () => {
    const plugin = componentDebugger({ preset: 'production' });
    const code = codeOf(await transform(plugin, `<div />`, `${process.cwd()}/src/deep/App.tsx`));
    expect(code).toContain('data-dev-path="deep/App.tsx"');
  });
});

describe('source maps', () => {
  it('names the source file and inlines its content', async () => {
    const plugin = componentDebugger({ includeAttributes: ['name'] });
    const result: any = await transform(plugin, `const a = <div />;`, '/proj/src/App.tsx');
    expect(result.map.sources).toEqual(['/proj/src/App.tsx']); // was ['']
    expect(result.map.sourcesContent?.[0]).toContain('<div />');
  });
});

describe('vite root resolution', () => {
  it('prefers the resolved Vite root over process.cwd()', async () => {
    const plugin: any = componentDebugger({ includeAttributes: ['path'] });
    plugin.configResolved.call({} as any, { root: '/custom/root' } as any);
    const code = codeOf(await transform(plugin, `<div />`, '/custom/root/src/App.tsx'));
    expect(code).toContain('data-dev-path="src/App.tsx"');
  });
});

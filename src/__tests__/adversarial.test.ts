// Adversarial / property-based suite.
//
// These tests do not check that the plugin works. They try to break it.
//
// The load-bearing invariant for a source-rewriting plugin is that it must never
// corrupt the module. Everything here attacks that:
//
//   P1  output re-parses as valid JSX/TSX
//   P2  removing the injected attributes recovers the original source byte-for-byte
//   P3  the reported line/column actually points at the element in the source
//   P4  attribute values survive a round-trip through JSX entity decoding
//   P5  no input causes a throw or a hang
import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import { componentDebugger } from '../plugin';
import type { TagOptions } from '../types';

const PREFIX = 'data-zz';

const transform = async (options: TagOptions, code: string, id = '/proj/src/App.tsx') =>
  await (componentDebugger(options) as any).transform.call({} as any, code, id);

const reparse = (code: string) =>
  parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript', 'decorators'] });

/** Remove every injected `prefix-*="..."` attribute, including its leading space. */
const stripInjected = (code: string) =>
  code.replace(new RegExp(`\\s${PREFIX}(?:-[A-Za-z0-9_.:-]+)?="[^"]*"`, 'g'), '');

/** JSX decodes HTML entities in quoted string attribute values. */
const decodeEntities = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

//
// Hand-built corpus of JSX that has a plausible shot at breaking a naive
// string-splicing rewriter.
//
const CORPUS: Array<[string, string]> = [
  ['simple self-closing', `const a = <div />;`],
  ['no space before slash', `const a = <div/>;`],
  ['many spaces before slash', `const a = <div     />;`],
  ['newline before slash', `const a = <div\n\n/>;`],
  ['tab before slash', `const a = <div\t/>;`],
  ['attr string contains />', `const a = <img alt="a/>b" />;`],
  ['attr string contains >', `const a = <img alt="a>b" />;`],
  ['attr string contains <', `const a = <img alt="a<b" />;`],
  ['attr string contains quote entity', `const a = <img alt="say &quot;hi&quot;" />;`],
  ['attr single quotes', `const a = <img alt='a/>b' />;`],
  ['arrow fn in prop', `const a = <B onClick={(x) => x > 1} />;`],
  ['arrow returning jsx', `const a = <B render={() => <C />} />;`],
  ['arrow returning jsx with children', `const a = <B render={() => <C>hi</C>} />;`],
  ['nested jsx in prop, outer has children', `const a = <B icon={<C />}>text</B>;`],
  ['regex literal containing />', `const a = <B re={/a\\/>b/} />;`],
  ['regex literal containing >', `const a = <B re={/>/} />;`],
  ['template literal with jsx-ish text', 'const a = <B t={`<div />`} />;'],
  ['template literal with nested expr', 'const a = <B t={`${x > 1 ? "a" : "b"}`} />;'],
  ['comment inside opening element', `const a = <div /* hi */ />;`],
  ['line comment inside opening element', `const a = <div // hi\n/>;`],
  ['comment containing />', `const a = <div /* a /> b */ />;`],
  ['spread attribute', `const a = <div {...props} />;`],
  ['spread with nested object', `const a = <div {...{ a: 1, b: 2 }} />;`],
  ['ts generic on component', `const a = <Select<string> value={v} />;`],
  ['ts generic with two params', `const a = <M<string, number> v={v} />;`],
  ['ts assertion in prop', `const a = <B v={x as unknown as string} />;`],
  ['member expression', `const a = <Foo.Bar />;`],
  ['deep member expression', `const a = <A.B.C.D />;`],
  ['namespaced name', `const a = <svg:circle />;`],
  ['attr with namespaced name', `const a = <svg xlink:href="#x" />;`],
  ['dashed attr name', `const a = <div data-foo="1" aria-label="x" />;`],
  ['unicode text', `const a = <div>héllo wörld</div>;`],
  ['emoji text', `const a = <div>🎉🚀</div>;`],
  ['emoji in attribute', `const a = <div title="🎉" />;`],
  ['surrogate pair in attribute', `const a = <div title="𝕏𝕐𝖹" />;`],
  ['rtl text', `const a = <div>שלום עולם</div>;`],
  ['zero width joiner', `const a = <div>👨‍👩‍👧‍👦</div>;`],
  ['fragment shorthand', `const a = <><div /><span /></>;`],
  ['explicit fragment', `const a = <Fragment><div /></Fragment>;`],
  ['nested fragments', `const a = <><><div /></></>;`],
  ['deeply nested', `const a = <a><b><c><d><e><f /></e></d></c></b></a>;`],
  ['multiline attrs', `const a = (\n  <div\n    className="x"\n    id="y"\n  />\n);`],
  ['multiline with children', `const a = (\n  <div\n    className="x"\n  >\n    hi\n  </div>\n);`],
  ['conditional children', `const a = <div>{cond ? <A /> : <B />}</div>;`],
  ['map over children', `const a = <ul>{xs.map((x) => <li key={x}>{x}</li>)}</ul>;`],
  ['empty expression container', `const a = <div>{}</div>;`],
  ['jsx text with braces', `const a = <div>{"{"}</div>;`],
  ['boolean prop', `const a = <div disabled />;`],
  ['attr value is empty string', `const a = <div title="" />;`],
  ['adjacent elements', `const a = <><div /><div /><div /></>;`],
  ['element inside template in prop', 'const a = <B t={`x`}><C /></B>;',],
  ['crlf line endings', `const a = <div\r\n  className="x"\r\n/>;`],
  ['decorator + class + jsx', `@dec\nclass X {\n  r() { return <div />; }\n}`],
  ['enum + jsx', `enum E { A }\nconst a = <div />;`],
  ['satisfies operator', `const a = <div /> satisfies unknown;`],
  ['optional chaining in prop', `const a = <B v={x?.y?.z} />;`],
  ['nullish coalescing in prop', `const a = <B v={x ?? "d"} />;`],
  ['jsx in default param', `const f = (n = <div />) => n;`],
  ['jsx returned from ternary', `const a = c ? <A /> : <B />;`],
  ['comment between attrs', `const a = <div a="1" /* c */ b="2" />;`],
  ['string with backslash', `const a = <div title="a\\\\b" />;`],
  ['string with newline escape', `const a = <div title="a\\nb" />;`]
];

//
// Config matrix. Each is applied to the whole corpus.
//
const CONFIGS: Array<[string, TagOptions]> = [
  ['defaults', {}],
  ['all attributes', { includeProps: true, includeContent: true }],
  ['minimal preset', { preset: 'minimal' }],
  ['testing preset', { preset: 'testing' }],
  ['debugging preset', { preset: 'debugging', debug: false }],
  ['production preset', { preset: 'production' }],
  ['base64 metadata', { includeProps: true, metadataEncoding: 'base64' }],
  ['raw metadata', { includeProps: true, includeContent: true, metadataEncoding: 'none' }],
  ['grouped', { groupAttributes: true, includeProps: true }],
  ['grouped raw', { groupAttributes: true, includeProps: true, metadataEncoding: 'none' }],
  ['sourcemap hints', { includeSourceMapHints: true }],
  ['maxDepth 2', { maxDepth: 2 }],
  ['minDepth 2', { minDepth: 2 }],
  ['tagOnlyRoots', { tagOnlyRoots: true }],
  ['custom attributes', { customAttributes: () => ({ env: 'test', n: '1' }) }],
  ['transformers', { transformers: { path: (p) => p.toUpperCase(), line: (l) => `L${l}` } }],
  ['shouldTag half', { shouldTag: (i) => i.line % 2 === 0 }]
];

// Guard against the suite quietly going vacuous. Most cases above bail out with
// `if (result === null) return`, which is exactly the pattern that lets the
// existing v2.2.1 tests pass without asserting anything. If a future change makes
// transform() return null more often, this fails loudly instead of going green.
describe('suite is not vacuous', () => {
  it('actually exercises the assertions on most corpus x config pairs', async () => {
    let transformed = 0;
    let skipped = 0;
    let attributesInjected = 0;

    for (const [, cfgBase] of CONFIGS) {
      for (const [, source] of CORPUS) {
        const result: any = await transform({ ...cfgBase, attributePrefix: PREFIX }, source);
        if (result === null) {
          skipped++;
        } else {
          transformed++;
          attributesInjected += (result.code.match(new RegExp(PREFIX, 'g')) || []).length;
        }
      }
    }

    const total = transformed + skipped;
    const rate = transformed / total;
    console.log(
      `non-vacuity: ${transformed}/${total} pairs transformed (${(rate * 100).toFixed(1)}%), ` +
        `${attributesInjected} attributes injected`
    );

    expect(total).toBe(CONFIGS.length * CORPUS.length);
    expect(rate).toBeGreaterThan(0.6);
    expect(attributesInjected).toBeGreaterThan(1000);
  });
});

describe('P1/P2: transform never corrupts source', () => {
  for (const [cfgName, cfgBase] of CONFIGS) {
    const cfg = { ...cfgBase, attributePrefix: PREFIX };

    describe(`config: ${cfgName}`, () => {
      for (const [name, source] of CORPUS) {
        it(`${name}`, async () => {
          // The source itself must be valid, or the case is bogus
          expect(() => reparse(source), 'corpus entry is not valid JSX').not.toThrow();

          const result: any = await transform(cfg, source);
          if (result === null) return; // nothing tagged is a legitimate outcome

          // P1: output must still parse
          expect(() => reparse(result.code), `output does not parse:\n${result.code}`).not.toThrow();

          // P2: removing injected attributes must recover the original exactly.
          // Grouped mode emits `prefix="..."` which the strip regex also covers.
          expect(stripInjected(result.code), `round-trip mismatch:\n${result.code}`).toBe(source);
        });
      }
    });
  }
});

describe('P3: reported position matches the source', () => {
  const positional: string[] = [
    `const a = <div />;`,
    `\n\n\nconst a = <div />;`,
    `const a = (\n  <div>\n    <span />\n  </div>\n);`,
    `// c\n/* block\n   comment */\nconst a = <div />;`,
    `const s = "\\n\\n\\n";\nconst a = <div />;`,
    'const t = `line\nline\nline`;\nconst a = <div />;',
    `const a = <div>héllo</div>;\nconst b = <span />;`,
    `const a = <div>🎉</div>;\nconst b = <span />;`
  ];

  it.each(positional)('line/column points at the element (case %#)', async (source) => {
    const result: any = await transform(
      { attributePrefix: PREFIX, includeAttributes: ['line'] },
      source
    );
    if (result === null) return;

    const lines = source.split('\n');
    const reported = [...result.code.matchAll(new RegExp(`${PREFIX}-line="(\\d+)"`, 'g'))].map((m) =>
      Number(m[1])
    );

    expect(reported.length).toBeGreaterThan(0);
    for (const ln of reported) {
      expect(ln).toBeGreaterThanOrEqual(1);
      expect(ln).toBeLessThanOrEqual(lines.length);
      // The reported line must actually contain a '<'
      expect(lines[ln - 1], `line ${ln} has no element: ${JSON.stringify(lines[ln - 1])}`).toContain(
        '<'
      );
    }
  });

  it('column is a valid offset into the reported line', async () => {
    const source = `const a = <div>\n      <span />\n</div>;`;
    const result: any = await transform(
      { attributePrefix: PREFIX, includeAttributes: ['id'] },
      source
    );
    const lines = source.split('\n');
    const ids = [...result.code.matchAll(new RegExp(`${PREFIX}-id="([^"]*)"`, 'g'))].map((m) => m[1]);

    for (const id of ids) {
      const [line, col] = id.split(':').slice(-2).map(Number);
      expect(lines[line - 1][col]).toBe('<');
    }
  });
});

describe('P4: attribute values round-trip through JSX decoding', () => {
  const nasty = [
    'plain',
    'has "double" quotes',
    "has 'single' quotes",
    'has <angle> brackets',
    'has & ampersand',
    'has &amp; pre-encoded entity',
    'has &quot; pre-encoded quote',
    'mixed <"&\'> everything',
    'unicode héllo 🎉 𝕏',
    'newline\nin value',
    'tab\tin value',
    'backslash \\ in value',
    'jsx-like <div className="x" />'
  ];

  it.each(nasty)('customAttributes value survives: %s', async (value) => {
    const result: any = await transform(
      { attributePrefix: PREFIX, includeAttributes: [], customAttributes: () => ({ v: value }) },
      `const a = <div />;`
    );
    expect(result).not.toBeNull();
    expect(() => reparse(result.code), `output does not parse for ${JSON.stringify(value)}`).not.toThrow();

    const raw = result.code.match(new RegExp(`${PREFIX}-v="([^"]*)"`))![1];
    expect(decodeEntities(raw)).toBe(value);
  });

  it.each(nasty)('prop metadata survives: %s', async (value) => {
    const jsonValue = JSON.stringify(value);
    const result: any = await transform(
      { attributePrefix: PREFIX, includeProps: true, includeAttributes: ['metadata'] },
      `const a = <div title={${jsonValue}} />;`
    );
    if (result === null) return;
    expect(() => reparse(result.code)).not.toThrow();

    const raw = result.code.match(new RegExp(`${PREFIX}-metadata="([^"]*)"`))![1];
    const decoded = JSON.parse(decodeURIComponent(decodeEntities(raw)));
    expect(decoded.title).toBe(value);
  });
});

describe('P5: hostile input does not throw or corrupt', () => {
  const hostile: Array<[string, string]> = [
    ['empty file', ''],
    ['whitespace only', '   \n\n\t  '],
    ['no jsx at all', `const a = 1 + 2;`],
    ['syntax error', `const a = <div;`],
    ['unterminated element', `const a = <div>`],
    ['unterminated string', `const a = <div title="x />;`],
    ['lone angle bracket', `const a = 1 < 2;`],
    ['generic fn not jsx', `const f = <T,>(x: T) => x;`],
    ['comparison chain', `const a = x < y > z;`],
    ['html comment sequence', `const a = <div>{/* <!-- --> */}</div>;`],
    ['very long attribute', `const a = <div title="${'x'.repeat(50000)}" />;`],
    ['many elements', `const a = <div>${'<span />'.repeat(2000)}</div>;`],
    ['deep nesting 200', '<a>'.repeat(200) + '<b />' + '</a>'.repeat(200)],
    ['bom prefix', '﻿' + `const a = <div />;`],
    ['null byte in string', `const a = <div title="a b" />;`],
    ['lone surrogate in string', `const a = <div title="a\uD800b" />;`]
  ];

  it.each(hostile)('%s', async (_name, source) => {
    let result: any;
    // P5: must not throw
    await expect(
      (async () => {
        result = await transform({ attributePrefix: PREFIX, includeProps: true }, source);
      })()
    ).resolves.not.toThrow();

    if (result === null) return;

    // If it did transform, output must parse and round-trip
    expect(() => reparse(result.code), `output does not parse:\n${result.code.slice(0, 300)}`).not.toThrow();
    expect(stripInjected(result.code)).toBe(source);
  });
});

//
// Seeded random fuzzer: compose JSX trees from fragments and check the same
// invariants. Deterministic so any failure is reproducible from the seed.
//
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const NAMES = ['div', 'span', 'Foo', 'Foo.Bar', 'A.B.C', 'section', 'my-el'];
const ATTRS = [
  '',
  ' className="x"',
  ' title="a/>b"',
  ' alt="a>b"',
  ' data-x="1"',
  ' {...props}',
  ' onClick={() => x > 1}',
  ' render={() => <C />}',
  ' re={/a\\/>b/}',
  ' t={`<div />`}',
  ' /* c */',
  ' disabled',
  ' title="🎉 héllo"',
  ' v={x as string}'
];
const TEXTS = ['', 'hello', 'héllo 🎉', '{expr}', '{cond ? <A /> : <B />}', '{"{"}'];

function genElement(rng: () => number, depth: number): string {
  const name = NAMES[Math.floor(rng() * NAMES.length)];
  let attrs = '';
  const nAttrs = Math.floor(rng() * 3);
  for (let i = 0; i < nAttrs; i++) attrs += ATTRS[Math.floor(rng() * ATTRS.length)];

  const selfClosing = depth <= 0 || rng() < 0.4;
  if (selfClosing) {
    const sep = rng() < 0.3 ? '' : rng() < 0.5 ? ' ' : '\n';
    return `<${name}${attrs}${sep}/>`;
  }

  let children = TEXTS[Math.floor(rng() * TEXTS.length)];
  const nKids = Math.floor(rng() * 3);
  for (let i = 0; i < nKids; i++) children += genElement(rng, depth - 1);
  const sep = rng() < 0.3 ? '\n' : '';
  return `<${name}${attrs}${sep}>${children}</${name}>`;
}

describe('fuzz: generated JSX preserves all invariants', () => {
  const CASES = 400;

  it(`${CASES} generated trees re-parse and round-trip`, async () => {
    const failures: string[] = [];
    let exercised = 0;
    let skippedUnparseable = 0;
    let skippedNull = 0;

    for (let seed = 1; seed <= CASES; seed++) {
      const rng = makeRng(seed);
      const source = `const a = ${genElement(rng, 3)};`;

      // Skip anything Babel itself rejects (generator can emit odd combos)
      try {
        reparse(source);
      } catch {
        skippedUnparseable++;
        continue;
      }

      const cfg = CONFIGS[seed % CONFIGS.length][1];
      let result: any;
      try {
        result = await transform({ ...cfg, attributePrefix: PREFIX }, source);
      } catch (e: any) {
        failures.push(`seed ${seed}: THREW ${e.message}\n${source}`);
        continue;
      }
      if (result === null) { skippedNull++; continue; }
      exercised++;

      try {
        reparse(result.code);
      } catch (e: any) {
        failures.push(`seed ${seed}: OUTPUT UNPARSEABLE ${e.message}\nIN : ${source}\nOUT: ${result.code}`);
        continue;
      }

      const stripped = stripInjected(result.code);
      if (stripped !== source) {
        failures.push(`seed ${seed}: ROUND-TRIP MISMATCH\nIN : ${source}\nOUT: ${result.code}\nSTR: ${stripped}`);
      }
    }

    console.log(
      `fuzz: ${exercised} trees asserted, ${skippedNull} produced no tags, ` +
        `${skippedUnparseable} generator rejects`
    );

    if (failures.length) {
      throw new Error(`${failures.length}/${CASES} fuzz failures:\n\n` + failures.slice(0, 5).join('\n\n'));
    }

    // The fuzzer must be doing real work, not silently skipping everything
    expect(exercised).toBeGreaterThan(CASES * 0.5);
  });
});

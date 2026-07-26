#!/usr/bin/env node
// Verifies the declared `peerDependencies.vite` range is actually true.
//
// For each Vite major, this packs the plugin, installs it into a throwaway app
// alongside that Vite version, runs a real `vite build`, and asserts the injected
// attributes are present with the right line numbers. Nothing is mocked.
//
// Usage:
//   node scripts/vite-compat.mjs            # every major in the peer range
//   node scripts/vite-compat.mjs 7 8        # only these majors

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));

// Majors named in the peer range, e.g. "^4.0.0 || ^5.0.0" -> [4, 5]
const declaredMajors = [...pkg.peerDependencies.vite.matchAll(/\^(\d+)\./g)].map((m) => Number(m[1]));
const majors = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number)
  : declaredMajors;

// Element name -> the 1-indexed source line it sits on in the fixture below
const EXPECTED = { div: 4, section: 5, span: 6 };

const FIXTURE = `import React from 'react';

export const tree = (
  <div className="app">
    <section title="a/>b">
      <span>hi</span>
    </section>
  </div>
);
`;

const VITE_CONFIG = `import componentDebugger from 'vite-plugin-component-debugger';

export default {
  plugins: [componentDebugger({ enabled: true, includeProps: true })],
  logLevel: 'error',
  build: {
    minify: false,
    lib: { entry: 'src/main.jsx', formats: ['es'], fileName: 'out' }
  }
};
`;

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

console.log(`Declared peer range: ${pkg.peerDependencies.vite}`);
console.log(`Testing majors: ${majors.join(', ')}\n`);

const work = mkdtempSync(join(tmpdir(), 'vite-compat-'));
let tarball;
try {
  run('npm', ['run', 'build'], repoRoot);
  tarball = join(work, run('npm', ['pack', '--pack-destination', work], repoRoot).trim().split('\n').pop());
} catch (e) {
  console.error('Failed to build/pack the plugin:', e.message);
  process.exit(1);
}

const results = [];

for (const major of majors) {
  const app = join(work, `v${major}`);
  mkdirSync(join(app, 'src'), { recursive: true });

  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify(
      {
        name: `compat-v${major}`,
        private: true,
        type: 'module',
        scripts: { build: 'vite build' },
        dependencies: { react: '^18.3.1' },
        devDependencies: {
          vite: `^${major}.0.0`,
          'vite-plugin-component-debugger': `file:${tarball}`
        }
      },
      null,
      2
    )
  );
  writeFileSync(join(app, 'vite.config.js'), VITE_CONFIG);
  writeFileSync(join(app, 'src', 'main.jsx'), FIXTURE);

  let installedVite = '?';
  try {
    run('npm', ['install', '--silent', '--no-audit', '--no-fund'], app);
    installedVite = JSON.parse(
      readFileSync(join(app, 'node_modules', 'vite', 'package.json'), 'utf8')
    ).version;
  } catch (e) {
    // An install failure here usually means the peer range excludes this major
    results.push({ major, version: installedVite, status: 'INSTALL FAILED', detail: e.message.split('\n').find((l) => l.includes('peer')) ?? '' });
    console.log(`vite@${major}: INSTALL FAILED`);
    continue;
  }

  try {
    run('npm', ['run', 'build'], app);
  } catch (e) {
    const detail = (e.stdout ?? '') + (e.stderr ?? '');
    results.push({ major, version: installedVite, status: 'BUILD FAILED', detail: detail.split('\n').filter((l) => /error/i.test(l))[0] ?? '' });
    console.log(`vite@${major} (${installedVite}): BUILD FAILED`);
    continue;
  }

  // Vite 2 emits out.es.js; 3+ emit out.js. Read whatever landed.
  const distDir = join(app, 'dist');
  const bundle = readdirSync(distDir)
    .filter((f) => f.endsWith('.js') || f.endsWith('.mjs'))
    .map((f) => readFileSync(join(distDir, f), 'utf8'))
    .join('\n');

  const problems = [];
  for (const [name, line] of Object.entries(EXPECTED)) {
    if (!new RegExp(`"data-dev-name": *"${name}"`).test(bundle)) problems.push(`missing ${name}`);
    if (!bundle.includes(`src/main.jsx:${line}:`)) problems.push(`wrong line for ${name} (want ${line})`);
  }
  // The literal `/>` inside an attribute value must survive splicing
  if (!bundle.includes('a/>b')) problems.push('lost title="a/>b"');

  const tagged = (bundle.match(/data-dev-id/g) ?? []).length;

  if (problems.length) {
    results.push({ major, version: installedVite, status: 'MISMATCH', detail: problems.join('; ') });
    console.log(`vite@${major} (${installedVite}): MISMATCH -> ${problems.join('; ')}`);
  } else {
    results.push({ major, version: installedVite, status: 'PASS', detail: `${tagged} tagged` });
    console.log(`vite@${major} (${installedVite}): PASS (${tagged} elements tagged)`);
  }
}

try {
  rmSync(work, { recursive: true, force: true });
} catch {
  // leaving a temp dir behind is not worth failing the run over
}

const failed = results.filter((r) => r.status !== 'PASS');
console.log('\n=== Vite compatibility ===');
for (const r of results) {
  console.log(`  vite@${r.major} (${r.version}): ${r.status}${r.detail ? ` - ${r.detail}` : ''}`);
}

if (failed.length) {
  console.error(`\n${failed.length} of ${results.length} Vite majors failed.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} Vite majors in the peer range verified.`);

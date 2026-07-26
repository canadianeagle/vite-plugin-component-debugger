# Audit and fix pass (2026-07-25)

## Goal

Clone, audit, and fix `vite-plugin-component-debugger` v2.2.1. Find real defects, prove each one
with a failing test, fix it, and correct the documentation.

## Acceptance criteria

- [x] Every claimed bug is reproduced by a test that fails against v2.2.1
- [x] `lint`, `tsc --noEmit`, `test`, and `build` all pass
- [x] Published CJS and ESM entry points both import successfully
- [x] Production dependencies audit clean
- [x] Documentation matches actual behaviour

## Checklist

- [x] Clone repo and read all of `src/`
- [x] Establish a baseline (test/lint/build) before changing anything
- [x] Write failing repro tests for suspected defects
- [x] Second opinion from codex `gpt-5.6-sol`, verify its claims independently
- [x] Fix correctness bugs
- [x] Fix packaging bug (broken CJS entry)
- [x] Fix tooling (missing ESLint config, CI swallowing failures)
- [x] Replace throwaway probes with `src/__tests__/regressions.test.ts`
- [x] Fix documentation inaccuracies
- [x] Update `changelog.md`
- [x] Strip AI co-author trailers from commit history (local only, not pushed)

## Working notes

- The plugin is `enforce: 'pre'`, but so is `@vitejs/plugin-react`'s `vite:react-babel`. Vite keeps
  array order within the `pre` group, so the README's "put it before react()" rule is correct. I
  initially assumed it was stale and was wrong.
- `npm run check` could never have passed on this repo: no ESLint config existed, so `lint` failed
  outright. CI hid it with `|| echo "No lint script"`.
- Attribute *values* were escaped but attribute *names* were not, and names come from user config
  (`attributePrefix`, `customAttributes` keys). A bad name injected raw JSX.
- Existing tests wrap assertions in `if (result) { ... }`. When `transform` returns null the
  assertions silently never run. New tests assert non-null first.

## Results

19 defects fixed across correctness, packaging, security hardening, tooling, and docs. See
`changelog.md` for the itemised list.

Verification: lint PASS, `tsc --noEmit` PASS, 1268/1268 tests pass, build PASS, CJS and ESM entry
smoke tests PASS, `npm audit --omit=dev` reports 0 vulnerabilities.

### Test strength evidence

Passing tests prove nothing on their own, so three things were measured:

1. **Against pristine v2.2.1**: `regressions.test.ts` fails 23 of 34. Each failure is a real defect.
2. **Non-vacuity**: 925 of 1054 corpus x config pairs (87.8%) actually reach their assertions and
   inject 5624 attributes; 371 of 400 fuzz trees are asserted. The suite fails loudly if that rate
   drops, so it cannot silently degrade into the `if (result) { ... }` pattern used elsewhere.
3. **Mutation testing**: 27 mutations were injected (18 reverting the fixes above, 9 fresh bugs such
   as `indexOf` for `lastIndexOf`, off-by-one insert offsets, removed escaping, line/column drift).
   All 27 were caught. Zero survivors.

One mutation initially survived: the `__proto__` guard. The test passed for the wrong reason,
because assigning a string to `__proto__` on a plain object is silently discarded whether or not the
guard runs. Rewritten to use `constructor` and `prototype`, which create real own properties. It now
kills the mutation.

### What the fuzzing did NOT find

`adversarial.test.ts` passes 1107/1107 against unmodified v2.2.1. The fuzzer found **zero** new
bugs. The attribute-insertion logic (`lastIndexOf('>')` / `lastIndexOf('/>')` plus magic-string
splicing) is genuinely sound across 65 hostile JSX shapes x 17 configs and 400 generated trees,
including strings containing `/>`, regex literals, comments inside opening elements, TS generics,
CRLF, emoji, surrogate pairs and RTL text. Codex reached the same conclusion by inspection.

Its value is as a regression net, not as a source of findings: it kills every injected insertion
bug, one of them producing 834 failures.

## Follow-ups (not done, out of scope)

- `src/utils/component-debugger.ts` is 321 lines of dead code at 0% coverage. Delete it or publish
  it as an explicit browser subpath export.
- `enabled` defaults to `true` with no `apply` restriction, so a bare `componentDebugger()` tags
  production builds. Changing the default is a breaking change; documented instead.
- ~103 test blocks guard assertions behind `if (result)` and can pass vacuously.
- `package-lock.json` and `pnpm-lock.yaml` are both committed while CLAUDE.md mandates pnpm.
- Remote feature branches on GitHub still carry AI co-author trailers.

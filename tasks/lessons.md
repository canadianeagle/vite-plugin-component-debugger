# Lessons

## A green test suite is not evidence the toolchain runs

**Failure mode:** 127 tests passed on v2.2.1, which reads as a healthy repo. But `lint` failed
outright (no ESLint config existed at all), `tsc --noEmit` failed, and `test:coverage` failed. CI
hid all three behind `|| echo "..."` fallbacks.

**Detection signal:** A CI step whose `run:` line ends in `|| echo` or `|| true`. That is a step
that cannot fail, which means it is not a check.

**Prevention rule:** On any repo audit, run every script in `package.json` individually before
trusting the suite. Grep CI for `|| echo`, `|| true`, and `continue-on-error`.

## Verify what the package publishes, not just what the source does

**Failure mode:** All source tests passed while `require('vite-plugin-component-debugger')` threw
`ERR_PACKAGE_PATH_NOT_EXPORTED`. The ESM-only `estree-walker@3` was left external in the CJS
bundle. No test imported the built artifact, so nothing caught it.

**Detection signal:** `package.json` advertises a `require` entry, but no test imports from `dist/`.

**Prevention rule:** For any published package, smoke-test the actual build outputs in both module
systems as part of CI, not just the TypeScript sources.

## Check the second opinion instead of accepting it

**Failure mode:** I told codex the README's "place this plugin before react()" warning was stale,
reasoning that `enforce: 'pre'` made array order irrelevant. Codex pushed back. Unpacking the
published `@vitejs/plugin-react` showed `vite:react-babel` is *also* `enforce: 'pre'`, so array
order within the `pre` group decides. I would have "fixed" correct documentation into wrong
documentation.

**Detection signal:** Reasoning about a third-party library's behaviour from memory rather than
from its source.

**Prevention rule:** Before editing docs to contradict them, verify the underlying claim against
the actual dependency. Equally, verify the reviewer's claims: codex asserted the metadata truncation
could emit invalid JSON, and my first two attempts to reproduce it failed because my test never put
a cut point in the right region. A bounded brute force found 17 failing cut points out of 60. A
failed reproduction means the test was wrong, not necessarily the claim.

## A test can pass for the wrong reason and look like coverage

**Failure mode:** The regression test for the `__proto__` guard asserted that
`customAttributes: () => ({'data-dev-__proto__': 'pwned'})` emitted no attribute. It passed. It also
passed with the fix reverted, because assigning a *string* to `__proto__` on a plain object is
silently discarded by the setter. The test could not distinguish fixed from broken. Only mutation
testing exposed it. `constructor` and `prototype` create real own properties and do distinguish.

**Detection signal:** A security or guard test where the "safe" outcome would also occur if the
guard did not exist.

**Prevention rule:** For any guard, verify the test fails when the guard is removed. Run the
mutation, do not assume. Prefer probe values whose unguarded behaviour is visibly different.

## Measure whether the suite is vacuous, then keep measuring

**Failure mode:** The suite is full of `if (result === null) return`, the same pattern that lets the
inherited v2.2.1 tests pass without asserting anything. 1106 green tests could have meant 1106
early returns.

**Prevention rule:** Count how often assertions are actually reached and assert on that count. The
adversarial suite now fails if fewer than 60% of corpus/config pairs transform or fewer than half
the fuzz trees are exercised, so it cannot quietly rot into a no-op.

## A fuzzer that finds nothing is still worth having, but say so plainly

**Observation:** The adversarial suite passes 1107/1107 against unmodified v2.2.1. It found zero new
bugs. The temptation is to present a large green number as if it were a discovery.

It is not. What it demonstrates is a negative result (the insertion logic is sound) plus a
regression net, and the net is only credible because mutation testing showed it catches 27 of 27
injected bugs. Report the negative result as a negative result.

## Escaping applied twice is escaping applied wrong

**Failure mode:** `metadataEncoding: 'none'` escaped `"` to `&quot;`, then the shared output path
escaped `&` to `&amp;`, yielding `&amp;quot;`. Each layer was individually reasonable.

**Prevention rule:** Escape exactly once, at the boundary where the value is serialized. Assert
round-trip (parse what you emit) rather than eyeballing the output string.

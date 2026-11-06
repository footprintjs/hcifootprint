# Current-cohort compatibility proof

This folder verifies the intended FP11.0.0 / Foottrace1.11.1 installation. Its
checks add no completion timer, polling, retry, model call or credential loading.
They do not replace Browser proof or the existing runtime/docs/coverage gates.

- `check-pins.mjs` checks the declared FP11/FT1.11.1 floors, the two maintained
  AF14 demo workspaces, the single root lock and the linked docs metadata. It is
  metadata evidence only. Its first run on the previous declarations must fail.
- `identity.mjs --workspaces ROOT` checks actual root/demo/AF/HCI/FP/FT resolution
  after the root's normal install. Every consumer must reach the same physical
  FP and FT packages. Walking the full nested npm package graph also catches
  unused extra copies, aliases and copies whose versions happen to match.
- `prepare-consumer.mjs FRESH_DIRECTORY PACKED_TARBALL` creates a fresh consumer
  for the actual `npm pack` output. It writes exact target runtime versions and
  takes optional peers and TypeScript tools from the normal root lock. It does
  not install or run anything. The directory must not already exist.
- The consumer's `check:identity`, `check:types` and `check:runtime` scripts prove
  its physical cohort, all seven public import/type doors and representative
  real guard/schema, asynchronous settlement, receipt, native record/replay,
  serving and testing contracts. React/sensor import and declarations are
  checked here; their existing CI tests retain actual scheduling/DOM coverage.
  The WebMCP fixture supplies its structural registration port; it is not a
  browser or a claim about native browser registration.

The `*.test.mjs` tests use explicitly labelled metadata/path fixtures to prove
that the guards reject stale or duplicated installations, including a second
copy of the same version. They are not a substitute for a real normal install.

Run the lightweight checker tests with:

```sh
node --test scripts/cohort/check-pins.test.mjs scripts/cohort/identity.test.mjs
```

CI owns the heavy proof, on Node22 and Node24. After its normal root install and
build, it runs the pin/workspace checks and both demos' existing verification
scripts. It packs HCI with scripts disabled (the build has already run), creates
the fresh consumer, runs normal `npm install --ignore-scripts --strict-peer-deps
--no-audit --no-fund` there, then each of its three check scripts. No overrides,
hand-edited lock entries or source substitutes belong in the consumer.

Keep the actual outputs when reporting a result. A syntax check or a fixture
test pass does not establish that the installed runtime or types passed.

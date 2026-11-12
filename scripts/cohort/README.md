# Current-cohort compatibility proof

This folder verifies the intended installation: the footprintjs and Foottrace
that the root lock installs, shared as ONE physical copy by HCI, its two demo
workspaces and their agentfootprint. Its checks add no completion timer,
polling, retry, model call or credential loading. They do not replace Browser
proof or the existing runtime/docs/coverage gates.

## Where the numbers come from

**`package.json` is the one place a range is declared, and the root
`package-lock.json` is the one place an installed version is chosen. The
scripts here hold no version or range of a family package; they read them.**

Why: on 12 Nov 2026 one upstream change (accept footprintjs 12, lock the demos'
agentfootprint at a newer 14.x) needed hand edits to numbers typed into
`check-pins.mjs` and `identity.mjs`, and CI went red twice before both were
found. Now a lock change inside the declared range needs no edit here, and a
range change is one edit in `package.json` plus the lock npm regenerates.
`cohort-literals.test.mjs` fails if a version literal comes back into the three
scripts.

| check | reads the range from | reads the version from |
|---|---|---|
| `check-pins.mjs` | root `package.json · dependencies` (footprintjs, foottrace); each demo's `package.json · dependencies.agentfootprint` | root `package-lock.json` |
| `identity.mjs --workspaces ROOT` | — | ROOT's `package-lock.json`, `packages['node_modules/<name>'].version` (footprintjs, foottrace, agentfootprint) |
| `identity.mjs` (consumer) | — | the consumer's own `package.json · dependencies`, which `prepare-consumer.mjs` wrote |
| `prepare-consumer.mjs` | — | root `package-lock.json` (`lockedVersion`, as for react and typescript) |

Example: package.json declares footprintjs `^11.0.0 || ^12.0.0`. Moving the
lock from 11.2.0 to 11.1.0 or 12.0.0 with npm passes every check with no edit.
A lock on 13.0.0 or 12.0.0-rc.0 fails `check-pins.mjs`, which names the range
and the version.

## What each check proves

- `check-pins.mjs` (metadata only; uses the `semver` devDependency, so it runs
  after `npm ci`):
  - `package.json` declares a real semver range for footprintjs and foottrace
    (not missing, empty, `*` or `file:`);
  - both locks repeat those declarations for the linked HCI, at
    `package.json · version` (the staleness check);
  - the root lock holds exactly one entry of each, hoisted at
    `node_modules/<name>`, at a plain release version (no prerelease) inside the
    declared range;
  - the two demos declare the same agentfootprint range, the root lock's
    workspace entries repeat it, and the locked agentfootprint satisfies it;
  - the demos have no nested lock, the root declares its Vite8 coverage
    transformer and the lock keeps it (a toolchain choice, not a family
    version).
- `identity.mjs --workspaces ROOT` checks actual root/demo/AF/HCI/FP/FT
  resolution after the root's normal install. Every consumer must reach the
  same physical FP and FT packages, at the versions the root lock holds, and
  both demos must resolve the agentfootprint the root lock holds. The inventory
  counts installed module entries, including scoped packages and aliases. It
  finds nested `node_modules` through every directory container inside those
  packages, including dot-prefixed folders and containers with their own
  manifests. Directory links are followed once per real path; file links are
  ignored. Container manifests outside installed module positions are
  traversed rather than counted as installed copies. This catches unused extra
  copies and copies whose versions happen to match.
- `identity.mjs` with no flag runs inside the packed consumer. It is copied
  there, so it imports only `node:` builtins. It expects the exact versions in
  the consumer's `package.json`; a range there, or a missing or malformed
  manifest, is an error that names the file.
- `prepare-consumer.mjs FRESH_DIRECTORY PACKED_TARBALL` creates a fresh consumer
  for the actual `npm pack` output. It writes exact runtime versions from the
  normal root lock and takes optional peers and TypeScript tools from it too.
  It does not install or run anything. The directory must not already exist.
- The consumer's `check:identity`, `check:types` and `check:runtime` scripts prove
  its physical cohort, all seven public import/type doors and representative
  real guard/schema, asynchronous settlement, receipt, native record/replay,
  serving and testing contracts. React/sensor import and declarations are
  checked here; their existing CI tests retain actual scheduling/DOM coverage.
  The WebMCP fixture supplies its structural registration port; it is not a
  browser or a claim about native browser registration.

Both commands print one sentence on failure (the file and the value they
looked at) and exit 1, without a stack.

The `*.test.mjs` tests use explicitly labelled metadata/path fixtures to prove
that the guards reject stale or duplicated installations, including a second
copy of the same version. A fixture states the expected versions in its own
lock or manifest. They are not a substitute for a real normal install.

Run the lightweight checker tests (after `npm ci`) with:

```sh
node --test scripts/cohort/*.test.mjs
```

CI owns the heavy proof, on Node22 and Node24. After its normal root install and
build, it runs the pin/workspace checks and both demos' existing verification
scripts. It packs HCI with `npm pack --ignore-scripts` after the explicit build.
The observed Node22/npm combination still runs HCI's build-only `prepare` hook
during packing; the flag does not prove that every lifecycle hook was skipped.
It creates the fresh consumer, runs normal `npm install --ignore-scripts --strict-peer-deps
--no-audit --no-fund` there, then each of its three check scripts. No overrides,
hand-edited lock entries or source substitutes belong in the consumer.

Keep the actual outputs when reporting a result. A syntax check or a fixture
test pass does not establish that the installed runtime or types passed.

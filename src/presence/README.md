# presence/ — the pure presence sensor (D18)

One job: refcounted mount handles + explicit visibility signals, as a plain
data structure. Registration observes MOUNTED — nothing more. What presence
*means* (dormancy below the router, overlay masking, tab exclusivity,
assumed-active defaults) lives one layer up in `NavSession`, which composes
this index with the authored tree.

Contract points:

- **Handles are identities**: `open()` returns a handle, `release()` is
  idempotent per handle — React StrictMode's setup→cleanup→setup nets to one.
- **Instance handles are excluded from the fingerprint**: a scrolling
  virtualized list must never look like world motion. That scoping rule is
  enforced here, at the lowest layer that can.
- **Visibility is an explicit signal store** (`setVisible`). Mount counting
  cannot see CSS; when no signal exists, the layer above serves honesty
  markers instead of guessing.

No imports. Tests: `test/presence.test.ts`.

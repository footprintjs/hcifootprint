# registry — the live-binding layer

**Job:** hold what is actually wired *right now*: `affordanceId → the app's real handler`, registered in **groups** (one per component/section) so unmount cleanup is one call.

**Depends on:** nothing (pure data structure — tests in isolation).
**Used by:** `traverse/` (the session invokes handlers on `fire()`, flags `materialized`, and runs effect-signature inference only over registered ids).

Rules this layer enforces:

- **Last registration wins** per affordance, with a dev warning (React StrictMode double-mounts are expected; real duplicates become visible).
- **`unregisterGroup` only removes what the group currently owns** — a stale unmount can't tear down another component's live binding.
- **No planner-facing strings.** Descriptions, guards, effects, schemas live in the declared graph (`graph/`); registration is `id → function`, keeping runtime code out of the LLM's instruction channel.

See `test/registry.test.ts` — this layer's tests import only this file.

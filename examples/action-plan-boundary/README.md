# One plan is not one model call per stage

`run.ts` uses the existing public action API. Three known actions run through one
`beginWalk(...).run(...)` call. Their progress subscriptions go to a local channel;
the agent reply is sent once, after this example's declared receipt evidence has
settled. The test executes the real library with an in-memory store, no model or
network. It proves channel boundaries, not model accuracy, token savings or speed.

Use a plan only for actions and inputs already known on the current surface.
A new page, missing input, human-owned decision or refusal can require re-reading
and another model decision. Never use batching to guess future bindings or bypass
live admission, permissions, resource locks or effect evidence.

For a model-facing transport:

- Send the requested invocation/effect boundary and current available offers,
  rather than polling through the model for every progress event.
- Keep the complete native transition/progress record locally. A small reply can
  carry the current native snapshot once; it need not duplicate it as a transition,
  invocation outcome, effect settlement and full historical observation.
- Preserve pending/refused/failed and late outcomes. A plan ending is not proof
  that the business operation succeeded. This example explicitly waits for its
  authored store evidence; a general host must choose its wait boundary.
- Catch `ActionOfferRefusal` only at synchronous admission. Serialize its code,
  `execution` and `nextStep`; do not parse strings, automatically refresh/retry,
  or mistake a later handler/transport failure for a pre-execution refusal.
- An agent's task goal and the app's operation status are different facts. If a
  test asks to observe a deliberate failure, the goal may be achieved while the
  observed operation status is still `failed`. Name these fields distinctly.

The graph/Session surface uses Foottrace records. This action-binding surface
uses native HCI transitions and walk manifests; this example introduces neither a
second recorder nor a second execution engine.

# atom — the domain types (layer 0)

**Job:** define the atom and every type the other layers speak.

```
Affordance  = binding × guard × effect × schema     (the static capability)
Transition  = cause × payload × outcome             (each occurrence)
```

**Depends on:** footprintjs types only (`WhereFilter`, `FilterCondition`). No runtime code — this layer is pure shape.

Load-bearing choices encoded here:

- `guard` is a serializable WhereFilter — it filters what is *offered* (footprint's `decide()` chooses; our `available()` exposes).
- `effect` is a **claim**, verified at settlement (`effectVerified` honesty marker).
- `cause` makes system-initiated motion first-class (`stimulus`), keeps the principal set open (`user | agent | system | unknown`), and marks guessed attributions (`inferred`).
- Settlement (`pending → committed | rejected | rolled-back | superseded`) exists because async/optimistic UI is the norm, not the edge case.

# Drift axis — mutation kill matrix

baseline clean: **true** (static: 0 errors / 0 warnings (+6 advisory notes) · report drift: false · journey threw: false)

| mutant | family | predicted layer | caught by | prediction |
|---|---|---|---|---|
| M01-guard-dangling-key | guard | static | static | ✓ |
| M02-guard-unsatisfiable | guard | static | static | ✓ |
| M03-page-unreachable | page | static | static | ✓ |
| M04-skill-uncompletable | skill | static | missed | ✗ |
| M05-write-unconsumed | effect | static-advisory | static-advisory | ✓ |
| M06-skill-step-unknown | skill | compile | compile | ✓ |
| M07-handler-wrong-write | handler | behavioral-report | behavioral-report | ✓ |
| M08-handler-no-op | handler | behavioral-report | behavioral-report | ✓ |
| M09-handler-missing | handler | behavioral-journey | behavioral-report | ✗ |
| M10-handler-wrong-nav | nav | behavioral-journey | behavioral-journey | ✓ |
| M11-handler-partial-write | handler | behavioral-report | behavioral-report | ✓ |
| M12-handler-wrong-value | handler | behavioral-journey | behavioral-journey | ✓ |
| M13-guard-weakened | guard | expected-miss | missed | ✓ |

**recall on catchable mutants: 92%** · preregistered boundary misses confirmed: 1/1 · layer-prediction accuracy: 85%

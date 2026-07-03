# dress-shop — the end-to-end example (and the X2 study instrument)

A mock e-commerce app (browse → search → filter → open a dress → add to cart → checkout →
place order → track order) wired to HCIFootprint through the same three additive lines a real
app would use: `registerTools` per mounted page, `sync` on navigation, `updateState` as the tap.

| File | What it is |
|---|---|
| `data.ts` | Mock catalog (includes a hostile-named dress to prove the injection firewall) |
| `graph.ts` | The DECLARED skill graph: 6 pages, 11 affordances, 3 skills |
| `store.ts` | The mock APP: its own state + handlers, page groups mount/unmount as it navigates |
| `journey.test.ts` | The scripted mixed-initiative journey — user finds a dress by hand, the agent buys it in a skill frame, the user asks about the order; asserts provenance, guards, lazy tools, trace integrity, and the firewall end-to-end |
| `chatbot.ts` | A live Claude chatbot (Opus 4.8) driving the app: per-turn `contextBrief` injection, skills-first planning, action tools regenerated from `toMCPTools()` every request, `!affordance-id` simulates manual user clicks between questions |

Run the journey (no API key needed): `npx vitest run examples/dress-shop/journey.test.ts`

Run the chatbot (needs credentials — `ANTHROPIC_API_KEY` or `ant auth login`):

```bash
npm run demo:chat
# you> find me a red dress under $150
# you> !view-dress {"dressId":"d3"}     ← simulate a manual click; next turn's brief reports it
# you> buy it
```

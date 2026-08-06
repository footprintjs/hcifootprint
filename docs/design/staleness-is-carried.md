# Staleness is carried until it is answered — and what may count as an answer

Status: LAW. Not a dated decision record (the `dNN-*.md` files record what one numbered decision
decided, at the time); this note states a rule every later build has to keep. It governs
`staleReads` and `staleWrites` on the agent's row, `session.carryStale` / `carriedStale` /
`acknowledgeStale`, and any stamp built like them later.

## The two halves, and why they are one build

**The write side was missing.** `staleReads` intersects the keys committed since your last look
with the keys a control's outcome DEPENDS ON. A control that simply overwrites a key correctly
declares no read of it — so the stamp is silent, by construction, on exactly the controls whose
repeat does the most damage. Measured off a real campaign: a person held a room between two turns;
the control that holds a room declares as its `writes` exactly the two keys that person moved; it
was served with nothing on it, twice, while the same reply's brief named those keys as changed; and
a second room was booked. `staleWrites` is `writes ∩ changed`: *someone has written what you are
about to write.*

**And a one-turn stamp cannot help either side.** The window is a delta since the caller's
`sinceVersion`, and that advances every time the caller looks. So the stamp described its condition
for one turn and went quiet while the condition held: present on the turn the key moved, absent two
turns later at the same version in the same world, and the fire landed on the third. Shipping the
write side onto that window would have shipped it silent — the rows it targets fire one turn after
the change.

So: the stamp is **carried** until it is answered.

## What may count as an answer

The hard part is not the carrying. It is the clearing, because a clearing rule is a claim about the
reader, and this library is not allowed to make claims about readers it cannot see.

**LOOKING IS NOT KNOWING.** A second look never clears anything. It is what the caller was already
doing on every turn the old stamp disarmed itself, and treating it as an answer is the defect
rather than the fix. Worse, it is unprovable in the strongest way available: **this library never
serves a value.** It cannot know that a value was read, so it can never conclude that a fact landed.

**IT MAY ONLY RECORD WHAT THE CALLER DEMONSTRABLY DID.** Two acts qualify, and both are witnessed
by the session itself:

| act | what the session saw | what it does NOT claim |
| --- | --- | --- |
| `session.acknowledgeStale(actionId, keys?)` | this caller said, of this control, that it has dealt with these keys having moved | that it read the value, understood the consequence, or decided well |
| the AGENT fires that control | the caller reached for the very control the stamp was on, with the stamp on its row | that it agreed, approved, or comprehended — the fire is an act, and acts are all this layer records |

Everything else leaves the ledger alone. In particular:

- **A person using the control does not clear it.** A human's use is the world moving — it is what
  *creates* staleness for the machine reader — and counting it as that reader's answer would delete
  the fact at the moment it became truest.
- **A refused fire clears nothing.** An act the app turned away is not an act the caller got to
  make.
- **Firing something else clears nothing.** The stamp is about this control.

**AND ONLY WHAT WAS SAID IS CARRIED.** Nothing enters the ledger from a computation. `carryStale` is
called by the layer that put the key on a row it handed over, so what is carried is what was *told*.
A stamp nobody was ever served is not a thing anybody can be asked to answer for — and a caller
whose window never included the change is not carrying it.

## Why a door, and why not a fifth tool

The acknowledgement is a **session method**, not a new MCP verb. Publishing a fifth tool would change
what an agent may DO — a claim about agent design, from a library whose whole stance is that the
decision belongs to the caller. A session method leaves the app free to wire acknowledgement to
whatever it can honestly witness: its own relay saying so, a person clicking through a dialog, an
agent's structured reply. What the library guarantees is only this: it will not stop saying a thing
until somebody does something about it, and it will never pretend that somebody did.

## What the stamps still do not say

Unchanged from the read side's first day, and restated because the write side invites the mistake:

- **Names only.** No value crosses. Nothing is compared against anything.
- **It does not say WHO.** `staleWrites` says a key this control declares it writes has been
  committed since your last look. Not that another party did it, not that your write would be
  wrong, not that this is a repeat. If your own fire wrote it, that is still a key that moved, and
  the row says so without attributing it.
- **It refuses nothing.** The row stays fireable, exactly as `enabled: false`, `humanDecides` and
  `busy` do beside it. Disclosure is the mechanism; the decision stays with the caller.
- **Presence-only.** An app that declares no `reads`/`writes` serves byte-identical rows, and
  `staleWrites: []` is never served — manufactured reassurance is a claim about a session nobody
  asked.

## The honest prior

None of this is expected to move an outcome rate by itself. The read side shipped, was served on
the exact control the harm rows fired, kept its negative control silent — and the measured number
did not move by one row. That is the ceiling disclosure has, and it is the number a later mechanism
has to beat rather than inherit. What this build changes is what is on the row at the decisive turn,
which is the only thing a library on this side of the boundary can honestly change.

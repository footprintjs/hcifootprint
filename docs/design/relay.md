# Relay — serving a session's port across a process boundary

Status: DESIGN (Round A). Nothing here is built; Round B builds exactly this and
nothing beyond it. Names below are working names — they are NOT frozen until a
release ships them.

## Why this document exists now

`serveToAgent()` returns a port that lives in the page's process. Every real
deployment so far has needed that port somewhere else — a server holding the
MCP connection, a parent frame, a sidecar — and the field evidence is not a
wish but shipped code: two independent hand-rolled relay implementations of
roughly five hundred lines each are running in production integrations today,
each re-deriving the same pending-map, reconnect, and chunking machinery, each
with its own bugs. By the house rule — anticipation earns a document, evidence
earns a build — twin shipped workarounds earn the build, and this document is
the design round that must come first because a wire protocol is public
surface of the most frozen kind: bytes on the wire outlive every refactor.

## The shape (Round A decisions)

**D1 — one protocol, three pipes.** A `RelayFrame` discriminated union carried
by a `RelayTransport` interface with exactly three first-party transports:
WebSocket, SSE+POST, and `postMessage`. The `postMessage` transport is the
deliberate seed of future iframe/micro-frontend federation — federation itself
stays undesigned (its own document, when evidence lands), but its enabling
half rides here so it becomes a transport, not a feature.

**D2 — the frame union, version 1.**

```ts
type RelayFrame =
  | { v: 1; type: 'tools'; tools: MCPToolDescription[] }
  | { v: 1; type: 'call'; id: string; name: string; args?: unknown }
  | { v: 1; type: 'result'; id: string; result: unknown }
  | { v: 1; type: 'settled'; transitionId: string; settlement: FireSettlement }
  | { v: 1; type: 'chunk'; of: string; seq: number; last: boolean; data: string };
```

An unknown `v` is refused naming the version — never half-parsed. There is no
`progress` frame in v1: nothing in the port emits progress today, and a frame
nothing produces is a lie waiting for a producer.

**D3 — every frame field is DATA, end to end.** Nothing that crosses the wire
may enter an authored channel on either side. The client renders tool text the
host sent because the HOST authored it; the host renders nothing the client
sent. This is the same caller-text firewall the session already enforces,
extended across the pipe.

**D4 — reconnect is a disclosure, not a recovery.** On reconnect the client
re-announces `tools` and reports the existing `actionsMayBeStale` gap row —
the one channel the library already owns for "the served list may be out of
date" (it is wired today from the live-store read-failure path). Staleness is
told, never silently healed.

**D5 — settlement crosses the wire by id.** `whenSettled`/`settledAnswer` ride
the `settled` frame keyed by `transitionId`. A client that reconnects may ask
`settledAnswer(transitionId)` again; the host answers from its ledger. A
settlement the host never saw settle answers honestly as still-pending. No
timers anywhere — settlement, not timeout, is the house law.

**D6 — chunking is the transport's ceiling made visible.** Frames above
`maxFrameBytes` split into `chunk` frames; reassembly refuses a missing or
out-of-order `seq` by name. The default ceiling is set by the smallest real
deployment constraint we have measured (32 KB), not by taste.

**D7 — one port per session id, host side.** `createRelayHost()` keeps the
pending-map registry both production integrations hand-rolled. Attaching a
second transport to a live session id refuses by name — two writers to one
ledger is the corruption class this library exists to prevent.

**D8 — middleware stays out of v1.** Wrapping the port (tracing, redaction,
budgets) is real field practice, but it is a PORT concern, not a WIRE concern;
it composes outside the relay and needs no frame.

## Rejected in Round A (recorded so Round B does not re-litigate)

- **AG-UI framing as the native protocol** — rejected for v1; a naming-map
  note in `protocol.ts` keeps the door open, a full adapter is its own item.
- **Auth in the protocol** — the transport owns the channel's identity (WS
  headers, iframe origin checks); a `v:1` frame carries no credential, ever.
- **Server-initiated `call`** — the host calls, the page answers; reversing
  the arrow makes the page a tool server for the host and belongs, if ever,
  to the federation document.

## Test list Round B must pin

1. Loopback transport round-trips every frame type.
2. Reconnect re-announces tools and reports the staleness gap.
3. Chunk reassembly: order kept, missing `seq` refused by name.
4. Hostile text in any inbound frame field renders as data everywhere.
5. Unknown `v` refused naming the version, byte-pinned.
6. Second transport on a live session id refused by name.
7. `settledAnswer` over the wire after reconnect answers from the ledger.
8. The tool-array bytes law holds across the relay: the client serves the
   host's bytes verbatim.

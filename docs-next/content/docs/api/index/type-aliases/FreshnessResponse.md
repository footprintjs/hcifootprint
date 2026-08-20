---
title: FreshnessResponse
---

# Type Alias: FreshnessResponse

> **FreshnessResponse** = `"disclose"` \| `"require-ack"` \| `"refuse"`

Defined in: [src/atom/types.ts:382](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L382)

WHAT THIS CONTROL DOES WHEN SOMETHING IT WAS OFFERED UNDER HAS SINCE MOVED.

- `'disclose'` — say so on the row and refuse nothing. TODAY'S BEHAVIOUR, and
  the default on every axis: a session that declares no policy serves the
  same bytes and refuses the same fires it always did.
- `'require-ack'` — refuse unless the fire cites a [StaleAcknowledgement](/api/index/interfaces/StaleAcknowledgement)
  this session recorded. The caller must PERFORM a protocol step; nothing
  about that step claims the caller understood anything (see
  [StaleAcknowledgement](/api/index/interfaces/StaleAcknowledgement)).
- `'refuse'` — refuse, naming what moved. There is no way past it but a fresh
  look: the caller plans against a new row and cites that offer instead.

WHY THE LADDER EXISTS AT ALL, in one measured sentence: a preregistered
campaign found that in 20 of 33 residual harm rows the decisive warning was on
the exact control at the exact turn and the model fired anyway. Disclosure has
a ceiling. A warning can be ignored; a required protocol step cannot be
skipped silently.

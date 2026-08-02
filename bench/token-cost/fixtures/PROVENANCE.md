# Where this fixture came from

`onboarding-wizard-dom.html` is `document.body.innerHTML`, captured from a real browser
against the **built** onboarding-wizard demo (`demos/onboarding-wizard`, served with
`vite preview`), on 2026-08-02.

It is the page's actual bytes: not synthesised, not hand-trimmed, nothing removed to
flatter a ratio. Re-capture it the same way after any change to that demo, and note
that a re-capture moves the number — which is the point of keeping the capture recorded
rather than the number hard-coded.

The page captured was `/account`, mid-wizard, with the email field empty (so `next` is
greyed and the served row carries its `unblockedBy`).

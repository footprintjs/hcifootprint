import { describe, expect, it } from 'vitest';

import { buildProvider } from '../src/agent/providers.js';
import { createConversation } from '../src/agent/runAgent.js';
import { STARTER_MESSAGES } from '../src/agent/systemPrompt.js';
import { createWizardApp } from '../src/app/wizard.js';
import { readReceipts } from '../src/panels/receipts.js';

/**
 * t1 — THE AGENT OPERATES THE APP, END TO END, with no key and no network.
 *
 * The scripted model reads real tool results and drives the real session; the
 * real store, router and mount controller are on the other side. Nothing here
 * is stubbed except the sentence-picking, so a regression in the wiring — a
 * navigation that stops navigating, a fire that stops settling — fails this
 * test rather than a screenshot.
 */
describe('the agent completes the signup journey', () => {
  it('walks welcome → profile → plan → review → done, stopping for the human at the high-effect step', async () => {
    const app = createWizardApp();
    const chat = createConversation({
      session: app.session,
      provider: buildProvider({ kind: 'mock' }),
    });

    // Turn one: the agent walks as far as the confirm gate and then STOPS.
    const first = await chat.ask(STARTER_MESSAGES[0]);
    expect(first.trouble).toBeNull();
    expect(app.session.node).toBe('review');
    expect(app.session.skillFrame()?.skillId).toBe('signup');
    // It asked, in its own derived words, using the receipts it was handed.
    expect(first.text.toLowerCase()).toContain('say yes');
    expect(first.text).toContain('signedUp');
    // Nothing was created: the gate held.
    expect(app.store.snapshot().signedUp).toBe(false);

    // Turn two: the human approves.
    const second = await chat.ask('yes, go ahead');
    expect(second.trouble).toBeNull();

    // The app really moved, and the store really changed.
    expect(app.session.node).toBe('done');
    expect(app.router.path()).toBe('/done');
    expect(app.mounts.mountedPage()).toBe('done');
    expect(app.store.snapshot()).toMatchObject({
      emailVerified: true,
      profileName: 'Ada Lovelace',
      profileRole: 'engineer',
      profileComplete: true,
      plan: 'pro',
      signedUp: true,
    });

    // The frame closed itself as COMPLETED when its last step landed.
    const frames = app.session.frames();
    expect(frames.map((frame) => `${frame.skillId}:${frame.status}`)).toContain('signup:completed');
    expect(app.session.skillFrame()).toBeNull();

    // Every declared write was OBSERVED, not assumed: each step's effect was
    // checked against what the store actually reported.
    const verified = app.session
      .transitions()
      .filter((record) => record.cause.kind === 'fired' && !record.cause.inferred)
      .filter((record) =>
        ['profile.save-profile', 'plan.choose-plan', 'review.confirm-signup'].includes(
          record.cause.affordanceId ?? '',
        ),
      );
    expect(verified).toHaveLength(3);
    for (const record of verified) {
      expect(record.outcome, record.id).toBe('committed');
      expect(record.effectVerified, record.id).toBe(true);
    }

    // The trace and the commit log agree: one bundle per committed transition,
    // joined by id, no orphans on either side.
    const receipts = readReceipts(app.session.transitions(), app.session.commitLog());
    expect(receipts.committed).toBe(receipts.bundles);
    expect(receipts.logJoinsCleanly).toBe(true);

    // The demo produced no dev warnings — no dormant mounts, no handler errors.
    expect(app.warnings()).toEqual([]);
    app.destroy();
  });

  it('fills the profile from the person’s own words and the shape the app advertised', async () => {
    const app = createWizardApp();
    const chat = createConversation({
      session: app.session,
      provider: buildProvider({ kind: 'mock' }),
    });

    await chat.ask(STARTER_MESSAGES[1]);
    await chat.ask('yes please');

    // Different words in, different values stored — the payload is not canned.
    expect(app.store.snapshot()).toMatchObject({
      profileName: 'Grace Hopper',
      profileRole: 'Rear Admiral',
      plan: 'team',
      signedUp: true,
    });
    app.destroy();
  });

  /**
   * The reply must describe THIS turn. A turn that ends on "yes, go ahead"
   * named nobody — reporting a placeholder there would be a claim about
   * something the turn did not do, which is the one thing this demo may not do.
   */
  it('mentions a placeholder only on the turn that actually sent one', async () => {
    const named = createWizardApp();
    const namedChat = createConversation({
      session: named.session,
      provider: buildProvider({ kind: 'mock' }),
    });
    const namedFirst = await namedChat.ask(STARTER_MESSAGES[0]);
    const namedSecond = await namedChat.ask('yes, go ahead');
    expect(namedFirst.text).toContain('Ada Lovelace');
    expect(namedFirst.text).not.toMatch(/named no/);
    expect(namedSecond.text).not.toMatch(/named no/);
    named.destroy();

    const vague = createWizardApp();
    const vagueChat = createConversation({
      session: vague.session,
      provider: buildProvider({ kind: 'mock' }),
    });
    const vagueFirst = await vagueChat.ask('sign me up please');
    const vagueSecond = await vagueChat.ask('yes');
    // The turn that SENT the placeholder says so…
    expect(vagueFirst.text).toMatch(/named no person/);
    // …and the turn that did not, does not.
    expect(vagueSecond.text).not.toMatch(/named no/);
    expect(vague.store.snapshot().profileName).toBe('Sam Rivers');
    vague.destroy();
  });

  it('serves ONE static tool array for the whole conversation (Mode B’s cache-stable prefix)', async () => {
    const app = createWizardApp();
    const chat = createConversation({
      session: app.session,
      provider: buildProvider({ kind: 'mock' }),
    });
    await chat.ask(STARTER_MESSAGES[0]);
    await chat.ask('yes');

    const names = new Set(chat.toolCalls().map((call) => call.name));
    // Skill tools plus the three fixed generics — and nothing per-page.
    expect([...names].sort()).toEqual(
      expect.arrayContaining(['onboarding_do_action', 'onboarding_skill_signup', 'onboarding_whats_here']),
    );
    for (const name of names) expect(name).toMatch(/^[A-Za-z0-9_-]+$/);
    app.destroy();
  });
});

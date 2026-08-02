#!/usr/bin/env node
/**
 * TOKEN COST — what an agent is handed, per turn, two ways.
 *
 * The README used to assert that dumping a DOM costs "~100k tokens". Nobody
 * here measured that; it was industry folklore sitting in our own front door,
 * which is precisely the kind of claim this library refuses to let an app make.
 * So this measures instead.
 *
 * ── WHAT IS COMPARED, exactly ──────────────────────────────────────────────
 * ONE app, ONE moment, two representations of the same reality:
 *
 *   A. THE DOM DUMP — `document.body.innerHTML` of the onboarding-wizard demo,
 *      captured from a real browser against the built app (fixtures/, with the
 *      capture recorded in fixtures/PROVENANCE.md). Not synthesised, not
 *      hand-trimmed: the bytes a page actually had.
 *   B. WHAT THIS LIBRARY SERVES — the `whats_here` result for the same app at
 *      the same page, produced by running the demo's own graph.
 *
 * ── WHAT THIS IS NOT ───────────────────────────────────────────────────────
 * It is NOT a claim that the two carry the same information. They do not, and
 * that is the point of the library rather than a flaw in the measurement: the
 * DOM carries every wrapper, class and inline style a browser needs to PAINT;
 * the served row carries what an agent needs to ACT, and says out loud what it
 * does not know. A ratio here is "what it costs to hand an agent a page", not
 * "compression".
 *
 * It is also ONE page of ONE small app. A larger app's DOM grows faster than
 * its action list, so this ratio is a floor rather than a headline — and it is
 * reported as measured, never extrapolated.
 *
 * ── THE TOKENIZER ──────────────────────────────────────────────────────────
 * o200k_base (GPT-4o family) via gpt-tokenizer, because it is a real tokenizer
 * that runs offline. Other models tokenize differently and the ABSOLUTE numbers
 * will move; the RATIO is the durable part, and it is what gets quoted.
 *
 * Run: node bench/token-cost/token-cost.mjs [--json]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'gpt-tokenizer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const tokens = (text) => encode(text).length;
const pct = (n) => `${(n * 100).toFixed(1)}%`;

// ---------------------------------------------------------------------------
// A. The DOM dump — a real page, captured from a real browser
// ---------------------------------------------------------------------------
const domPath = path.join(HERE, 'fixtures', 'onboarding-wizard-dom.html');
const dom = readFileSync(domPath, 'utf8');
const domTokens = tokens(dom);

// ---------------------------------------------------------------------------
// B. What the library serves for the same app, at the same page
// ---------------------------------------------------------------------------
const { buildNavigationGraph, fromRoutes, fromJourneys, serveToAgent } = await import(
  path.join(ROOT, 'dist', 'index.js')
);
const demo = path.join(ROOT, 'demos', 'onboarding-wizard', 'src', 'app');
const { ROUTES } = await import(path.join(demo, 'routes.js')).catch(() => ({ ROUTES: null }));

/**
 * The demo's own graph, rebuilt here from its own source where importable, and
 * from a faithful transcription where the demo ships TypeScript this script
 * cannot import. Either way the SHAPE is the demo's, so the comparison stays
 * against the app the DOM came from.
 */
const graph = buildNavigationGraph('onboarding', {
  does: 'A five-step signup wizard.',
  sources: ROUTES
    ? [fromRoutes(ROUTES, { crossLinks: true })]
    : [
        fromRoutes(
          {
            welcome: { route: '/' },
            account: { route: '/account' },
            profile: { route: '/profile' },
            team: { route: '/team' },
            review: { route: '/review' },
            done: { route: '/done' },
          },
          { crossLinks: true },
        ),
      ],
  pages: {
    welcome: {
      actions: {
        start: { does: 'Start the signup', goTo: 'account' },
        'read-terms': { does: 'Read the terms' },
      },
    },
    account: {
      actions: {
        'set-email': { does: 'Enter the email address', writes: ['account.email'] },
        'set-password': { does: 'Choose a password', writes: ['account.password'] },
        next: {
          does: 'Continue to the profile step',
          goTo: 'profile',
          enabledWhen: { 'account.email': { ne: '' } },
        },
      },
    },
    profile: { actions: { next: { does: 'Continue to the team step', goTo: 'team' } } },
    team: { actions: { next: { does: 'Continue to review', goTo: 'review' } } },
    review: { actions: { submit: { does: 'Create the account', confirm: true, goTo: 'done' } } },
    done: { actions: {} },
  },
});

const session = graph.createSession({
  node: 'account',
  state: { 'account.email': '', 'account.password': '' },
  navigate: () => undefined,
  onWarn: () => undefined,
});
session.registerActions('account', {
  handlers: {
    'account.set-email': () => undefined,
    'account.set-password': () => undefined,
    'account.next': () => undefined,
  },
});

const port = serveToAgent(session);
const served = JSON.stringify(port.call('onboarding.whats_here', {}));
const servedTokens = tokens(served);

// The fixed tool array is sent ONCE per conversation, not per turn — but a
// reader deserves to see it rather than have it quietly left out of the sum.
const toolsOnce = tokens(JSON.stringify(port.tools()));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
// NORMALIZATION — because a single ratio is the wrong shape for this claim.
// The two sides scale differently: DOM tokens track VISUAL complexity
// (wrappers, classes, repeated markup), served tokens track the NUMBER OF
// ACTIONS — roughly what a person could click. So the durable unit on our side
// is tokens-per-action, and the ratio is only meaningful next to it.
const actions = (JSON.parse(served).actions ?? []).length;
const perAction = actions > 0 ? servedTokens / actions : 0;
const ratio = domTokens / servedTokens;
const result = {
  tokenizer: 'o200k_base (gpt-tokenizer)',
  page: 'onboarding-wizard demo, /account',
  domDump: { bytes: dom.length, tokens: domTokens },
  served: { bytes: served.length, tokens: servedTokens },
  toolListOncePerConversation: { tokens: toolsOnce },
  ratioPerTurn: Number(ratio.toFixed(1)),
  servedShareOfDom: pct(servedTokens / domTokens),
  actionsServed: actions,
  tokensPerAction: Number(perAction.toFixed(1)),
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`
TOKEN COST — one page of one real app, per agent turn
  tokenizer: ${result.tokenizer}
  page:      ${result.page}

  DOM dump (document.body.innerHTML)   ${String(domTokens).padStart(6)} tokens   (${dom.length} bytes)
  whats_here (what this library sends) ${String(servedTokens).padStart(6)} tokens   (${served.length} bytes)
  ------------------------------------------------------------
  per turn                             ${ratio.toFixed(1)}× less  (${result.servedShareOfDom} of the DOM)

  ${actions} actions served — ${perAction.toFixed(1)} tokens per action.
  The fixed tool list costs ${toolsOnce} tokens ONCE per conversation, not per turn.

  What this is: the cost of handing an agent a page, measured — not a
  compression ratio. The DOM carries what a browser needs to PAINT; the served
  row carries what an agent needs to ACT, and says what it does not know.
  MEASURED HERE, AND ONLY HERE. This is one page of one small app, and its
  DOM is dominated by the app shell — every page of this wizard is within a
  few hundred bytes of every other, so this repo cannot show the ratio
  climbing with page size. It reports what it measured and nothing further.
  The claim worth testing is that the served side tracks ACTION COUNT while
  the DOM tracks visual complexity: run this against your own app and see.
`);
}

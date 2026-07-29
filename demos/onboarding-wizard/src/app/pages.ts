import type { PageNodeDef } from 'hcifootprint';

/**
 * THE HAND-AUTHORED BLOCKS — what the route table cannot know: which actions
 * live on each page.
 *
 * A route contributes a PAGE, never an action: the spine is places, not
 * gestures. So these blocks add tools, and nothing else. Note what is NOT here:
 *
 *   • no `route` on welcome / profile / plan — the route table already said
 *     where they live, and the merge order's one courtesy backfills it. That
 *     is the whole use case: read the address, do not re-type it.
 *   • no `done` page at all — it exists ONLY because the route table declared
 *     it. `review.confirm-signup` can name it in `goTo` precisely because the
 *     source contributed it. Delete the sources and this def stops compiling;
 *     the demo's sources panel proves that by trying it live.
 *   • NO HANDLER for any navigation. Every `goTo`-only tool below is fired by
 *     the agent and performed by the app's OWN router, through the session's
 *     `navigate` option. The category of glue that used to exist here — a fake
 *     do-nothing handler registered purely to get a navigation past
 *     NOT_MATERIALIZED — is deleted, not shrunk.
 *
 * `satisfies` rather than a type annotation: the literal page keys must survive
 * so the compiled graph's node paths stay typed.
 */
export const HAND_PAGES = {
  welcome: {
    does: 'Where a new signup starts.',
    tools: {
      'verify-email': {
        does: 'Mark the signup email address as verified.',
        writes: ['emailVerified'],
      },
      // goTo-only, handler-free: the url gesture is derived from the target
      // page's own literal route ('/profile'), and navigate performs it.
      //
      // Named `to-<page>` like every other forward move in this app. The
      // convention is the app's, not the library's — but it is published in
      // the tool ids, which is what lets the demo's scripted model walk the
      // wizard without a real model's judgement.
      'to-profile': {
        does: 'Open the profile step.',
        goTo: 'profile',
      },
      /**
       * Designed, never wired. Its gesture is an element CLICK, which no
       * address can stand in for — so it can never materialise, and the
       * journey that starts with it can never open a frame.
       *
       * Its guard reads `googleLinked`, a key this app does not project (there
       * is no Google integration yet). The library's honest answer to an
       * unevaluable guard key is to serve the edge WITH the guardUnevaluated
       * marker rather than silently hide it — which is exactly what the
       * demo's marker panel renders.
       */
      'import-from-google': {
        does: 'Import name and role from a linked Google account.',
        binding: {
          kind: 'element',
          locator: { role: 'button', name: 'Import from Google' },
          actuation: 'click',
        },
        when: { googleLinked: { eq: true } },
        writes: ['profileComplete'],
      },
    },
  },

  profile: {
    does: 'Name and role.',
    tools: {
      'save-profile': {
        does: 'Save the name and role on the profile form.',
        writes: ['profileComplete'],
        // A plain JSON Schema. The session checks it STRUCTURALLY at fire time
        // (required keys, declared primitive types, closed object) and serves
        // it to the planner as `expects` before the first call — so a wrong
        // payload is a typed refusal carrying what was expected, not a guess.
        input: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The person’s full name.' },
            role: { type: 'string', description: 'Their job title.' },
          },
          required: ['name', 'role'],
          additionalProperties: false,
        },
      },
      'to-plan': {
        does: 'Open the plan step.',
        goTo: 'plan',
        when: { profileComplete: { eq: true } },
      },
      'back-to-welcome': {
        does: 'Go back to the welcome step.',
        goTo: 'welcome',
        role: 'back',
      },
    },
  },

  plan: {
    does: 'Pick a subscription plan.',
    tools: {
      'choose-plan': {
        does: 'Choose a subscription plan.',
        writes: ['plan'],
        input: {
          type: 'object',
          properties: {
            plan: { type: 'string', enum: ['free', 'pro', 'team'], description: 'Which plan.' },
          },
          required: ['plan'],
          additionalProperties: false,
        },
      },
      'to-review': {
        does: 'Open the review step.',
        goTo: 'review',
        when: { plan: { ne: '' } },
      },
      'back-to-profile': {
        does: 'Go back to the profile step.',
        goTo: 'profile',
        role: 'back',
      },
    },
  },

  review: {
    // The ONE page that spells its own address out. It agrees with the route
    // table, so hand-authored simply wins and no courtesy is needed — the
    // sources panel reports it separately from the backfilled pages. (Two
    // DIFFERENT addresses would be refused loudly; the panel proves that too,
    // with a live probe.)
    route: '/review',
    does: 'Check the details before creating the account.',
    tools: {
      'confirm-signup': {
        does: 'Create the account with the details on screen.',
        confirm: true,
        writes: ['signedUp'],
        goTo: 'done',
        // You cannot create the same account twice.
        when: { signedUp: { eq: false } },
      },
      'back-to-plan': {
        does: 'Go back to the plan step.',
        goTo: 'plan',
        role: 'back',
      },
    },
  },
} satisfies Record<string, PageNodeDef>;

import type { SkillDef2 } from 'hcifootprint';

/**
 * THE JOURNEY LIST — the multi-step tasks this product already describes to
 * itself (onboarding funnels, analytics names, the PM's spec). fromJourneys()
 * reads them as skills.
 *
 * SAME field names as the library's own SkillDef2 (does / steps / when): one
 * authoring vocabulary, nothing to translate, so this file is the app's
 * document and the graph's input at the same time.
 *
 * Steps are named by their unambiguous suffix ('save-profile'), not their
 * qualified path ('profile.save-profile'). The compiler resolves the suffix and
 * refuses an ambiguous one by name — so a journey written by someone who does
 * not know the page tree still compiles, or fails loudly saying which paths
 * collided.
 */
export const JOURNEYS: Record<string, SkillDef2> = {
  signup: {
    does: 'Create an account: fill the profile, pick a plan, confirm the signup.',
    steps: ['save-profile', 'choose-plan', 'confirm-signup'],
    // Email verification is the funnel's real entry condition, so it is the
    // skill's precondition — the agent is told the journey is infeasible
    // BEFORE it plans three steps it cannot finish.
    when: { emailVerified: { eq: true } },
  },
  /**
   * THE DELIBERATELY UNMATERIALISABLE JOURNEY.
   *
   * Design shipped a "Import from Google" button on the welcome screen; nobody
   * has wired it. Its gesture is a CLICK, and a click cannot be synthesized
   * from an address — so this journey's entry step can never act, no matter how
   * good the plan is.
   *
   * It is here on purpose. Committing it as an agent is refused
   * ENTRY_NOT_MATERIALIZED by the never-trap gate, and the demo renders that
   * refusal (and the gap row it lands) as a computed value — the whole point
   * being that the frame which could never act is never opened.
   */
  'import-signup': {
    does: 'Create an account by importing name and role from a linked Google account.',
    steps: ['import-from-google', 'choose-plan', 'confirm-signup'],
  },
};

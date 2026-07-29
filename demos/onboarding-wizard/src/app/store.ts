/**
 * The wizard's own data — an ordinary app store that has never heard of the
 * graph. It notifies subscribers on real change; the session tap turns each
 * notification into `session.updateState(store.projected())`, which is how a
 * fired action's declared writes get VERIFIED instead of assumed.
 *
 * Two views, deliberately different sizes:
 *   • snapshot()  — everything the UI renders.
 *   • projected() — ONLY the keys guards read. The projection handed to a
 *     session is meant to be lean; shipping the whole store would put the
 *     person's name into the commit log for no reader.
 */
export interface WizardData {
  emailVerified: boolean;
  profileName: string;
  profileRole: string;
  profileComplete: boolean;
  plan: string;
  signedUp: boolean;
}

export interface SaveProfileInput {
  name: string;
  role: string;
}

/** The plans this app actually sells — the store is the enforcer, not the schema. */
export const PLANS = ['free', 'pro', 'team'] as const;
export type PlanId = (typeof PLANS)[number];

export interface WizardStore {
  snapshot(): WizardData;
  /** The lean guard-key view handed to the session (see the note on googleLinked). */
  projected(): Record<string, unknown>;
  subscribe(onChange: () => void): () => void;
  verifyEmail(): void;
  saveProfile(input: SaveProfileInput): void;
  choosePlan(plan: string): void;
  confirmSignup(): void;
  reset(): void;
}

const EMPTY: WizardData = {
  emailVerified: false,
  profileName: '',
  profileRole: '',
  profileComplete: false,
  plan: '',
  signedUp: false,
};

export function createWizardStore(): WizardStore {
  let data: WizardData = { ...EMPTY };
  const listeners = new Set<() => void>();

  /**
   * Swap-then-notify, and never notify on a no-op. Notifying without a change
   * would push an empty report through the tap, and an empty report is a
   * transition row that says nothing happened — noise in the very log the demo
   * asks people to read.
   */
  function commit(next: WizardData): void {
    if (
      next.emailVerified === data.emailVerified &&
      next.profileName === data.profileName &&
      next.profileRole === data.profileRole &&
      next.profileComplete === data.profileComplete &&
      next.plan === data.plan &&
      next.signedUp === data.signedUp
    ) {
      return;
    }
    data = next;
    for (const listener of [...listeners]) listener();
  }

  return {
    snapshot: () => ({ ...data }),

    /**
     * The keys guards read — and `googleLinked` is DELIBERATELY not among them.
     * This app has no Google integration, so it has nothing honest to say about
     * that key. The library's answer to an unevaluable guard key is to serve the
     * edge WITH a `guardUnevaluated` marker rather than hide it or pretend the
     * condition passed; the demo shows that marker instead of quietly seeding a
     * `false` nobody measured.
     */
    projected: () => ({
      emailVerified: data.emailVerified,
      profileComplete: data.profileComplete,
      plan: data.plan,
      signedUp: data.signedUp,
    }),

    subscribe(onChange) {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },

    verifyEmail() {
      commit({ ...data, emailVerified: true });
    },

    saveProfile(input) {
      const name = String(input?.name ?? '').trim();
      const role = String(input?.role ?? '').trim();
      // The app is the enforcer of its own rules. The declared input schema
      // catches the SHAPE at the door; emptiness is a business rule, and a
      // handler that threw here would honestly land the fire as 'refused'.
      if (!name || !role) throw new Error('A profile needs both a name and a role.');
      commit({ ...data, profileName: name, profileRole: role, profileComplete: true });
    },

    choosePlan(plan) {
      // The schema declares an enum; the structural payload check deliberately
      // does not judge enums (it checks only what it can judge). So the store
      // judges it — the belt the schema is not.
      if (!(PLANS as readonly string[]).includes(plan)) {
        throw new Error(`Unknown plan '${plan}'. Known: ${PLANS.join(', ')}.`);
      }
      commit({ ...data, plan });
    },

    confirmSignup() {
      if (!data.profileComplete || !data.plan) {
        throw new Error('Cannot create an account before the profile and plan are set.');
      }
      commit({ ...data, signedUp: true });
    },

    reset() {
      commit({ ...EMPTY });
    },
  };
}

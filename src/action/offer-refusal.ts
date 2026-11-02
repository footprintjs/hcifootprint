/** A refusal from offer admission, before an invocation or handler is started. */
export type ActionOfferRefusalCode =
  | 'ACTION_OFFER_STALE'
  | 'ACTION_OFFER_UNAVAILABLE'
  | 'ACTION_OFFER_WRONG_PRINCIPAL';

/**
 * Keeps a known admission refusal distinct from a handler or transport failure.
 * Reading current offers is a new decision, never permission to retry the old one.
 */
export class ActionOfferRefusal extends Error {
  readonly execution = 'not-started' as const;
  readonly nextStep: 'read-current-offers' | 'use-matching-principal';

  constructor(readonly code: ActionOfferRefusalCode, message: string) {
    super(message);
    this.name = 'ActionOfferRefusal';
    this.nextStep = code === 'ACTION_OFFER_WRONG_PRINCIPAL'
      ? 'use-matching-principal'
      : 'read-current-offers';
  }
}

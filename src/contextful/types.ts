/**
 * D21 — contextful actions: the vocabulary.
 *
 * ONE DECLARATION, TWO DIRECTIONS. The anchor an app declares so an agent can
 * ACTUATE a control is the same anchor the library can SENSE at; the handler an
 * app registers so an agent can call it is the same function the app's own
 * `onClick` calls. `contextful()` is the one place that says so, and everything
 * below is what comes back out of it.
 *
 * THE FOUR LAWS THIS SURFACE OBEYS — each stated where it is enforced, each with
 * a test named after it in test/contextful-laws.test.ts:
 *
 * 1. BOUNDARY. Key NAMES and event TYPES by default. A value crosses only
 *    through {@link ContextfulOptions.include} and only after the app's own
 *    {@link ContextfulOptions.redact} has seen it. The library owns mechanism
 *    and honesty; the app owns meaning — and its data.
 * 2. TWO-STRING FIREWALL. Everything here is DATA channel. No captured string
 *    is ever composed into agent-facing prose (a brief, a tool description, a
 *    result sentence). Injection through a captured `<div>` is the attack this
 *    kills.
 * 3. SENSING IS EVIDENCE, NOT PROOF. Listener-derived causality is stamped
 *    `inferred` and carries the correlation rule that produced it, ON the
 *    record. React synthetic events, portals and shadow DOM make certainty
 *    impossible — so the record says so instead of pretending.
 * 4. THE BLIND SPOT STAYS HONEST. Sensing may say an effect was `'observed'`
 *    only when the app's own declared expectation matched an observed change.
 *    Value-CORRECTNESS is out of scope and stays a reported limitation: nothing
 *    here checks that what appeared is what should have appeared.
 */
import type { EffectStatus, Settlement } from '../atom/types.js';
import type { AnchorSource } from './anchor-port.js';

/**
 * Who a DIRECT call is filed under — a call the APP made itself, through its
 * own button, rather than one that arrived through `fire()`.
 *
 * 'agent' is deliberately not expressible: an agent has exactly one door into
 * this library and it is `fire()`, so a wrapped function invoked directly is by
 * construction the app's own code acting. Default 'user'; say 'system' when the
 * caller is a timer or a subscription rather than a person at the keyboard.
 */
export type DirectPrincipal = 'user' | 'system';

/**
 * The name that opens the failure MESSAGE, and the one reserved word
 * {@link ContextfulOptions.include} understands.
 *
 * A message is app data — it routinely carries the row that failed, the address
 * that bounced, the id nobody should have seen — so the error CLASS is captured
 * always and the message only when the app names this. A payload key spelled
 * exactly like this cannot be projected by value; pick another name for it.
 */
export const ERROR_MESSAGE = 'error.message';

/**
 * What the app declares it EXPECTS to see happen at the anchor — the only way
 * `effect: 'observed'` can ever be written (law 4).
 *
 * Mechanism and meaning, split at the seam this library always splits them at:
 * the LIBRARY observes that the anchor's subtree changed and hands over the
 * name-class of that change; the APP says whether that change is the effect it
 * declared. The library never guesses which mutation counts, and the predicate
 * never sees a value — so an expectation cannot become a value-capture door.
 */
export interface ActionExpectation {
  /** Your own name for this expectation. Data channel: it rides the record, never prose. */
  name: string;
  /** True when this observed change IS the effect you declared. */
  matches: (change: SensedChange) => boolean;
}

/** What `contextful(fn, opts)` takes. Everything is optional; the defaults are the honest minimum. */
export interface ContextfulOptions {
  /**
   * Attach anchor-scoped listeners and one observer at {@link anchor}. Off by
   * default — sensing is the half that touches the DOM, so it is the half an
   * app opts into.
   */
  watch?: boolean;
  /**
   * The element this action lives at. Required for {@link watch}; a getter is
   * the SSR-safe form (nothing reads the DOM until the session attaches).
   */
  anchor?: AnchorSource;
  /**
   * THE VALUE ALLOWLIST — payload key names that may be captured BY VALUE, plus
   * the reserved {@link ERROR_MESSAGE}. Nothing outside it ever carries a value
   * into the record through this wrapper (law 1). Absent means: no values at
   * all, which is the honest minimum.
   */
  include?: readonly string[];
  /**
   * The app's own redactor, run over every allowlisted value before it is
   * recorded. The library never invents a redaction policy — it only promises
   * that yours is the last word. Return whatever should stand in the record; a
   * redactor that throws costs the value its slot and nothing else.
   */
  redact?: (value: unknown, key: string) => unknown;
  /** What the app expects to SEE at the anchor when this action really happens. */
  expect?: ActionExpectation;
  /** Who a direct (app-initiated) call is filed under. Default 'user'. */
  principal?: DirectPrincipal;
  /**
   * Anchor events NO invocation claimed — the human moving around the control
   * without performing the action (law 3: outside the window is stimulus, never
   * part of the action). Isolated: a listener that throws never reaches the
   * app's own event dispatch.
   */
  onStimulus?: (event: SensedEvent) => void;
}

/** One DOM event the anchor saw. Type and name-class only — never content. */
export interface SensedEvent {
  /** 'click' | 'input' | 'change' — the event class, never its data. */
  type: string;
  /** The target's own `role` attribute, when it has one. */
  targetRole?: string;
  /** The target's tag name, lowercased — the raw fact behind an absent role. */
  targetTag?: string;
  /** Epoch ms. */
  at: number;
}

/** One change the anchor's observer saw, reduced to its name-class. */
export interface SensedChange {
  kind: 'added' | 'removed' | 'attribute' | 'text';
  /** The attribute that changed, for `kind: 'attribute'`. A NAME; never its value. */
  attribute?: string;
  targetRole?: string;
  targetTag?: string;
  at: number;
}

/** How the event trail rides the record — inline while it is small, by reference after. */
export type SensedTrail =
  | { shape: 'inline'; events: SensedEvent[] }
  /** Ask {@link Session.sensedTrail} with the transition's id for the whole thing. */
  | { shape: 'by-reference'; count: number };

/** The effect claim sensing is allowed to make — and it is the only one (law 4). */
export interface SensedEffect {
  /** A change the app's own expectation matched actually happened at the anchor. */
  status: 'observed';
  /** {@link ActionExpectation.name}, copied. */
  expectation: string;
  at: number;
}

/** What the anchor saw while one action was in flight. */
export interface SensedSummary {
  /**
   * ALWAYS 'inferred'. A listener sees that something happened next to
   * something else; it never sees causality. The word is the honesty marker
   * (law 3) and there is no second value it can take.
   */
  association: 'inferred';
  /** The correlation rule that produced this association, in words, on the record. */
  rule: string;
  trail: SensedTrail;
  /** Changes observed inside the window — or 'unobservable' with no observer reachable. */
  changes: number | 'unobservable';
  /** Changes past the budget, dropped. Present only when something WAS dropped. */
  changesDropped?: number;
  /** Events past the budget, dropped. Present only when something WAS dropped. */
  eventsDropped?: number;
  effect?: SensedEffect;
}

/** One guard key and how it read at fire time. A NAME and an outcome — never a value. */
export interface GuardRead {
  key: string;
  /** `'unevaluated'` where the session's state view never held the key. */
  held: boolean | 'unevaluated';
}

/** What was true the moment before the action ran. */
export interface CaptureBefore {
  at: number;
  /** The cursor: where the session was, and at which version. */
  node: string;
  cursorVersion: number;
  /** Guard read-keys and their outcome. Names only — the values stay in the app. */
  guard: GuardRead[];
  /** The allowlisted payload keys, redacted by the app. Absent when nothing was allowlisted. */
  input?: Record<string, unknown>;
}

/** How the action came to rest. */
export interface CaptureAfter {
  at: number;
  /** Milliseconds from {@link CaptureBefore.at}. */
  ms: number;
  effectStatus: EffectStatus;
  outcome: Settlement;
}

/** What went wrong, if anything did. */
export interface CaptureFailure {
  /** The error's constructor name — captured ALWAYS. A class is not app data. */
  errorClass: string;
  /** The message — only when the app allowlisted {@link ERROR_MESSAGE}. */
  message?: string;
}

/**
 * THE CAPTURE ENVELOPE — what a contextful action's fire recorded around
 * itself, on {@link TransitionRecord.captured}.
 *
 * `before` and `after`/`failure` are stamped by the fire itself, so a
 * settlement receipt carries them. `sensed` lands one turn later, on the LIVE
 * record only — the `arrival: 'observed'` precedent, for the same reason: a
 * receipt taken at rest is never rewritten.
 */
export interface ActionCapture {
  before: CaptureBefore;
  after?: CaptureAfter;
  failure?: CaptureFailure;
  sensed?: SensedSummary;
}

/**
 * A SENSE-ONLY declaration — {@link contextful.sense}'s output, handed to
 * `session.sense(actionId, …)`.
 *
 * The L0 on-ramp: an app with no registered handler still gets its humans into
 * the record, because the anchor is enough. A trusted click inside it opens a
 * record-only fire stamped `cause.inferred` — the library performs nothing, it
 * only writes down what it saw.
 */
export interface SenseDeclaration {
  readonly anchor: AnchorSource;
  readonly options: ContextfulOptions;
}

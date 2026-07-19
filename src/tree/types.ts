/**
 * D18 navigation-graph authoring types — the semantic container tree a
 * consumer already holds in their head: pages → areas / tabs / modals → tools.
 *
 * The dual identity: the consumer authors a NAVIGATION graph in their own
 * vocabulary; the agent consumes the derived SKILL graph. `does:` is one
 * authored string with two readers — the consumer's intent label IS the
 * agent's tool description (firewall by construction: it is a source-code
 * literal, never runtime text).
 *
 * Exactly THREE authored semantics exist — everything else is descriptive:
 * - `modals`  — overlay masking (a shown modal suppresses sibling tools;
 *               `blocks: false` opts a popover out). Modals are NEVER assumed
 *               active: closed until registered/shown.
 * - `tabs`    — an exclusivity PRIOR ("at most one child shown"). NOT a
 *               statechart: no transitions, no initial, no history.
 * - `repeats` — a template node with runtime instance keys (one parameterized
 *               tool for N cards, never N tools).
 */
import type { WhereFilter } from 'footprintjs';
import type { Binding, CanonicalRole, SkillGraphSpec } from '../atom/types.js';
import type { InteractionSession, InteractionSessionOptions } from '../traverse/nav-session.js';

// ---------------------------------------------------------------------------
// Authoring (what buildNavigationGraph() accepts)
// ---------------------------------------------------------------------------

/** A tool on a node. Only `does` is required — details may materialize at mount. */
export interface ToolDef {
  /** AUTHORED intent, one string two readers (consumer label = agent tool description). */
  does: string;
  /** How to reach it on screen (optional — L0b actuation; handlers don't need it). */
  binding?: Binding;
  /** Availability guard over projected state (AND-composed with every ancestor `when`). */
  when?: WhereFilter;
  /** State keys this tool claims to change. */
  writes?: string[];
  /** Page this tool claims to navigate to (a top-level page id). */
  goTo?: string;
  /** Requires explicit confirmation (the high-effect gate). */
  confirm?: boolean;
  /** Payload contract: Zod, JSON Schema, or any .safeParse/.parse validator. */
  input?: unknown;
  role?: CanonicalRole;
}

/** A container node: areas coexist (AND), tabs exclude (at most one shown), modals overlay. */
export interface NodeDef {
  /** Optional authored description of the container itself. */
  does?: string;
  /** Container guard: every descendant tool's guard is AND-narrowed by this. */
  when?: WhereFilter;
  areas?: Record<string, NodeDef>;
  tabs?: Record<string, NodeDef>;
  modals?: Record<string, ModalDef>;
  /** Template container: instances carry runtime keys (order cards, product tiles). */
  repeats?: boolean;
  /**
   * L2 existence source for a repeats container: the COMPLETE instance set,
   * from projected state (order #57 exists while scrolled out of view).
   * Without it, served instance lists fall back to the mounted window —
   * honestly marked enumeration:'mounted-window'.
   */
  instances?: (state: Record<string, unknown>) => string[];
  tools?: Record<string, ToolDef>;
}

export interface ModalDef extends NodeDef {
  /** Default true: a shown modal masks tools outside it. `false` = popover (coexists). */
  blocks?: boolean;
}

export interface PageNodeDef extends NodeDef {
  route?: string;
}

export interface SkillDef2 {
  does: string;
  /** Steps by qualified path ('checkout.confirm-order.place-order') or unambiguous suffix ('place-order'). */
  steps: string[];
  when?: WhereFilter;
}

export interface NavigationGraphDef {
  does?: string;
  pages: Record<string, PageNodeDef>;
  /** Root-level multi-attach tools: offered on several PAGES at once. */
  tools?: Record<string, ToolDef & { on: string | string[] }>;
  skills?: Record<string, SkillDef2>;
}

// ---------------------------------------------------------------------------
// Typed node paths — buildNavigationGraph infers the union of every node path
// from the def literal, so a typo in registerToolGroup('catalog.filter-rai')
// or setVisible/show is a COMPILE error, not a silent no-op.
// ---------------------------------------------------------------------------

type BucketPaths<Prefix extends string, B> = B extends Record<string, unknown>
  ? { [K in keyof B & string]: `${Prefix}.${K}` | ChildPaths<`${Prefix}.${K}`, B[K]> }[keyof B & string]
  : never;

type ChildPaths<Prefix extends string, N> =
  | (N extends { areas: infer A } ? BucketPaths<Prefix, A> : never)
  | (N extends { tabs: infer T } ? BucketPaths<Prefix, T> : never)
  | (N extends { modals: infer M } ? BucketPaths<Prefix, M> : never);

/** The union of every declared node path in a NavigationGraphDef literal. */
export type NodePathsOf<Def> = Def extends { pages: infer P }
  ? P extends Record<string, unknown>
    ? { [K in keyof P & string]: K | ChildPaths<K, P[K]> }[keyof P & string]
    : string
  : string;

// ---------------------------------------------------------------------------
// Compiled (what buildNavigationGraph() returns — plain frozen data + index)
// ---------------------------------------------------------------------------

export type NodeKind = 'page' | 'area' | 'tab' | 'modal';

export interface MapNode {
  /** Dot path — the node's identity ('checkout.confirm-order'). */
  path: string;
  /** Last path segment. */
  id: string;
  kind: NodeKind;
  /** Parent path; null for pages. */
  parent: string | null;
  /** Owning page id (== path's first segment). */
  page: string;
  /** Child NODE paths (tools are not children — see AppMap.toolNodes). */
  children: string[];
  /** True for a blocking modal (kind 'modal' with blocks !== false). */
  overlay: boolean;
  repeats: boolean;
  /** The node's OWN `when` (tool guards already carry the composed chain). */
  guard?: WhereFilter;
  description?: string;
  instances?: (state: Record<string, unknown>) => string[];
}

export interface NavigationGraph<Paths extends string = string> {
  id: string;
  /**
   * The flat projection: a Session-compatible SkillGraphSpec whose affordance
   * ids are qualified dot paths and whose guards are the composed root→leaf
   * chains. A plain Session runs on it unchanged; InteractionSession adds the tree.
   */
  spec: SkillGraphSpec;
  /** Every node by path — pages included. */
  nodes: Record<string, MapNode>;
  /** Qualified tool id → the node path(s) it lives on (root tools list their pages). */
  toolNodes: Record<string, string[]>;
  /** Create a live interaction session; `Paths` carries the typed node paths through. */
  createSession(opts?: InteractionSessionOptions): InteractionSession<Paths>;
  /**
   * The sorted, deduped set of state keys every guard in this graph reads —
   * across ALL tool `when`s, container-node `when`s, and skill preconditions,
   * whether or not the node is currently mounted. Seed each of these in your
   * state projector: a guard key ABSENT from projected state is NOT treated as
   * false and hidden — it is served WITH the `guardUnevaluated` honesty marker
   * (the edge is offered, the missing condition flagged as taken-on-faith), so
   * an incompletely-seeded projector silently degrades honest availability into
   * unevaluated-guess territory. Container `when`s are included because they
   * AND-compose into every descendant tool's guard (at build, and into
   * mount-declared tools at runtime), so a guard-bearing container must be
   * seeded even before a tool lands under it. A projection covering this whole
   * set is what lets guards actually decide rather than defer.
   */
  requiredStateKeys(): string[];
}


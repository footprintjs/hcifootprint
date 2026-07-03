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
import type { NavSession, NavSessionOptions } from '../traverse/nav-session.js';

// ---------------------------------------------------------------------------
// Authoring (what appMap() accepts)
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

export interface AppMapDef {
  does?: string;
  pages: Record<string, PageNodeDef>;
  /** Root-level multi-attach tools: offered on several PAGES at once. */
  tools?: Record<string, ToolDef & { on: string | string[] }>;
  skills?: Record<string, SkillDef2>;
}

// ---------------------------------------------------------------------------
// Compiled (what appMap() returns — plain frozen data + the tree index)
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

export interface AppMap {
  id: string;
  /**
   * The flat projection: a Session-compatible SkillGraphSpec whose affordance
   * ids are qualified dot paths and whose guards are the composed root→leaf
   * chains. A plain Session runs on it unchanged; NavSession adds the tree.
   */
  spec: SkillGraphSpec;
  /** Every node by path — pages included. */
  nodes: Record<string, MapNode>;
  /** Qualified tool id → the node path(s) it lives on (root tools list their pages). */
  toolNodes: Record<string, string[]>;
  createSession(opts?: NavSessionOptions): NavSession;
}

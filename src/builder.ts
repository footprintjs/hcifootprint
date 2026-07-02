/**
 * skillGraph() — the fluent authoring surface.
 *
 * Authoring is the primary acquisition mode by design: guards and intent are
 * semantic and unrecoverable from passive observation. The builder's job is
 * the enforcement spine — every referential or shape mistake fails LOUDLY at
 * build() so the graph can't silently drift into lying to a planner.
 */
import { detectSchema } from 'footprintjs';
import type {
  Affordance,
  AffordanceDef,
  CanonicalRole,
  Page,
  PageDef,
  SessionOptions,
  Skill,
  SkillDef,
  SkillGraphSpec,
} from './types.js';
import { Session } from './session.js';

const FILTER_OPERATORS = new Set(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn']);

/** Mirrors footprint evaluator's DENIED_KEYS — guards on these silently never match at runtime. */
const DENIED_GUARD_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

export class SkillGraphValidationError extends Error {
  constructor(message: string) {
    super(`hcifootprint: ${message}`);
    this.name = 'SkillGraphValidationError';
  }
}

export interface SkillGraph {
  spec: SkillGraphSpec;
  createSession(opts: SessionOptions): Session;
}

export function skillGraph(id: string, opts?: { description?: string }): SkillGraphBuilder {
  return new SkillGraphBuilder(id, opts?.description);
}

export class SkillGraphBuilder {
  readonly #id: string;
  readonly #description?: string;
  readonly #pages = new Map<string, PageDef>();
  readonly #affordances = new Map<string, AffordanceDef>();
  readonly #skills = new Map<string, SkillDef>();

  constructor(id: string, description?: string) {
    if (!id || !id.trim()) throw new SkillGraphValidationError('skillGraph(id) requires a non-empty id.');
    this.#id = id;
    this.#description = description;
  }

  page(id: string, def: PageDef = {}): this {
    if (this.#pages.has(id)) throw new SkillGraphValidationError(`duplicate page id '${id}'.`);
    this.#pages.set(id, def);
    return this;
  }

  affordance(id: string, def: AffordanceDef): this {
    if (this.#affordances.has(id)) throw new SkillGraphValidationError(`duplicate affordance id '${id}'.`);
    if (!def.description || !def.description.trim()) {
      throw new SkillGraphValidationError(
        `affordance '${id}' needs a description — it is the planner-facing text an LLM sees.`,
      );
    }
    if (def.guard && Object.keys(def.guard).length === 0) {
      throw new SkillGraphValidationError(
        `affordance '${id}' has an empty guard {} — footprint's evaluator deliberately NEVER matches ` +
          `an empty filter (anti-vacuous-truth). Omit 'guard' entirely for an always-offered affordance.`,
      );
    }
    if (def.guard) this.#validateGuardShape(`affordance '${id}' guard`, def.guard as Record<string, unknown>);
    if (Array.isArray(def.on) && def.on.length === 0) {
      throw new SkillGraphValidationError(
        `affordance '${id}' has on: [] — it would never be offered anywhere. List at least one page.`,
      );
    }
    if (def.schema !== undefined && detectSchema(def.schema) === 'none') {
      throw new SkillGraphValidationError(
        `affordance '${id}' has an unrecognized schema — pass a Zod schema, a JSON Schema object, ` +
          `or a validator with .safeParse/.parse.`,
      );
    }
    this.#affordances.set(id, def);
    return this;
  }

  skill(id: string, def: SkillDef): this {
    if (this.#skills.has(id)) throw new SkillGraphValidationError(`duplicate skill id '${id}'.`);
    if (!def.description || !def.description.trim()) {
      throw new SkillGraphValidationError(`skill '${id}' needs a description (planner-facing text).`);
    }
    if (!def.steps || def.steps.length === 0) {
      throw new SkillGraphValidationError(`skill '${id}' needs at least one step (affordance id).`);
    }
    if (def.precondition && Object.keys(def.precondition).length === 0) {
      throw new SkillGraphValidationError(
        `skill '${id}' has an empty precondition {} — it would never pass. Omit it instead.`,
      );
    }
    if (def.precondition) {
      this.#validateGuardShape(`skill '${id}' precondition`, def.precondition as Record<string, unknown>);
    }
    this.#skills.set(id, def);
    return this;
  }

  build(): SkillGraph {
    if (this.#pages.size === 0) {
      throw new SkillGraphValidationError(`graph '${this.#id}' has no pages — add at least one .page().`);
    }

    const pages: Record<string, Page> = {};
    for (const [id, def] of this.#pages) pages[id] = { id, ...def };

    const affordances: Record<string, Affordance> = {};
    for (const [id, def] of this.#affordances) {
      const on = Array.isArray(def.on) ? [...def.on] : [def.on];
      for (const pageId of on) {
        if (!pages[pageId]) {
          throw new SkillGraphValidationError(
            `affordance '${id}' is offered on unknown page '${pageId}'. Known pages: ${[...this.#pages.keys()].join(', ')}.`,
          );
        }
      }
      if (def.effect?.navigatesTo && !pages[def.effect.navigatesTo]) {
        throw new SkillGraphValidationError(
          `affordance '${id}' declares navigatesTo unknown page '${def.effect.navigatesTo}'.`,
        );
      }
      // Clone + deep-freeze plain data so the compiled graph is decoupled from
      // the author's live objects (post-build mutation must not silently change
      // what a session offers). `schema` is the one exception: validators hold
      // functions, so it stays by reference and MCP emission clones on the way out.
      affordances[id] = deepFreeze({
        id,
        on,
        description: def.description,
        binding: structuredClone(def.binding),
        guard: def.guard ? structuredClone(def.guard) : undefined,
        effect: def.effect ? structuredClone(def.effect) : undefined,
        schema: def.schema,
        highEffect: def.highEffect ?? false,
        role: deriveRole(def),
      }) as Affordance;
    }

    const skills: Record<string, Skill> = {};
    for (const [id, def] of this.#skills) {
      for (const step of def.steps) {
        if (!affordances[step]) {
          throw new SkillGraphValidationError(
            `skill '${id}' step '${step}' is not a known affordance. Known: ${[...this.#affordances.keys()].join(', ')}.`,
          );
        }
      }
      skills[id] = deepFreeze({
        id,
        description: def.description,
        steps: [...def.steps],
        precondition: def.precondition ? structuredClone(def.precondition) : undefined,
      }) as Skill;
    }

    for (const page of Object.values(pages)) Object.freeze(page);
    const spec: SkillGraphSpec = Object.freeze({
      id: this.#id,
      description: this.#description,
      pages: Object.freeze(pages),
      affordances: Object.freeze(affordances),
      skills: Object.freeze(skills),
    });

    return {
      spec,
      createSession: (opts: SessionOptions) => new Session(spec, opts),
    };
  }

  /** Catch shape mistakes at build time — the evaluator fails them silently at runtime. */
  #validateGuardShape(owner: string, guard: Record<string, unknown>): void {
    for (const [key, ops] of Object.entries(guard)) {
      if (DENIED_GUARD_KEYS.has(key)) {
        throw new SkillGraphValidationError(
          `${owner} key '${key}' is on footprint's denied list — it would silently never match at runtime.`,
        );
      }
      if (!ops || typeof ops !== 'object' || Array.isArray(ops)) {
        throw new SkillGraphValidationError(
          `${owner} key '${key}' must map to an operator object like { eq: value } ` +
            `(operators: ${[...FILTER_OPERATORS].join(', ')}).`,
        );
      }
      if (Object.keys(ops).length === 0) {
        throw new SkillGraphValidationError(
          `${owner} key '${key}' has an empty operator object {} — the evaluator would silently ignore it ` +
            `(or never match if it is the only key). Give it an operator like { eq: value } or remove the key.`,
        );
      }
      for (const op of Object.keys(ops)) {
        if (!FILTER_OPERATORS.has(op)) {
          throw new SkillGraphValidationError(
            `${owner} key '${key}' uses unknown operator '${op}' (valid: ${[...FILTER_OPERATORS].join(', ')}).`,
          );
        }
      }
    }
  }
}

function deriveRole(def: AffordanceDef): CanonicalRole {
  if (def.role) return def.role;
  if (def.effect?.navigatesTo) return 'next';
  return 'action';
}

/** Freeze an object and every plain nested object/array. Skips the (unfrozen) `schema` field. */
function deepFreeze<T extends object>(value: T): T {
  for (const [key, child] of Object.entries(value)) {
    if (key === 'schema') continue;
    if (child && typeof child === 'object') deepFreeze(child as object);
  }
  return Object.freeze(value);
}

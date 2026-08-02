/**
 * buildNavigationGraph() — the authoring surface: one object literal, validated and
 * frozen in one call (no .build()).
 *
 * The compiler's two jobs:
 * 1. ENFORCEMENT SPINE: every referential or shape mistake dies loudly here,
 *    because the runtime fails them silently — typos in node paths, unknown
 *    goTo pages, guard-operator typos, ambiguous journey-step suffixes,
 *    narrowing conflicts.
 * 2. FLAT PROJECTION: the tree compiles to a Session-compatible
 *    NavigationGraphSpec (qualified dot-path ids, composed guards, on=[page]) so
 *    every existing layer — frames, brief, gap ledger, MCP emission, the
 *    footprint trace stack — works on tree graphs unchanged. NavSession adds
 *    the tree semantics ON TOP of that projection.
 */
import { detectSchema } from 'footprintjs';
import type { WhereFilter } from 'footprintjs';
import type {
  Affordance,
  CanonicalRole,
  Page,
  Journey,
  NavigationGraphSpec,
} from '../atom/types.js';
import { GraphValidationError, checkLiteralHref, checkSegment, composeGuards, guardStateKeys, validateGuardShape } from '../graph/guards.js';
import { noInputFlag, schemaOf, takesNoInput } from '../traverse/expects.js';
import { mergeSources } from '../graph/sources/merge.js';
import { actionsOf, journeysOf } from './authoring-keys.js';
import { InteractionSession } from '../traverse/nav-session.js';
import type { InteractionSessionOptions } from '../traverse/nav-session.js';
import type { LiveSource } from '../graph/sources/types.js';
import type { NavigationGraph, NavigationGraphDef, NodePathsOf, MapNode, NodeDef, ActionDef } from './types.js';

/**
 * Compile a navigation graph. The `const` type parameter preserves the literal
 * node names, so the returned graph's session methods (registerActions,
 * setVisible, show) accept ONLY real node paths — a typo is a compile error.
 */
export function buildNavigationGraph<const Def extends NavigationGraphDef>(
  id: string,
  rawDef: Def,
): NavigationGraph<NodePathsOf<Def>> {
  if (!id || !id.trim()) throw new GraphValidationError('buildNavigationGraph(id) requires a non-empty id.');
  // Declared sources fold into ONE plain def BEFORE the walk, so every pass
  // below (checkSegment, compileAction, resolveStep, freeze) runs unchanged on
  // merged input. A def without sources takes the identity path — it compiles
  // bit-for-bit as it did before sources existed.
  const def: NavigationGraphDef = rawDef.sources && rawDef.sources.length > 0 ? mergeSources(rawDef) : rawDef;
  // Live sources are HELD by the compiled graph (mergeSources validated them;
  // they fold nothing statically — last in the order, bind-only): every
  // createSession() below attaches each one to the new session, and the
  // session's detachSources() releases them.
  const liveSources: LiveSource[] = (rawDef.sources ?? []).filter(
    (source): source is LiveSource => source?.kind === 'live',
  );
  // The no-pages refusal judges the EFFECTIVE graph: a def whose only pages
  // come from fromRoutes(...) is a complete graph, not an empty one.
  if (!def.pages || Object.keys(def.pages).length === 0) {
    throw new GraphValidationError(`buildNavigationGraph '${id}' has no pages — declare at least one.`);
  }
  // The refusal above just proved the EFFECTIVE def has pages ('pages' is
  // optional at the type level — a sources-only def is the headline use case,
  // and mergeSources always materialises the key). Captured once because
  // control-flow narrowing cannot follow `def.pages` into the nested
  // compileAction below.
  const declaredPages = def.pages;

  // Null-prototype containers: membership checks and lookups must never see
  // Object.prototype ('toString' as a journey step would otherwise resolve to a
  // FUNCTION and pass), and a page literally named '__proto__' must be a key,
  // not a prototype swap.
  const nodes: Record<string, MapNode> = Object.create(null) as Record<string, MapNode>;
  const actionNodes: Record<string, string[]> = Object.create(null) as Record<string, string[]>;
  const affordances: Record<string, Affordance> = Object.create(null) as Record<string, Affordance>;
  const pages: Record<string, Page> = Object.create(null) as Record<string, Page>;

  // -- walk the tree ---------------------------------------------------------
  for (const [pageId, pageDef] of Object.entries(declaredPages)) {
    checkSegment(`page '${pageId}'`, pageId);
    pages[pageId] = { id: pageId, route: pageDef.route, description: pageDef.does };
    walkNode(pageId, pageId, null, 'page', pageDef, []);
  }

  function walkNode(
    path: string,
    pageId: string,
    parent: string | null,
    kind: MapNode['kind'],
    nodeDef: NodeDef & { blocks?: boolean },
    guardChain: WhereFilter[],
  ): void {
    if (nodeDef.when) {
      rejectEmptyFilter(`node '${path}'`, 'when', nodeDef.when);
      validateGuardShape(`node '${path}' when`, nodeDef.when as Record<string, unknown>);
    }
    if (nodeDef.repeats && kind === 'page') {
      throw new GraphValidationError(`page '${path}' cannot be repeats — repeat a container inside it.`);
    }
    if (nodeDef.instances && !nodeDef.repeats) {
      throw new GraphValidationError(
        `node '${path}' declares an instances source but is not repeats: true.`,
      );
    }
    const chain = nodeDef.when ? [...guardChain, nodeDef.when] : guardChain;
    const node: MapNode = {
      path,
      id: path.split('.').pop()!,
      kind,
      parent,
      page: pageId,
      children: [],
      overlay: kind === 'modal' && nodeDef.blocks !== false,
      repeats: nodeDef.repeats ?? false,
      // Clone: the compiled node owns its guard bytes — deepFreeze below must
      // never freeze (or alias) the AUTHOR's live object.
      guard: nodeDef.when ? structuredClone(nodeDef.when) : undefined,
      description: nodeDef.does,
      instances: nodeDef.instances,
    };
    nodes[path] = node;

    const childNames = new Set<string>();
    const buckets: Array<[MapNode['kind'], Record<string, NodeDef> | undefined]> = [
      ['area', nodeDef.areas],
      ['tab', nodeDef.tabs],
      ['modal', nodeDef.modals],
    ];
    for (const [childKind, bucket] of buckets) {
      for (const [name, childDef] of Object.entries(bucket ?? {})) {
        checkSegment(`node '${path}' child '${name}'`, name);
        if (childNames.has(name)) {
          throw new GraphValidationError(
            `node '${path}' declares '${name}' twice (areas/tabs/modals share one namespace).`,
          );
        }
        childNames.add(name);
        const childPath = `${path}.${name}`;
        node.children.push(childPath);
        walkNode(childPath, pageId, path, childKind, childDef, chain);
      }
    }

    // The controls declared on this node, read through the ONE door that knows
    // the authoring keys (`actions:`) and refuses the renamed one by name.
    for (const [name, action] of Object.entries(actionsOf(nodeDef) ?? {})) {
      checkSegment(`action '${name}' on '${path}'`, name);
      if (childNames.has(name)) {
        throw new GraphValidationError(
          `'${path}.${name}' is both a container and an action — give one of them another name.`,
        );
      }
      const qualifiedId = `${path}.${name}`;
      compileAction(qualifiedId, [path], pageId === path ? [pageId] : [pageId], action, chain);
      actionNodes[qualifiedId] = [path];
    }
  }

  // -- root-level multi-attach actions ----------------------------------------
  for (const [name, action] of Object.entries(actionsOf(def) ?? {})) {
    checkSegment(`root action '${name}'`, name);
    const on = Array.isArray(action.on) ? [...action.on] : [action.on];
    if (on.length === 0) {
      throw new GraphValidationError(`root action '${name}' has on: [] — list at least one page.`);
    }
    for (const pageId of on) {
      if (!Object.hasOwn(declaredPages, pageId)) {
        throw new GraphValidationError(
          `root action '${name}' is offered on unknown page '${pageId}'. Known pages: ${Object.keys(declaredPages).join(', ')}.`,
        );
      }
    }
    if (Object.hasOwn(affordances, name) || Object.hasOwn(nodes, name)) {
      throw new GraphValidationError(`root action '${name}' collides with an existing id.`);
    }
    compileAction(name, on, on, action, []);
    actionNodes[name] = on; // a root action lives on each page it is offered on
  }

  function compileAction(
    qualifiedId: string,
    _nodePaths: string[],
    onPages: string[],
    action: ActionDef,
    guardChain: WhereFilter[],
  ): void {
    if (qualifiedId === 'leave-journey' || qualifiedId.endsWith('.leave-journey')) {
      throw new GraphValidationError(
        `action name 'leave-journey' is reserved — it is the synthetic escape tool served while a journey frame is open.`,
      );
    }
    if (!action.does || !action.does.trim()) {
      throw new GraphValidationError(
        `action '${qualifiedId}' needs a 'does' — it is the one authored string both the consumer and the LLM read.`,
      );
    }
    if (action.when) {
      rejectEmptyFilter(`action '${qualifiedId}'`, 'when', action.when);
      validateGuardShape(`action '${qualifiedId}' when`, action.when as Record<string, unknown>);
    }
    if (action.goTo && !Object.hasOwn(declaredPages, action.goTo)) {
      throw new GraphValidationError(
        `action '${qualifiedId}' goTo unknown page '${action.goTo}'. Known pages: ${Object.keys(declaredPages).join(', ')}.`,
      );
    }
    // The sentinel is read BEFORE detectSchema, which would otherwise judge the
    // author's explicit "no input" an unrecognized schema and refuse it.
    if (action.input !== undefined && !takesNoInput(action.input) && detectSchema(action.input) === 'none') {
      throw new GraphValidationError(
        `action '${qualifiedId}' has an unrecognized input schema — pass a Zod schema, a JSON Schema object, ` +
          `a validator with .safeParse/.parse, or the string 'none' for an action that takes no input.`,
      );
    }
    if (action.enabledWhen) {
      rejectEmptyFilter(`action '${qualifiedId}'`, 'enabledWhen', action.enabledWhen);
      validateGuardShape(`action '${qualifiedId}' enabledWhen`, action.enabledWhen as Record<string, unknown>);
    }
    if (action.verify && typeof action.verify !== 'function') {
      rejectEmptyFilter(`action '${qualifiedId}'`, 'verify', action.verify);
      validateGuardShape(`action '${qualifiedId}' verify`, action.verify as Record<string, unknown>);
    }
    // Never-trap BUILD gate, url half: a paramful href can NEVER materialise,
    // so it dies here — which also makes "a journey whose entry step's gesture
    // is such a url" unconstructable, since every static action passes this door.
    if (action.binding?.kind === 'url') checkLiteralHref(`action '${qualifiedId}'`, action.binding.href);
    const guard = composeGuards(qualifiedId, [...guardChain, ...(action.when ? [action.when] : [])]) as
      | WhereFilter
      | undefined;
    const effect =
      action.writes || action.goTo
        ? { ...(action.writes ? { writes: [...action.writes] } : {}), ...(action.goTo ? { navigatesTo: action.goTo } : {}) }
        : undefined;
    affordances[qualifiedId] = deepFreeze(
      {
        id: qualifiedId,
        on: [...onPages],
        description: action.does,
        binding: action.binding ? structuredClone(action.binding) : undefined,
        guard,
        effect,
        schema: schemaOf(action.input),
        ...noInputFlag(action.input),
        ...(action.enabledWhen ? { enabledWhen: structuredClone(action.enabledWhen) } : {}),
        // A predicate stays by reference (it is code, like a validator); a
        // declarative contract is cloned, so the compiled graph owns its bytes.
        ...(action.verify
          ? { verify: typeof action.verify === 'function' ? action.verify : structuredClone(action.verify) }
          : {}),
        highEffect: action.confirm ?? false,
        role: deriveRole(action),
        descriptionSource: 'declared',
      },
      new Set(['schema', 'verify']), // live references stay by reference — ROOT level only
    ) as Affordance;
  }

  // -- journeys (qualified paths, unambiguous-suffix resolution) --------------
  const journeys: Record<string, Journey> = Object.create(null) as Record<string, Journey>;
  for (const [journeyId, journeyDef] of Object.entries(journeysOf(def) ?? {})) {
    // Journey ids feed MCP tool names — same character rules as path segments,
    // or two distinct journeys could sanitize to ONE colliding tool name.
    checkSegment(`journey '${journeyId}'`, journeyId);
    if (!journeyDef.does || !journeyDef.does.trim()) {
      throw new GraphValidationError(`journey '${journeyId}' needs a 'does' (planner-facing text).`);
    }
    if (!journeyDef.steps || journeyDef.steps.length === 0) {
      throw new GraphValidationError(`journey '${journeyId}' needs at least one step.`);
    }
    if (journeyDef.when) {
      rejectEmptyFilter(`journey '${journeyId}'`, 'when', journeyDef.when);
      validateGuardShape(`journey '${journeyId}' when`, journeyDef.when as Record<string, unknown>);
    }
    const steps = journeyDef.steps.map((step) => resolveStep(journeyId, step));
    journeys[journeyId] = deepFreeze({
      id: journeyId,
      description: journeyDef.does,
      steps,
      precondition: journeyDef.when ? structuredClone(journeyDef.when) : undefined,
    }) as Journey;
  }

  function resolveStep(journeyId: string, step: string): string {
    if (Object.hasOwn(affordances, step)) return step;
    const suffix = `.${step}`;
    const candidates = Object.keys(affordances).filter((qid) => qid.endsWith(suffix));
    if (candidates.length === 1) return candidates[0];
    if (candidates.length === 0) {
      throw new GraphValidationError(
        `journey '${journeyId}' step '${step}' matches no action. Known: ${Object.keys(affordances).join(', ')}.`,
      );
    }
    throw new GraphValidationError(
      `journey '${journeyId}' step '${step}' is ambiguous — qualify it: ${candidates.join(' | ')}.`,
    );
  }

  // -- freeze + assemble -------------------------------------------------------
  for (const page of Object.values(pages)) Object.freeze(page);
  for (const node of Object.values(nodes)) deepFreeze(node, new Set(['instances']));
  for (const paths of Object.values(actionNodes)) Object.freeze(paths);
  const spec: NavigationGraphSpec = Object.freeze({
    id,
    description: def.does,
    pages: Object.freeze(pages),
    affordances: Object.freeze(affordances),
    journeys: Object.freeze(journeys),
  });
  const map: NavigationGraph = {
    id,
    spec,
    nodes: Object.freeze(nodes),
    actionNodes: Object.freeze(actionNodes),
    createSession: (opts?: InteractionSessionOptions) => new InteractionSession(map, opts, liveSources),
    // Action guards already carry the COMPOSED ancestor chain, but a guard-bearing
    // container with no static descendant action contributes keys only via its own
    // node.guard (composed into mount-declared actions at runtime) — so fold those in too.
    requiredStateKeys: () =>
      guardStateKeys([
        ...Object.values(spec.affordances).map((aff) => aff.guard),
        ...Object.values(spec.journeys).map((journey) => journey.precondition),
        ...Object.values(nodes).map((node) => node.guard),
      ]),
  };
  // The runtime object is path-untyped; the `const Def` signature re-attaches
  // the literal node-path union to what the caller sees.
  return Object.freeze(map) as unknown as NavigationGraph<NodePathsOf<Def>>;
}


function deriveRole(action: ActionDef): CanonicalRole {
  if (action.role) return action.role;
  if (action.goTo) return 'next';
  return 'action';
}

/** What an empty filter would COST, per field — the half of the sentence that teaches. */
const EMPTY_FILTER_COST = {
  when: 'nothing it guards could ever be offered',
  enabledWhen: 'the control could only ever be disabled',
  verify: 'the action could only ever refuse',
} as const;

/**
 * An empty filter, refused at the compiler door.
 *
 * `field` is a PARAMETER rather than the baked-in word 'when' because the
 * correction has to name the author's own declaration: one shared sentence
 * ending "Omit 'when' entirely instead" was raised for `enabledWhen` and
 * `verify` too, sending a reader to delete a field that was not there. The
 * other authoring door (mount-declared actions) already names its own; this
 * makes both teach the same correction.
 */
function rejectEmptyFilter(
  owner: string,
  field: keyof typeof EMPTY_FILTER_COST,
  filter: WhereFilter,
): void {
  if (Object.keys(filter).length === 0) {
    throw new GraphValidationError(
      `${owner} has an empty ${field} {} — footprint's evaluator deliberately NEVER matches an empty ` +
        `filter (anti-vacuous-truth), so ${EMPTY_FILTER_COST[field]}. Omit '${field}' entirely instead.`,
    );
  }
}

/**
 * Freeze an object and every plain nested object/array. `skipKeys` (live
 * references like schema validators / instances selectors) applies at the ROOT
 * level ONLY — a state key that happens to be NAMED 'schema' deep inside a
 * guard still freezes.
 */
function deepFreeze<T extends object>(value: T, skipKeys?: Set<string>): T {
  for (const [key, child] of Object.entries(value)) {
    if (skipKeys?.has(key)) continue;
    if (child && typeof child === 'object') deepFreeze(child as object);
  }
  return Object.freeze(value);
}

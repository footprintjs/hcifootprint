/**
 * appMap() — the D18 authoring surface: one object literal, validated and
 * frozen in one call (no .build()).
 *
 * The compiler's two jobs:
 * 1. ENFORCEMENT SPINE (same philosophy as skillGraph()): every referential
 *    or shape mistake dies loudly here, because the runtime fails them
 *    silently — typos in node paths, unknown goTo pages, guard-operator
 *    typos, ambiguous skill-step suffixes, narrowing conflicts.
 * 2. FLAT PROJECTION: the tree compiles to a Session-compatible
 *    SkillGraphSpec (qualified dot-path ids, composed guards, on=[page]) so
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
  Skill,
  SkillGraphSpec,
} from '../atom/types.js';
import { SkillGraphValidationError, composeGuards, validateGuardShape } from '../graph/guards.js';
import { NavSession } from '../traverse/nav-session.js';
import type { NavSessionOptions } from '../traverse/nav-session.js';
import type { AppMap, AppMapDef, MapNode, NodeDef, ToolDef } from './types.js';

/** Segment names become path/registry/MCP identities — keep the delimiters out. */
const BAD_SEGMENT = /[.[\]#/|]/;

export function appMap(id: string, def: AppMapDef): AppMap {
  if (!id || !id.trim()) throw new SkillGraphValidationError('appMap(id) requires a non-empty id.');
  if (!def.pages || Object.keys(def.pages).length === 0) {
    throw new SkillGraphValidationError(`appMap '${id}' has no pages — declare at least one.`);
  }

  // Null-prototype containers: membership checks and lookups must never see
  // Object.prototype ('toString' as a skill step would otherwise resolve to a
  // FUNCTION and pass), and a page literally named '__proto__' must be a key,
  // not a prototype swap.
  const nodes: Record<string, MapNode> = Object.create(null) as Record<string, MapNode>;
  const toolNodes: Record<string, string[]> = Object.create(null) as Record<string, string[]>;
  const affordances: Record<string, Affordance> = Object.create(null) as Record<string, Affordance>;
  const pages: Record<string, Page> = Object.create(null) as Record<string, Page>;

  // -- walk the tree ---------------------------------------------------------
  for (const [pageId, pageDef] of Object.entries(def.pages)) {
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
      rejectEmptyWhen(`node '${path}'`, nodeDef.when);
      validateGuardShape(`node '${path}' when`, nodeDef.when as Record<string, unknown>);
    }
    if (nodeDef.repeats && kind === 'page') {
      throw new SkillGraphValidationError(`page '${path}' cannot be repeats — repeat a container inside it.`);
    }
    if (nodeDef.instances && !nodeDef.repeats) {
      throw new SkillGraphValidationError(
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
          throw new SkillGraphValidationError(
            `node '${path}' declares '${name}' twice (areas/tabs/modals share one namespace).`,
          );
        }
        childNames.add(name);
        const childPath = `${path}.${name}`;
        node.children.push(childPath);
        walkNode(childPath, pageId, path, childKind, childDef, chain);
      }
    }

    for (const [name, tool] of Object.entries(nodeDef.tools ?? {})) {
      checkSegment(`tool '${name}' on '${path}'`, name);
      if (childNames.has(name)) {
        throw new SkillGraphValidationError(
          `'${path}.${name}' is both a container and a tool — give one of them another name.`,
        );
      }
      const qualifiedId = `${path}.${name}`;
      compileTool(qualifiedId, [path], pageId === path ? [pageId] : [pageId], tool, chain);
      toolNodes[qualifiedId] = [path];
    }
  }

  // -- root-level multi-attach tools ------------------------------------------
  for (const [name, tool] of Object.entries(def.tools ?? {})) {
    checkSegment(`root tool '${name}'`, name);
    const on = Array.isArray(tool.on) ? [...tool.on] : [tool.on];
    if (on.length === 0) {
      throw new SkillGraphValidationError(`root tool '${name}' has on: [] — list at least one page.`);
    }
    for (const pageId of on) {
      if (!Object.hasOwn(def.pages, pageId)) {
        throw new SkillGraphValidationError(
          `root tool '${name}' is offered on unknown page '${pageId}'. Known pages: ${Object.keys(def.pages).join(', ')}.`,
        );
      }
    }
    if (Object.hasOwn(affordances, name) || Object.hasOwn(nodes, name)) {
      throw new SkillGraphValidationError(`root tool '${name}' collides with an existing id.`);
    }
    compileTool(name, on, on, tool, []);
    toolNodes[name] = on; // a root tool lives on each page it is offered on
  }

  function compileTool(
    qualifiedId: string,
    _nodePaths: string[],
    onPages: string[],
    tool: ToolDef,
    guardChain: WhereFilter[],
  ): void {
    if (qualifiedId === 'leave-skill' || qualifiedId.endsWith('.leave-skill')) {
      throw new SkillGraphValidationError(
        `tool name 'leave-skill' is reserved — it is the synthetic escape tool served while a skill frame is open.`,
      );
    }
    if (!tool.does || !tool.does.trim()) {
      throw new SkillGraphValidationError(
        `tool '${qualifiedId}' needs a 'does' — it is the one authored string both the consumer and the LLM read.`,
      );
    }
    if (tool.when) {
      rejectEmptyWhen(`tool '${qualifiedId}'`, tool.when);
      validateGuardShape(`tool '${qualifiedId}' when`, tool.when as Record<string, unknown>);
    }
    if (tool.goTo && !Object.hasOwn(def.pages, tool.goTo)) {
      throw new SkillGraphValidationError(
        `tool '${qualifiedId}' goTo unknown page '${tool.goTo}'. Known pages: ${Object.keys(def.pages).join(', ')}.`,
      );
    }
    if (tool.input !== undefined && detectSchema(tool.input) === 'none') {
      throw new SkillGraphValidationError(
        `tool '${qualifiedId}' has an unrecognized input schema — pass a Zod schema, a JSON Schema object, ` +
          `or a validator with .safeParse/.parse.`,
      );
    }
    const guard = composeGuards(qualifiedId, [...guardChain, ...(tool.when ? [tool.when] : [])]) as
      | WhereFilter
      | undefined;
    const effect =
      tool.writes || tool.goTo
        ? { ...(tool.writes ? { writes: [...tool.writes] } : {}), ...(tool.goTo ? { navigatesTo: tool.goTo } : {}) }
        : undefined;
    affordances[qualifiedId] = deepFreeze(
      {
        id: qualifiedId,
        on: [...onPages],
        description: tool.does,
        binding: tool.binding ? structuredClone(tool.binding) : undefined,
        guard,
        effect,
        schema: tool.input,
        highEffect: tool.confirm ?? false,
        role: deriveRole(tool),
        descriptionSource: 'declared',
      },
      new Set(['schema']), // the live validator stays by reference — ROOT level only
    ) as Affordance;
  }

  // -- skills (qualified paths, unambiguous-suffix resolution) ----------------
  const skills: Record<string, Skill> = Object.create(null) as Record<string, Skill>;
  for (const [skillId, skillDef] of Object.entries(def.skills ?? {})) {
    // Skill ids feed MCP tool names — same character rules as path segments,
    // or two distinct skills could sanitize to ONE colliding tool name.
    checkSegment(`skill '${skillId}'`, skillId);
    if (!skillDef.does || !skillDef.does.trim()) {
      throw new SkillGraphValidationError(`skill '${skillId}' needs a 'does' (planner-facing text).`);
    }
    if (!skillDef.steps || skillDef.steps.length === 0) {
      throw new SkillGraphValidationError(`skill '${skillId}' needs at least one step.`);
    }
    if (skillDef.when) {
      rejectEmptyWhen(`skill '${skillId}'`, skillDef.when);
      validateGuardShape(`skill '${skillId}' when`, skillDef.when as Record<string, unknown>);
    }
    const steps = skillDef.steps.map((step) => resolveStep(skillId, step));
    skills[skillId] = deepFreeze({
      id: skillId,
      description: skillDef.does,
      steps,
      precondition: skillDef.when ? structuredClone(skillDef.when) : undefined,
    }) as Skill;
  }

  function resolveStep(skillId: string, step: string): string {
    if (Object.hasOwn(affordances, step)) return step;
    const suffix = `.${step}`;
    const candidates = Object.keys(affordances).filter((qid) => qid.endsWith(suffix));
    if (candidates.length === 1) return candidates[0];
    if (candidates.length === 0) {
      throw new SkillGraphValidationError(
        `skill '${skillId}' step '${step}' matches no tool. Known: ${Object.keys(affordances).join(', ')}.`,
      );
    }
    throw new SkillGraphValidationError(
      `skill '${skillId}' step '${step}' is ambiguous — qualify it: ${candidates.join(' | ')}.`,
    );
  }

  // -- freeze + assemble -------------------------------------------------------
  for (const page of Object.values(pages)) Object.freeze(page);
  for (const node of Object.values(nodes)) deepFreeze(node, new Set(['instances']));
  for (const paths of Object.values(toolNodes)) Object.freeze(paths);
  const spec: SkillGraphSpec = Object.freeze({
    id,
    description: def.does,
    pages: Object.freeze(pages),
    affordances: Object.freeze(affordances),
    skills: Object.freeze(skills),
  });
  const map: AppMap = {
    id,
    spec,
    nodes: Object.freeze(nodes),
    toolNodes: Object.freeze(toolNodes),
    createSession: (opts?: NavSessionOptions) => new NavSession(map, opts),
  };
  return Object.freeze(map);
}

function deriveRole(tool: ToolDef): CanonicalRole {
  if (tool.role) return tool.role;
  if (tool.goTo) return 'next';
  return 'action';
}

function checkSegment(owner: string, name: string): void {
  if (!name || !name.trim()) throw new SkillGraphValidationError(`${owner}: empty name.`);
  if (BAD_SEGMENT.test(name)) {
    throw new SkillGraphValidationError(
      `${owner}: '${name}' contains a reserved character (. [ ] # / |) — names become path identities.`,
    );
  }
}

function rejectEmptyWhen(owner: string, when: WhereFilter): void {
  if (Object.keys(when).length === 0) {
    throw new SkillGraphValidationError(
      `${owner} has an empty when {} — footprint's evaluator deliberately NEVER matches an empty ` +
        `filter (anti-vacuous-truth). Omit 'when' entirely instead.`,
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

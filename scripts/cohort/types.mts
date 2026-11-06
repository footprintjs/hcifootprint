import { buildNavigationGraph, connectAction, createActionRuntime, defineAction } from 'hcifootprint';
import type { ActionRuntime, WhereFilter } from 'hcifootprint';
import { mcpServer } from 'hcifootprint/mcp';
import type { McpServerOptions } from 'hcifootprint/mcp';
import { registerWebMcpTools } from 'hcifootprint/webmcp';
import type { WebMcpContext } from 'hcifootprint/webmcp';
import { ControlSurfaceProvider } from 'hcifootprint/react';
import type { ControlSurfaceProviderProps } from 'hcifootprint/react';
import { watchPage } from 'hcifootprint/sensor';
import type { WatchOptions } from 'hcifootprint/sensor';
import { testApp } from 'hcifootprint/testing';
import type { TestAppOptions } from 'hcifootprint/testing';
import { lintGraph } from 'hcifootprint/testing/lint';
import type { LintFinding } from 'hcifootprint/testing/lint';
import type { CommitBundle } from 'foottrace';
import { RecordFrame, EventLog, SharedMemory } from 'foottrace/write';
import { evaluateFilter, normalizeSchema } from 'footprintjs/advanced';

const guard: WhereFilter<{ enabled: boolean }> = { enabled: { eq: true } };
const graph = buildNavigationGraph('typed-cohort', { pages: { home: { actions: {
  save: { does: 'Save', when: guard, writes: ['saved'] },
} } } });
const session = graph.createSession({ node: 'home', state: { enabled: true, saved: false } });
const records: CommitBundle[] = session.commitLog();
const runtime: ActionRuntime = createActionRuntime();
const action = defineAction('typed.capture', { does: 'Capture', invocation: 'scalar', mutate: (value: string) => value });
const connection = connectAction(runtime, action, { node: 'home' });
const pending = connection.invoke('typed-input');
const mcpOptions: McpServerOptions = { settleWithinMs: 0 };
const provider: ControlSurfaceProviderProps = { watch: null };
const harnessOptions = { session } satisfies TestAppOptions;
const findings: LintFinding[] = lintGraph(graph);
const browser: WebMcpContext = { registerTool: (_tool, _options) => undefined };
const sensor = (options: WatchOptions) => watchPage(session, options);

void [records, pending, mcpServer(session, mcpOptions), ControlSurfaceProvider, provider,
  testApp(harnessOptions), findings, registerWebMcpTools, browser, sensor,
  RecordFrame, EventLog, SharedMemory, evaluateFilter, normalizeSchema];

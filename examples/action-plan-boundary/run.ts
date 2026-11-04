import {
  beginWalk, connectAction, createActionRuntime, defineAction,
  type ActionProgressSnapshot, type ActionTransitionSnapshot,
} from 'hcifootprint';

/** Executable local example: one known plan, local progress, one agent reply. */
export async function runPlanBoundaryExample(channels: {
  localProgress(actionId: string, progress: ActionProgressSnapshot): void;
  agentReply(result: { completed: boolean; transitions: readonly ActionTransitionSnapshot[] }): void;
}) {
  const runtime = createActionRuntime();
  const store = new Map<string, string>();
  const effects: Promise<unknown>[] = [];
  const action = (id: string) => defineAction(id, {
    does: `Save the declared ${id} value`, invocation: 'scalar',
    inputSchema: { safeParse: (value: unknown) => typeof value === 'string'
      ? { success: true, data: value }
      : { success: false, error: { issues: [{ message: 'Supply a string.' }] } } },
    settle: {
      progress: { stages: ['started', 'stored'] },
      evidence: { kind: 'example.memory-receipt' },
      onReturn: outcome => outcome.status === 'performed'
        ? { status: 'verified', evidence: outcome.produced }
        : { status: 'refused', reason: 'The memory store did not return a receipt.' },
    },
    mutate: async (value: string, lifecycle) => {
      lifecycle?.reportProgress('started');
      await Promise.resolve();
      store.set(id, value);
      lifecycle?.reportProgress('stored');
      return { id, value, source: 'example.memory-store' };
    },
  });
  const customer = action('customer'), quantity = action('quantity'), draft = action('draft');
  for (const definition of [customer, quantity, draft]) {
    connectAction(runtime, definition, {
      node: 'home', coverage: 'verifiable',
      onInvocation(invocation) {
        const unsubscribe = invocation.progress?.subscribe(progress => channels.localProgress(
          invocation.transition.binding.definition.definitionId, progress,
        ));
        effects.push(invocation.whenEffectSettled.then(() => unsubscribe?.()));
      },
    });
  }
  // All three actions/inputs are known on this surface. No page guesses and no
  // model call per stage. The real walk still validates each live admission.
  const walk = beginWalk(runtime, 'agent');
  const manifest = await walk.run([
    { action: customer, input: 'Maya Chen' },
    { action: quantity, input: '3' },
    { action: draft, input: 'Autumn restock' },
  ]);
  // This example's declared store supplies terminal evidence for every action.
  // A general host must choose an invocation/effect/pending boundary explicitly.
  await Promise.all(effects);
  const result = { completed: manifest.completed, transitions: runtime.transitions() };
  channels.agentReply(result);
  return { store, result, record: walk.record() };
}

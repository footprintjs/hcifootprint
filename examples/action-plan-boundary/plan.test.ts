import { expect, it } from 'vitest';
import { runPlanBoundaryExample } from './run.js';

it('real HCI plan emits local stage updates but sends only one agent reply after evidence settles', async () => {
  const events: { channel: string; id?: string; disposition?: string }[] = [];
  const result = await runPlanBoundaryExample({
    localProgress: (id, progress) => events.push({ channel: 'local', id, disposition: progress.disposition }),
    agentReply: reply => {
      expect(reply.completed).toBe(true);
      expect(reply.transitions).toHaveLength(3);
      expect(reply.transitions.every(row => row.invocationStatus === 'performed' && row.effectStatus === 'verified')).toBe(true);
      events.push({ channel: 'agent' });
    },
  });
  expect([...result.store]).toEqual([['customer', 'Maya Chen'], ['quantity', '3'], ['draft', 'Autumn restock']]);
  expect(events.filter(e => e.channel === 'agent')).toEqual([{ channel: 'agent' }]);
  expect(events.at(-1)).toEqual({ channel: 'agent' });
  for (const id of ['customer','quantity','draft']) {
    const local = events.filter(e => e.channel === 'local' && e.id === id);
    expect(local.some(e => e.disposition === 'open')).toBe(true);
    expect(local.at(-1)?.disposition).toBe('closed');
  }
  expect(result.record.manifests).toHaveLength(1);
  expect(result.record.manifests[0]!.rows).toHaveLength(3);
});

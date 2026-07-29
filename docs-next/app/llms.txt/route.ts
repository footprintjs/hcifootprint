import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';

// The llms.txt INDEX: a machine-readable map of the docs for AI agents to discover.
// (The repo-root llms.txt — the hand-curated "read INSTEAD of the source" page —
// remains the agent front door; this route is the generated site map.)
export const revalidate = false;

export function GET() {
  return new Response(llms(source).index(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

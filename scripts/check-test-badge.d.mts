/**
 * Hand-written declarations for scripts/check-test-badge.mjs so the repo test
 * suite can import `checkTestBadge`. Keep in lockstep with the .mjs.
 */
export interface TestTally {
  numTotalTests: number;
  testResults: unknown[];
}

export type BadgeVerdict =
  | { verdict: 'ok'; badge: number; ran: number }
  | { verdict: 'drift'; badge: number; spoken: number; ran: number }
  | { verdict: 'partial'; files: number; testFileCount: number }
  | { verdict: 'absent' }
  | { verdict: 'unreadable' };

export declare function checkTestBadge(opts: {
  readme: string;
  tally?: TestTally;
  testFileCount: number;
}): BadgeVerdict;

export declare function countTestFiles(root?: string, roots?: string[]): number;

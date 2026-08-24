import type { BindingCoverage } from './types.js';

const COVERAGE = new Set<BindingCoverage>([
  'identity',
  'semantic',
  'executable',
  'verifiable',
]);

/** Whether an untrusted runtime value is one of the four closed coverage levels. */
export function isBindingCoverage(value: unknown): value is BindingCoverage {
  return typeof value === 'string' && COVERAGE.has(value as BindingCoverage);
}

/** Fail closed at a public binding ingress instead of ranking an unknown value. */
export function assertBindingCoverage(
  value: unknown,
  door = 'action binding',
): asserts value is BindingCoverage {
  if (isBindingCoverage(value)) return;
  throw new TypeError(
    `hcifootprint: ${door} has invalid coverage '${String(value)}'; expected identity, semantic, executable, or verifiable.`,
  );
}

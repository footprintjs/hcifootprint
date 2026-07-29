/**
 * Yield the task so a fire's deferred work lands.
 *
 * `fire()` returns before the app's handler runs — deliberately: the handler is
 * invoked on a later microtask so a synchronous caller can never mistake
 * "queued" for "done". Anything that wants to look at the SETTLED world (the
 * agent bridge before it builds a tool result, a test before it asserts) has to
 * let the task finish first. One macrotask covers the whole chain: handler →
 * store notify → state tap → settlement, and the router hop in between.
 */
export function settle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

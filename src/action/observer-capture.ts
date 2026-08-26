/**
 * observer-capture — snapshot a dynamic observer generation before
 * application behavior begins, without changing the public callback.
 * @internal
 */

export const INVOCATION_OBSERVER_CAPTURE = Symbol(
  'hcifootprint.invocation-observer-capture',
);

/**
 * Internal adapter protocol for snapshotting a dynamic observer generation
 * before application behavior begins, without changing the public callback.
 * @internal
 */
export function withObserverCapture<
  Observer extends (...args: any[]) => unknown,
>(observer: Observer, capture: () => Observer | undefined): Observer {
  Object.defineProperty(observer, INVOCATION_OBSERVER_CAPTURE, {
    configurable: false,
    enumerable: false,
    value: capture,
    writable: false,
  });
  return observer;
}


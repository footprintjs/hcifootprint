/**
 * MUST NOT COMPILE, under the library's own `lib: ["ES2022"]`.
 *
 * This file is the SSR guarantee's mutation proof. The claim is that a module in
 * src/ cannot reach a browser global by accident — not because the team is careful,
 * but because `tsconfig.json`'s `lib` declares no such name and the build fails.
 * Every line below is expected to be `error TS2304: Cannot find name …`.
 *
 * If this file ever compiles, the `lib` widened and the guarantee is gone.
 */
export function reachesForTheDocument(): unknown {
  return document.getElementById('anything');
}

export function reachesForTheWindow(): unknown {
  return window.location.pathname;
}

export function reachesForStorage(): unknown {
  return localStorage.getItem('anything');
}

export function reachesForTheNavigator(): unknown {
  return navigator.userAgent;
}

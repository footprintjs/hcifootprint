Compiler probes, run by `test/sensor-dom-port.test.ts` — never by vitest.

Two claims that only a compiler can make, and that no runtime fake could:

- `real-dom.ts` compiles under `lib: ["ES2022", "DOM"]` and ASSIGNS a real
  `HTMLElement`, `Document`, `ShadowRoot` and `Window` to the sensor's port. If the
  port ever drifts from the DOM, this stops compiling.
- `reaches-for-a-global.ts` compiles under the library's own `lib: ["ES2022"]` and
  MUST FAIL with TS2304. That is the SSR guarantee: it is enforced by the compiler,
  not by a convention somebody has to remember.

`tsconfig.test.json` excludes this directory, because half of it is supposed not to
compile.

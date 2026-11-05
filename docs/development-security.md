# Documentation toolchain security

TypeDoc 0.28.20 currently depends on minimatch 10, which is affected by
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
The official patched version is minimatch 11.0.1. TypeDoc has no published
compatible upgrade yet, so this repository pins TypeDoc and scopes an npm
override to that exact development dependency.

A dependency override alone is insufficient: minimatch 11 removed `matchOne`,
which TypeDoc uses for partial directory traversal. The tracked
[`typedoc+0.28.20.patch`](../patches/typedoc+0.28.20.patch) adapts TypeDoc's
`src/lib/utils/fs.ts` traversal as shipped in `dist/node-utils.js` to the public
`Minimatch.match(path, true)` API. A separate matcher uses `flipNegate: true`
for traversal because the original row-level check ignored pattern negation;
the final file match continues to honor negation. TypeDoc source is licensed
under Apache-2.0; minimatch under BlueOak-1.0.0. This compatibility change is
repository-maintained, rather than an upstream TypeDoc release.

The documentation generator visibly applies the patch with `patch-package
--error-on-fail` before deleting or generating pages. `npm run
docs:toolchain:check` applies it and tests actual filesystem traversal with
literal, globstar, brace, extglob, negated, hidden and node_modules paths.
The same check runs in the documentation CI job. Patch failure stops the build.
There is no new install or postinstall hook and no consumer runtime patching.
The native library source and compiled output are unchanged.

Remove this override, exact TypeDoc pin, compatibility patch and patch tool
when an upstream TypeDoc release supports the patched matcher; verify the same
traversal checks and generated API reference before removing them. No advisory
is suppressed, no forced dependency resolution is used, and no timers or retries
are introduced.

Primary references:

- [TypeDoc 0.28.20 dependency manifest](https://github.com/TypeStrong/typedoc/blob/v0.28.20/package.json)
- [TypeDoc filesystem traversal](https://github.com/TypeStrong/typedoc/blob/v0.28.20/src/lib/utils/fs.ts)
- [minimatch 11.0.1 source](https://github.com/isaacs/minimatch/blob/v11.0.1/src/index.ts)
- [npm scoped overrides](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides)

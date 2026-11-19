# Normal pack fidelity and CI wiring

This folder keeps the normal-path import closure of the former candidate
component. The complete candidate route is preserved, unmerged, on
[`archive/rc-native-input`](https://github.com/footprintjs/hcifootprint/tree/archive/rc-native-input)
at `e07b5e7fbb0be9ac41b02d90d9a446eb26d08824`; its full reasoning and original
fault fixtures are available there instead of being added to the release.

| File | Active caller and imports |
| --- | --- |
| `pack.py` | Both `cohort.yml` installed-cohort jobs call `inspect_hci_pack`; imports Python standard library only. |
| `pack_test.py` | `ci.yml` discovers its effect-free gzip/tar/filesystem tests; imports standard library and `native_input.pack`. |
| `workflow.test.mjs` | `npm run test:cohort` runs the parsed-YAML CI guards; imports `node:assert/strict`, `node:fs`, `node:test` and declared `yaml`. |

The inspector reads the actual single npm pack report and tarball against the
authored manifest, README, LICENSE and every built dist member. It rejects
changed or missing members, links, unsafe paths, malformed metadata and bounded
archive violations. It does not extract or execute a package, fetch a producer,
rewrite source, infer registry readiness or supply Browser-study evidence.

The workflow guards retain exact source/install bindings, strict whole-run
badge and coverage commands, local package tools, fail-closed platform results
and source-to-pack input bindings. Fixtures for code with no normal caller are
kept with the archived route; no snapshot adapter is introduced here.

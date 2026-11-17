# Native source cohort component

The owner is the adjacent `../native_input.mjs` facade. It has only the fixed
native execution and pin-check doors; caller roots, commands, callbacks and
module selectors are refused. Before the strict install its fixed Python
bootstrap imports only standard-library code. This is nonpublishing CI tooling,
not a new package export or general-purpose orchestrator.

| Module | One job |
| --- | --- |
| `artifact.py` | Validate the bounded original AF ZIP/TGZ/manifest/member data. |
| `transport.py` | Read the exact qualified producer with the existing workflow token; preserve the named hold and refuse every other failure. |
| `config.py` | Refuse unknown/provisional input fields before transport or setup. |
| `source_guard.py` | Protect authored/proof/input/build/tool bytes and restore raw originals/absences. |
| `owned_files.py` | Use admitted directory descriptors for recovery and proof I/O; never follow replacement links. |
| `tool_patch.py` | Derive the entire permitted tool leaf from original bytes and the authored patch. |
| `installed.py` | Join installed members and retain the independent consumer/compiler/specimen graph. |
| `pack.py` | Join the actual HCI pack/report/public manifest to every built member. |
| `pins.mjs` | Check original authored ranges against real temporary requests/locks without changing ordinary policy. |
| `runner.py` | Wire the one fixed recipe, preserve original and restoration failures separately, retain actual results. |
| `gates.py` | Require the complete ordered gate census before a passing native verdict. |

Inputs come only from the reviewed `../native-input.json` row and fixed source
paths. Artifact data does not choose executable code or policy. The workflow
token is removed before any dependency script/test runs; an authenticated API
redirect never forwards its Authorization header to the signed asset host.
No `.env`/provider keys, model calls, polling timers or automatic retries exist.

The three install owners are root+both demos, separately linked docs, and the
fresh packed consumer. Physical checks cover hidden/aliased/linked core images,
including inactive contexts; source images/builds/compilers and original
consumer specimens remain guarded across commands. Both demo AF realpaths
must match the one admitted image. Every installed AF/HCI member is joined to
the original archive; matching version strings alone are insufficient.

The two authored locks are captured byte-for-byte, then removed only from the
isolated setup before npm generates fresh strict native locks. Reusing a stale
registry lock can retain an incompatible old hoisted package even after the
two demo requests change. No lock entries are rewritten by hand; actual generated
bytes are retained, and restoration reinstates both original locks exactly.
The root npm request names the qualified exact core releases, keeping the
authored caret ranges unchanged. It does not select workspace-wide package saves;
the ordinary root install still links and locks both declared workspaces. Source
guards reject any manifest rewrite, and native pins require the exact core URL/SRI.

The native result explicitly leaves ordinary registry readiness and final
producer whole-CI readiness false. Only the qualified producer's named
documentation bootstrap job may be held; all HCI gates still run. Restore
failures prevent success and do not overwrite the original command failure.
Interruptions remain unknown. Owned installed images may remain on the
ephemeral CI runner and are never described as restored-to-absent.

Focused Node/Python fixtures and mutations are guard tests. Real hosted installs,
library/demo/docs checks and public packed-consumer types/runtime are separate
required evidence. Local installs/full suites are not authorized by this entry.

## Original AF artifact data

`artifact.inspect_candidate(zip_bytes, expected)` is a Python stdlib, effect-free
validator for the closed original `agentfootprint` source-candidate ZIP role.
It neither downloads, extracts to disk nor executes any package. It returns
`facts`, unchanged `tarball` bytes, parsed original `source_manifest`, and the
validated ordered `members` for the caller's installed-file joins. The member
table is not repeated in the small facts/stdout object.
`facts.nativeReady` is always false: producer phase, current source and workflow
token/transport admission belong to the caller, as do all HCI native gates.

The expected data keeps the accepted C tuple's `sourceProtocol`, `source`,
`tested`, `sourceArtifact` and `archive`. `runtimeRequirements` contains the
closed FT direct / FP peer / FP dev slots. Their values must equal the original
manifest; the lock root and packed manifest must retain the original semantics.
No manifest, version, range, archive or census is relabelled or repaired.

Bounds: outer ZIP 16 MiB; TGZ 32 MiB; candidate and lock JSON 8 MiB each;
source/packed manifest 1 MiB; total expanded ZIP at most 49 MiB; gzip-expanded
tar 128 MiB; 20,000 regular files. Gzip is bounded **before** tar parsing.
The original ZIP has exactly four files. Duplicate/unsafe names, links,
unlisted local bytes, encryption, extensions and noncanonical tar paths fail.
Tar data is hashed in memory, in original order; nothing is materialized.

Focused checks:
`PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=scripts/cohort python3 -m unittest native_input.artifact_test`

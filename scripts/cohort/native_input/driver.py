"""Private fixed bootstrap, reached only through the owning native facade."""
from pathlib import Path
import json
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from native_input.runner import preflight_native, run_native

if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] in ('view-test', 'view-docs', 'view-docs-links', 'view-installed-cohort'):
        from native_input.view_runner import run_view
        print(json.dumps(run_view(Path(__file__).resolve().parents[3], sys.argv[1][len('view-'):])))
        raise SystemExit(0)
    if len(sys.argv) == 2 and sys.argv[1] == 'preflight':
        _, source, expected = preflight_native(Path(__file__).resolve().parents[3])
        print(json.dumps({'status': 'metadata-qualified-only', 'source': source,
                          'registryTargetSha256': expected['registryTargetSha256'],
                          'qualifiedTupleSha256': expected['qualifiedTupleSha256'],
                          'compatibilityProved': False, 'ordinaryRegistryReady': False}))
        raise SystemExit(0)
    if len(sys.argv) != 1:
        raise ValueError('Native bootstrap accepts no caller selectors')
    raise SystemExit(run_native(Path(__file__).resolve().parents[3]))

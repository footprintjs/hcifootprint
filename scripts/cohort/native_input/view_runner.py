"""Bind one fixed proof view to this source checkout and this CI run only."""
import os
from pathlib import Path
import re
from .runner import preflight_native
from .proof_transport import fetch_proof
from .views import verify_view

VIEWS = ('test', 'docs', 'docs-links', 'installed-cohort')


def run_view(root, view):
    if view not in VIEWS:
        raise ValueError('Unknown fixed native proof view')
    _, source, expected = preflight_native(Path(root))
    if (os.environ.get('GITHUB_REPOSITORY') != 'footprintjs/hcifootprint'
            or os.environ.get('HCI_EXECUTORS_RESULT') != 'success'):
        raise ValueError('Both current native executors must succeed in the owning repository')
    run, attempt = (os.environ.get(name, '') for name in ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT'])
    if any(not re.fullmatch(r'[1-9][0-9]*', value) for value in [run, attempt]):
        raise ValueError('Exact current workflow run/attempt required')
    node = os.environ.get('HCI_VIEW_NODE')
    if node not in ('22', '24') or (view != 'installed-cohort' and node != '22'):
        raise ValueError('Fixed original proof-view Node role required')
    context = {'source': source, 'tested': {'head': source['head'], 'tree': source['tree']},
               'workflowRun': run, 'workflowAttempt': attempt,
               'executor': {'job': 'native-source', 'nodeMajor': node}}
    token = os.environ.pop('GH_TOKEN', '')
    try:
        bundle, provider = fetch_proof(context, token)
    finally:
        del token
    return {'protocol': 'hcifootprint.native-view-result.v1',
            'proof': verify_view(bundle, expected, context, view), 'provider': provider}

"""Private pure views over one pre-read, sealed native compatibility proof.

The caller admits the current workflow/artifact transport and supplies its exact
checkout context. This module performs no I/O and never grants registry readiness.
"""
import base64
import binascii
import hashlib
import json
import math
import re
from .gates import REQUIRED, require_gates
from .command_contract import verify_command_contract


MAX_FILE = 16 * 1024 * 1024
MAX_TOTAL = 64 * 1024 * 1024
VIEWS = ('test', 'docs', 'docs-links', 'installed-cohort')
ORIGINALS = ('package.json', 'package-lock.json', 'demos/live-desk/package.json',
             'demos/onboarding-wizard/package.json', 'docs-next/package.json',
             'docs-next/package-lock.json')
RESULT_FIELDS = ('protocol', 'status', 'primaryError', 'restorationError',
                 'diagnosticErrors', 'node', 'npm', 'python', 'source', 'tested',
                 'workflowRun', 'workflowAttempt', 'executor', 'input', 'commands',
                 'ordinaryRegistryReady', 'producerWholeCIReady')


def _require(condition, message):
    if not condition:
        raise ValueError(message)


def _closed(value, keys, label):
    _require(type(value) is dict and set(value) == set(keys), label + ' fields differ')


def _hex(value, length, label):
    _require(type(value) is str and re.fullmatch(r'[0-9a-f]{' + str(length) + '}', value),
             'Exact ' + label + ' required')


def _unique(pairs):
    result = {}
    for key, value in pairs:
        _require(key not in result, 'Duplicate proof JSON key')
        result[key] = value
    return result


def _constant(_value):
    raise ValueError('Non-JSON proof constant')


def _parse(raw):
    try:
        value = json.loads(raw.decode('utf-8'), object_pairs_hook=_unique,
                           parse_constant=_constant)
        _json_value(value)
        return value
    except (UnicodeError, ValueError, RecursionError) as error:
        raise ValueError('Invalid strict proof JSON: ' + str(error)) from error


def _json_value(value):
    if type(value) is dict:
        _require(all(type(key) is str for key in value), 'String JSON keys required')
        for item in value.values():
            _json_value(item)
    elif type(value) is list:
        for item in value:
            _json_value(item)
    elif type(value) is float:
        _require(math.isfinite(value), 'Finite JSON number required')
    else:
        _require(value is None or type(value) in (str, bool, int), 'JSON value required')


def _canonical(value):
    try:
        _json_value(value)
        return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False)
    except (TypeError, ValueError, RecursionError) as error:
        raise ValueError('Invalid expected JSON value') from error


def _same(actual, expected, label):
    # Python's ordinary equality treats True and 1 as equal; proof identities do not.
    _require(_canonical(actual) == _canonical(expected), label + ' differs')


def _context(value):
    _closed(value, ('source', 'tested', 'workflowRun', 'workflowAttempt', 'executor'), 'Context')
    _closed(value['source'], ('repository', 'head', 'base', 'tree'), 'Source context')
    _require(value['source']['repository'] == 'footprintjs/hcifootprint', 'Wrong source repository')
    for key in ('head', 'base', 'tree'):
        _hex(value['source'][key], 40, 'source ' + key)
    _closed(value['tested'], ('head', 'tree'), 'Tested context')
    for key in ('head', 'tree'):
        _hex(value['tested'][key], 40, 'tested ' + key)
    for key in ('workflowRun', 'workflowAttempt'):
        _require(type(value[key]) is str and re.fullmatch(r'[1-9][0-9]*', value[key]),
                 'Positive string workflow identity required')
    _closed(value['executor'], ('job', 'nodeMajor'), 'Executor context')
    _require(value['executor']['job'] == 'native-source'
             and value['executor']['nodeMajor'] in ('22', '24'), 'Wrong native executor')


def _sealed(bundle):
    _require(type(bundle) is dict, 'Pre-read proof bundle required')
    total = 0
    for name, raw in bundle.items():
        _require(type(name) is str and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,254}', name),
                 'Safe flat proof filename required')
        _require(type(raw) is bytes, 'Raw proof bytes required')
        total += len(raw)
        _require(len(raw) <= MAX_FILE and total <= MAX_TOTAL, 'Proof byte bound exceeded')
    _require('proof-seal.json' in bundle, 'Final proof seal required')
    seal = _parse(bundle['proof-seal.json'])
    _closed(seal, ('protocol', 'files'), 'Proof seal')
    _require(seal['protocol'] == 'hcifootprint.native-proof.v1', 'Wrong proof seal protocol')
    files = seal['files']
    _require(type(files) is dict and set(files) == set(bundle) - {'proof-seal.json'},
             'Proof seal must bind every other file exactly once')
    for name, expected in files.items():
        _hex(expected, 64, 'proof file SHA256')
        _require(hashlib.sha256(bundle[name]).hexdigest() == expected, 'Proof file hash differs: ' + name)
    return {name: _parse(raw) for name, raw in bundle.items() if name.lower().endswith('.json')}


def _guard(value):
    _closed(value, ('sourceInventorySha256', 'matchesExpected'), 'Source guard')
    _require(value['matchesExpected'] is True, 'Native source guard did not pass')
    _hex(value['sourceInventorySha256'], 64, 'guard inventory SHA256')


def _restoration(proofs):
    baseline = proofs.get('source-baseline.json')
    after = proofs.get('source-after-restoration.json')
    _require(type(baseline) is dict and type(after) is dict, 'Actual restoration inventories required')
    _same(after, baseline, 'Restored source inventory')
    restored = proofs.get('restoration.json')
    _closed(restored, ('authoredAndAbsencesRestored', 'installedImagesRetained'), 'Restoration')
    _require(restored['authoredAndAbsencesRestored'] is True, 'Authored bytes/absences were not restored')
    _require(type(restored['installedImagesRetained']) is list
             and all(type(name) is str for name in restored['installedImagesRetained']),
             'Explicit retained-image census required')
    originals = proofs.get('source-originals.json')
    _closed(originals, ORIGINALS, 'Original authored roles')
    for name in ORIGINALS:
        original = originals[name]
        _closed(original, ('base64', 'mode'), 'Raw original ' + name)
        mode = original['mode']
        _require(type(mode) is int and 0 <= mode <= 0o7777, 'Exact original file mode required')
        _require(type(original['base64']) is str, 'Raw base64 original required')
        try:
            raw = base64.b64decode(original['base64'], validate=True)
        except (ValueError, binascii.Error) as error:
            raise ValueError('Invalid raw original base64') from error
        _require(base64.b64encode(raw).decode('ascii') == original['base64'], 'Canonical original base64 required')
        _same(baseline.get(name), {'kind': 'file', 'bytes': len(raw),
              'sha256': hashlib.sha256(raw).hexdigest(), 'mode': mode}, 'Raw original/baseline join ' + name)


def verify_view(bundle: dict[str, bytes], expected_input: dict, context: dict, view: str) -> dict:
    """Verify the entire native proof before returning one fixed compatibility view."""
    _require(type(view) is str and view in VIEWS, 'Unknown fixed native view')
    _context(context)
    _require(type(expected_input) is dict, 'Exact qualified input required')
    _require(expected_input.get('protocol') == 'hcifootprint.native-input.v2'
             and expected_input.get('status') == 'NATIVE_SOURCE_READY', 'Qualified ready input required')
    for key in ('registryTargetSha256', 'qualifiedTupleSha256', 'independentReviewSha256'):
        _hex(expected_input.get(key), 64, key)
    proofs = _sealed(bundle)
    result = proofs.get('native-result.json')
    _closed(result, RESULT_FIELDS, 'Native result')
    _require(result['protocol'] == 'hcifootprint.native-result.v2'
             and result['status'] == 'passed', 'Passed native result v2 required')
    _require(result['primaryError'] is None and result['restorationError'] is None
             and type(result['diagnosticErrors']) is dict and not result['diagnosticErrors'],
             'Native result contains errors')
    _require(result['ordinaryRegistryReady'] is False and result['producerWholeCIReady'] is False,
             'Native proof cannot grant ordinary registry or whole-producer readiness')
    for key in ('source', 'tested', 'workflowRun', 'workflowAttempt', 'executor'):
        _same(result[key], context[key], 'Current workflow ' + key)
    _same(result['input'], expected_input, 'Exact admitted input')
    major = context['executor']['nodeMajor']
    _require(type(result['node']) is str
             and re.fullmatch(r'v' + major + r'\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', result['node']),
             'Actual executor Node version differs')
    _require(result['npm'] == '11.19.1', 'Actual native package manager differs')
    _require(type(result['python']) is str and bool(result['python']), 'Actual Python diagnostic required')
    rows = result['commands']
    _require(type(rows) is list, 'Complete command census required')
    for row in rows:
        _closed(row, ('label', 'argv', 'cwd', 'exit', 'expectedExit', 'afterGuardError'), 'Command result')
        _require(type(row['argv']) is list and bool(row['argv'])
                 and all(type(arg) is str and '\x00' not in arg for arg in row['argv']), 'Actual command argv required')
        _require(type(row['cwd']) is str and row['cwd'].startswith('/') and '\x00' not in row['cwd'],
                 'Actual command working directory required')
    require_gates(rows)
    verify_command_contract(rows, expected_input, proofs.get('hci-pack.json'))
    for row in rows:
        name = row['label']
        _same(proofs.get(name + '-result.json'), row, 'Per-command result ' + name)
        _require(name + '.log' in bundle, 'Raw command log required: ' + name)
        for phase in ('before', 'after'):
            _guard(proofs.get(name + '-' + phase + '-guard.json'))
    _guard(proofs.get('all-native-gates-complete-guard.json'))
    for name, value in proofs.items():
        if name.lower().endswith('guard.json'):
            _guard(value)
    _restoration(proofs)
    # JSON cloning makes the summary independent of caller-owned mutable objects.
    summary = json.loads(_canonical(context))
    summary.update({'protocol': 'hcifootprint.native-view.v1', 'kind': 'native-source-compatibility',
                    'view': view, 'status': 'passed', 'gateCount': len(REQUIRED),
                    'node': result['node'], 'npm': result['npm'],
                    'registryTargetSha256': expected_input['registryTargetSha256'],
                    'qualifiedTupleSha256': expected_input['qualifiedTupleSha256'],
                    'independentReviewSha256': expected_input['independentReviewSha256'],
                    'ordinaryRegistryReady': False, 'producerWholeCIReady': False,
                    'proofSealSha256': hashlib.sha256(bundle['proof-seal.json']).hexdigest()})
    return summary

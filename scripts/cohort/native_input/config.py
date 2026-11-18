"""Read the one reviewed native input row; no caller selectors or extension bag."""
import json
import math
import re
from .artifact import _expected
from .owned_files import OwnedFiles

FIELDS = {'status', 'repository', 'repositoryId', 'source', 'tested', 'sourceProtocol',
          'run', 'sourceJob', 'sourceArtifact', 'archive', 'protocol',
          'qualifiedTupleSha256', 'independentReviewSha256', 'runtimeRequirements',
          'heldProducerJob', 'coreVersions', 'coreArtifacts', 'registryTargetSha256'}
NUMBER = r'(0|[1-9][0-9]*)'
PLAIN = NUMBER + r'\.' + NUMBER + r'\.' + NUMBER


def _core_versions(value):
    _closed(value, ['footprintjs', 'foottrace'])
    for name, version in value.items():
        pattern = PLAIN + (r'(?:-rc\.' + NUMBER + r')?' if name == 'footprintjs' else '')
        if type(version) is not str or not re.fullmatch(pattern, version):
            raise ValueError('Qualified core must name an exact release or published engine RC')


def _unique(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError('Duplicate native input key')
        value[key] = item
    return value


def _closed(value, keys):
    if type(value) is not dict or set(value) != set(keys):
        raise ValueError('Native input fields differ')


def _positive(value):
    if type(value) is not int or not 0 < value < 2 ** 53:
        raise ValueError('Native provider identity must be a positive exact integer')


def _invalid_constant(_name):
    raise ValueError('Non-JSON native input')


def _finite_float(raw):
    value = float(raw)
    if not math.isfinite(value):
        raise ValueError('Non-JSON native input number')
    return value


def read_authored_target(root):
    """Read the fixed authored target roles without following replacement links."""
    files = OwnedFiles(root)
    values = {}
    for name in ['package.json', 'demos/live-desk/package.json', 'demos/onboarding-wizard/package.json']:
        path = root / name
        files.register(path)
        values[name] = json.loads(files.read(path), object_pairs_hook=_unique,
                                  parse_constant=_invalid_constant, parse_float=_finite_float)
    return values['package.json'], {name: values[name + '/package.json']
                                  for name in ['demos/live-desk', 'demos/onboarding-wizard']}


def load_input(path):
    raw = path.read_bytes()
    if len(raw) > 64 * 1024:
        raise ValueError('Native input row exceeds its fixed bound')
    value = json.loads(raw, object_pairs_hook=_unique, parse_constant=_invalid_constant, parse_float=_finite_float)
    if type(value) is not dict or value.get('protocol') != 'hcifootprint.native-input.v2':
        raise ValueError('Current native input protocol required; historical readiness does not carry')
    if value.get('status') == 'AWAITING_QUALIFIED_AF':
        _closed(value, ['protocol', 'status', 'registryTargetSha256', 'coreVersions'])
        _core_versions(value['coreVersions'])
        if not re.fullmatch(r'[0-9a-f]{64}', str(value['registryTargetSha256'])):
            raise ValueError('Published registry target binding required')
        raise ValueError('Awaiting new qualified AF original for the published core target')
    _closed(value, FIELDS)
    if value['status'] != 'NATIVE_SOURCE_READY':
        raise ValueError('Concrete qualified native source input required')
    if value['repository'] != 'footprintjs/agentfootprint':
        raise ValueError('Unknown native producer role')
    _positive(value['repositoryId'])
    for name in ['qualifiedTupleSha256', 'independentReviewSha256', 'registryTargetSha256']:
        if type(value[name]) is not str or not re.fullmatch(r'[0-9a-f]{64}', value[name]):
            raise ValueError('Missing native qualification binding')
    _closed(value['run'], ['id', 'run_attempt', 'workflow_id', 'name', 'event', 'head_branch', 'status', 'conclusion'])
    for name in ['id', 'run_attempt', 'workflow_id']:
        _positive(value['run'][name])
    if value['run']['status'] != 'completed' or value['run']['conclusion'] not in ['success', 'failure']:
        raise ValueError('Native producer must be terminal and qualified')
    _closed(value['sourceJob'], ['id', 'name', 'status', 'conclusion', 'actualSourceArtifactIdPresentInCanonicalLog'])
    _positive(value['sourceJob']['id'])
    if (value['sourceJob']['status'] != 'completed' or value['sourceJob']['conclusion'] != 'success'
            or value['sourceJob']['actualSourceArtifactIdPresentInCanonicalLog'] is not True):
        raise ValueError('Original successful producer source job required')
    _closed(value['sourceArtifact'], ['id', 'name', 'size_in_bytes', 'digest', 'expired'])
    _positive(value['sourceArtifact']['id'])
    held = value['heldProducerJob']
    _closed(held, ['id', 'name', 'reason']); _positive(held['id'])
    if held['name'] != 'docs' or held['reason'] != 'AF-docs/Lens dependency bootstrap cycle':
        raise ValueError('Only the named producer documentation cycle may be held')
    _core_versions(value['coreVersions'])
    _closed(value['coreArtifacts'], ['footprintjs', 'foottrace'])
    for name, version in value['coreVersions'].items():
        artifact = value['coreArtifacts'][name]
        _closed(artifact, ['version', 'resolved', 'integrity', 'sourceCommit'])
        if artifact['version'] != version or artifact['resolved'] != f'https://registry.npmjs.org/{name}/-/{name}-{version}.tgz':
            raise ValueError('Qualified core registry identity mismatch')
        if type(artifact['integrity']) is not str or not re.fullmatch(r'sha512-[A-Za-z0-9+/]+={0,2}', artifact['integrity']):
            raise ValueError('Qualified registry core SRI required')
        commit = artifact['sourceCommit']
        if (type(commit) is not str or (commit != 'unknown: registry metadata omits gitHead'
                                      and not re.fullmatch(r'[0-9a-f]{40}', commit))):
            raise ValueError('Qualified publication source identity required')
    return _expected(value)

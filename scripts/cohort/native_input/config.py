"""Read the one reviewed native input row; no caller selectors or extension bag."""
import json
import re
from .artifact import _expected

FIELDS = {'status', 'repository', 'repositoryId', 'source', 'tested', 'sourceProtocol',
          'run', 'sourceJob', 'sourceArtifact', 'archive', 'protocol',
          'qualifiedTupleSha256', 'independentReviewSha256', 'runtimeRequirements',
          'heldProducerJob', 'coreVersions', 'coreArtifacts'}


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


def load_input(path):
    raw = path.read_bytes()
    if len(raw) > 64 * 1024:
        raise ValueError('Native input row exceeds its fixed bound')
    value = json.loads(raw, object_pairs_hook=_unique, parse_constant=_invalid_constant)
    _closed(value, FIELDS)
    if value['protocol'] != 'hcifootprint.native-input.v1' or value['status'] != 'NATIVE_SOURCE_READY':
        raise ValueError('Concrete qualified native source input required')
    if value['repository'] != 'footprintjs/agentfootprint':
        raise ValueError('Unknown native producer role')
    _positive(value['repositoryId'])
    for name in ['qualifiedTupleSha256', 'independentReviewSha256']:
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
    _closed(value['coreVersions'], ['footprintjs', 'foottrace'])
    _closed(value['coreArtifacts'], ['footprintjs', 'foottrace'])
    for name, version in value['coreVersions'].items():
        if type(version) is not str or not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', version):
            raise ValueError('Qualified core must be an exact plain release')
        artifact = value['coreArtifacts'][name]
        _closed(artifact, ['version', 'resolved', 'integrity', 'sourceCommit'])
        if artifact['version'] != version or artifact['resolved'] != f'https://registry.npmjs.org/{name}/-/{name}-{version}.tgz':
            raise ValueError('Qualified core registry identity mismatch')
        if type(artifact['integrity']) is not str or not re.fullmatch(r'sha512-[A-Za-z0-9+/]+={0,2}', artifact['integrity']):
            raise ValueError('Qualified registry core SRI required')
        if artifact['sourceCommit'] != 'unknown: registry metadata omits gitHead':
            raise ValueError('No published source-commit identity is established')
    return _expected(value)

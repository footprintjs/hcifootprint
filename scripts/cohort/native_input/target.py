"""Validate fixed publication data and authored bindings; never grant activation.

The owning entry passes the dictionary/hash pair returned by the fixed file loader.
Publication observations are reviewed data, not a network or attestation verification
performed by this module. The AF tuple still needs its separate complete admission.
"""
import base64
import binascii
from datetime import datetime
import hashlib
import json
import re

CORES = ('footprintjs', 'foottrace')
DEMOS = ('demos/live-desk', 'demos/onboarding-wizard')
NUMBER = r'(?:0|[1-9][0-9]*)'
PLAIN = NUMBER + r'\.' + NUMBER + r'\.' + NUMBER
RC = PLAIN + r'-rc\.' + NUMBER
UNKNOWN_SOURCE = 'unknown: registry metadata omits gitHead'
CENSUS_ALGORITHM = ('Rows sorted by path; JSON compact ASCII, key order path,size,sha256,mode; '
                    'file adds one LF')


def _need(condition, message):
    if not condition:
        raise ValueError(message)


def _object(value, fields, label):
    _need(type(value) is dict and set(value) == set(fields), 'Registry target fields differ: ' + label)
    return value


def _text(value, label):
    _need(type(value) is str and 0 < len(value) <= 4096
          and all(ord(char) >= 32 and ord(char) != 127 for char in value),
          'Registry target text invalid: ' + label)


def _hash(value, length, label):
    _need(type(value) is str and re.fullmatch(r'[0-9a-f]{%d}' % length, value) is not None,
          'Registry target hash invalid: ' + label)


def _count(value, label, minimum=1):
    _need(type(value) is int and minimum <= value < 2 ** 53, 'Registry target number invalid: ' + label)


def _version(value, pattern, label):
    _need(type(value) is str and re.fullmatch(pattern, value) is not None,
          'Registry target version is not canonical: ' + label)


def _sri(value):
    _need(type(value) is str and value.startswith('sha512-'), 'Registry target SHA512 SRI required')
    encoded = value[len('sha512-'):]
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as error:
        raise ValueError('Registry target SRI is not canonical base64') from error
    _need(len(raw) == 64 and base64.b64encode(raw).decode('ascii') == encoded,
          'Registry target SRI is not a canonical SHA512 digest')


def _declaration(value, version, label):
    _need(type(value) is str and value in (version, '^' + version),
          'Declaration does not name the exact/caret qualified target: ' + label)


def _engine(value, versions, artifacts):
    engine = _object(value, ['repository', 'source', 'tag', 'release', 'run', 'versionStaging',
                             'registry', 'producer', 'archive'], 'publishedEngine')
    repository = 'footprintjs/footPrint'
    _need(engine['repository'] == repository, 'Unexpected published engine repository')
    source = _object(engine['source'], ['parents', 'sha', 'tree'], 'source')
    for name in ['sha', 'tree']: _hash(source[name], 40, 'source.' + name)
    _need(type(source['parents']) is list and 0 < len(source['parents']) <= 2,
          'Published source parents required')
    for parent in source['parents']: _hash(parent, 40, 'source.parent')
    _need(len(set(source['parents'])) == len(source['parents']) and source['sha'] not in source['parents'],
          'Published source parent identities differ')
    version = versions['footprintjs']
    tag = _object(engine['tag'], ['ref', 'sha', 'type'], 'tag')
    _need(tag == {'ref': 'refs/tags/v' + version, 'sha': source['sha'], 'type': 'commit'},
          'Published tag/source/version join differs')
    release = _object(engine['release'], ['draft', 'html_url', 'id', 'prerelease', 'published_at',
                                         'tag_name', 'target_commitish'], 'release')
    _count(release['id'], 'release.id')
    _need(release['draft'] is False and release['prerelease'] is True
          and release['tag_name'] == 'v' + version and release['target_commitish'] == source['sha']
          and release['html_url'] == 'https://github.com/' + repository + '/releases/tag/v' + version,
          'Published release/source/tag claim differs')
    _need(type(release['published_at']) is str
          and re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z', release['published_at']) is not None,
          'Published UTC release time required')
    datetime.strptime(release['published_at'], '%Y-%m-%dT%H:%M:%SZ')
    run = _object(engine['run'], ['conclusion', 'event', 'head_sha', 'html_url', 'id', 'name',
                                  'run_attempt', 'status'], 'run')
    for name in ['id', 'run_attempt']: _count(run[name], 'run.' + name)
    _need(run['status'] == 'completed' and run['conclusion'] == 'success' and run['event'] == 'release'
          and run['name'] == 'Publish to npm' and run['head_sha'] == source['sha']
          and run['html_url'] == 'https://github.com/' + repository + '/actions/runs/' + str(run['id']),
          'Published run/source/release claim differs')
    _text(engine['versionStaging'], 'versionStaging')
    registry = _object(engine['registry'], ['package', 'version', 'distTags', 'peer', 'subflowCapture',
                                          'url', 'length', 'sha256', 'sri', 'sha1',
                                          'registryIntegrityVerified', 'attestationVerified'], 'registry')
    _need(registry['package'] == 'footprintjs' and registry['version'] == version
          and registry['url'] == artifacts['footprintjs']['resolved']
          and registry['sri'] == artifacts['footprintjs']['integrity'], 'Published registry/core identity differs')
    tags = _object(registry['distTags'], ['legacy-9', 'next', 'latest'], 'distTags')
    _need(tags['next'] == version, 'Published next tag differs from the target')
    for name in ['legacy-9', 'latest']: _version(tags[name], PLAIN, 'distTags.' + name)
    _declaration(registry['peer'], versions['foottrace'], 'engine foottrace peer')
    _need(registry['registryIntegrityVerified'] is True and registry['attestationVerified'] is False
          and registry['subflowCapture'] is True, 'Unsupported publication/attestation claim')
    _count(registry['length'], 'registry.length')
    _hash(registry['sha256'], 64, 'registry.sha256'); _hash(registry['sha1'], 40, 'registry.sha1')
    producer = _object(engine['producer'], ['artifactId', 'bytes', 'sha256', 'singleMember',
                                          'metadataSourceRunRepoMatched'], 'producer')
    _count(producer['artifactId'], 'producer.artifactId'); _count(producer['bytes'], 'producer.bytes')
    _hash(producer['sha256'], 64, 'producer.sha256')
    _need(producer['singleMember'] == 'package.tgz' and producer['metadataSourceRunRepoMatched'] is True,
          'Original producer identity is not joined')
    archive = _object(engine['archive'], ['bytes', 'sha256', 'shasum', 'integrity', 'regularCanonicalMembers',
                                         'unpackedMemberBytes', 'modes', 'censusCanonicalSha256',
                                         'censusFileSha256', 'censusAlgorithm', 'singleBoundedGzip',
                                         'memberRoots', 'sourceMapMembers'], 'archive')
    _need(archive['bytes'] == registry['length'] and type(archive['bytes']) is int
          and archive['sha256'] == registry['sha256'] and archive['shasum'] == registry['sha1']
          and archive['integrity'] == registry['sri'], 'Original producer/registry archive identity differs')
    for name in ['regularCanonicalMembers', 'unpackedMemberBytes']: _count(archive[name], 'archive.' + name)
    for name in ['censusCanonicalSha256', 'censusFileSha256']: _hash(archive[name], 64, 'archive.' + name)
    _need(archive['singleBoundedGzip'] is True and archive['censusAlgorithm'] == CENSUS_ALGORITHM
          and type(archive['sourceMapMembers']) is int and archive['sourceMapMembers'] == 0,
          'Original archive inspection claim differs')
    modes = _object(archive['modes'], ['0o644'], 'archive.modes')
    roots = _object(archive['memberRoots'], ['dist', 'directGit'], 'archive.memberRoots')
    for name, count in [*modes.items(), *roots.items()]: _count(count, name, minimum=0)
    _need(sum(modes.values()) == archive['regularCanonicalMembers'] == sum(roots.values()),
          'Original archive member totals differ')
    _need(artifacts['footprintjs']['sourceCommit'] == source['sha'],
          'Engine source identity must come from the release/producer join')


def validate_registry_target(value):
    """Check the closed public-data record and its internal identity joins only."""
    target = _object(value, ['protocol', 'status', 'qualificationSha256', 'coreVersions', 'coreArtifacts',
                             'publishedEngine', 'foottraceRegistry'], 'root')
    _need(target['protocol'] == 'hcifootprint.registry-target.v1'
          and target['status'] == 'PUBLISHED_NEXT_AND_ORIGINAL_PRODUCER_REGISTRY_BYTES_VERIFIED',
          'Qualified published registry target required')
    _hash(target['qualificationSha256'], 64, 'qualificationSha256')
    versions = _object(target['coreVersions'], CORES, 'coreVersions')
    _version(versions['footprintjs'], RC, 'footprintjs'); _version(versions['foottrace'], PLAIN, 'foottrace')
    artifacts = _object(target['coreArtifacts'], CORES, 'coreArtifacts')
    for name in CORES:
        artifact = _object(artifacts[name], ['version', 'resolved', 'integrity', 'sourceCommit'], name)
        _need(artifact['version'] == versions[name] and artifact['resolved'] ==
              f'https://registry.npmjs.org/{name}/-/{name}-{versions[name]}.tgz', 'Canonical registry artifact differs: ' + name)
        _sri(artifact['integrity'])
    _engine(target['publishedEngine'], versions, artifacts)
    trace = _object(target['foottraceRegistry'], ['metadataSha256', 'package', 'version', 'tarball',
                                               'integrity', 'shasum', 'gitHead'], 'foottraceRegistry')
    _hash(trace['metadataSha256'], 64, 'foottrace.metadataSha256'); _hash(trace['shasum'], 40, 'foottrace.shasum')
    _need(trace['package'] == 'foottrace' and trace['version'] == versions['foottrace']
          and trace['tarball'] == artifacts['foottrace']['resolved']
          and trace['integrity'] == artifacts['foottrace']['integrity'], 'Foottrace registry/core identity differs')
    _need(trace['gitHead'] is None and artifacts['foottrace']['sourceCommit'] == UNKNOWN_SOURCE,
          'Foottrace registry source remains unknown')
    return value


def _unique(pairs):
    result = {}
    for key, value in pairs:
        _need(key not in result, 'Duplicate registry target JSON key')
        result[key] = value
    return result


def _invalid(_constant):
    raise ValueError('Non-JSON registry target number')


def load_registry_target(path):
    """Read bounded original bytes, validate them, and return their raw digest."""
    raw = path.read_bytes()
    _need(len(raw) <= 64 * 1024, 'Registry target exceeds its fixed byte bound')
    value = json.loads(raw, object_pairs_hook=_unique, parse_constant=_invalid)
    return validate_registry_target(value), hashlib.sha256(raw).hexdigest()


def verify_target_bindings(expected, authoredPkg, demoPkgs, target, digest):
    """Refuse stale or partial bindings; the owning entry separately admits AF."""
    validate_registry_target(target)
    _need(type(expected) is dict and expected.get('status') == 'NATIVE_SOURCE_READY',
          'Actual qualified AF input required before target binding')
    _hash(digest, 64, 'raw target digest')
    _need(expected.get('registryTargetSha256') == digest, 'Qualified input targets another registry record')
    _need(expected.get('coreVersions') == target['coreVersions']
          and expected.get('coreArtifacts') == target['coreArtifacts'], 'Qualified input core/artifact target differs')
    _need(type(authoredPkg) is dict and type(authoredPkg.get('dependencies')) is dict,
          'Actual authored HCI core declarations required')
    versions = target['coreVersions']
    for name in CORES: _declaration(authoredPkg['dependencies'].get(name), versions[name], 'HCI ' + name)
    requirements = _object(expected.get('runtimeRequirements'),
                           ['dependencies', 'peerDependencies', 'devDependencies'], 'AF runtimeRequirements')
    for section, name in [('dependencies', 'foottrace'), ('peerDependencies', 'footprintjs'),
                          ('devDependencies', 'footprintjs')]:
        fields = _object(requirements[section], [name], 'AF ' + section)
        _declaration(fields[name], versions[name], 'AF ' + section + '.' + name)
    archive = expected.get('archive')
    _need(type(archive) is dict, 'Actual qualified AF archive version required')
    version = archive.get('version')
    _version(version, '(?:' + PLAIN + '|' + RC + ')', 'AF archive')
    _object(demoPkgs, DEMOS, 'maintained demos')
    for name in DEMOS:
        demo = demoPkgs[name]
        _need(type(demo) is dict and type(demo.get('dependencies')) is dict, 'Actual authored demo required: ' + name)
        _need(demo['dependencies'].get('hcifootprint') == 'file:../..', 'Authored demo HCI source link changed')
        _declaration(demo['dependencies'].get('agentfootprint'), version, name + '.agentfootprint')

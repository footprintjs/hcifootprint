import copy
import hashlib
import json
from pathlib import Path
import re
import unittest
from unittest.mock import patch
from native_input import target


REGISTRY_PATH = Path(__file__).parent.parent / 'registry-target.json'
DEMOS = ('demos/live-desk', 'demos/onboarding-wizard')
# SYNTHETIC/inert AF metadata. This is not an actual source tuple or compatibility proof.
SYNTHETIC_AF_VERSION = '99.0.0-rc.0'


def fixtures():
    raw = REGISTRY_PATH.read_bytes()
    value = json.loads(raw)
    versions = value['coreVersions']
    expected = {
        'status': 'NATIVE_SOURCE_READY',
        'registryTargetSha256': hashlib.sha256(raw).hexdigest(),
        'coreVersions': copy.deepcopy(versions),
        'coreArtifacts': copy.deepcopy(value['coreArtifacts']),
        'archive': {'version': SYNTHETIC_AF_VERSION},
        'runtimeRequirements': {
            'dependencies': {'foottrace': '^' + versions['foottrace']},
            'peerDependencies': {'footprintjs': '^' + versions['footprintjs']},
            'devDependencies': {'footprintjs': '^' + versions['footprintjs']},
        },
    }
    authored = {'dependencies': {name: '^' + version for name, version in versions.items()}}
    demos = {name: {'dependencies': {'hcifootprint': 'file:../..',
                                   'agentfootprint': '^' + SYNTHETIC_AF_VERSION}} for name in DEMOS}
    return value, raw, expected, authored, demos


class TargetTests(unittest.TestCase):
    def setUp(self):
        self.value, self.raw, self.expected, self.authored, self.demos = fixtures()

    def bind(self):
        return target.verify_target_bindings(self.expected, self.authored, self.demos,
                                             self.value, hashlib.sha256(self.raw).hexdigest())

    def test_actual_public_metadata_validates_as_data_only(self):
        self.assertIs(target.validate_registry_target(self.value), self.value)

    def test_loader_returns_exact_raw_hash_without_reencoding(self):
        raw = b'\n' + self.raw + b' \n'
        with patch.object(Path, 'read_bytes', return_value=raw) as read:
            value, digest = target.load_registry_target(Path('inert-registry-target.json'))
        read.assert_called_once()
        self.assertEqual(value, self.value)
        self.assertEqual(digest, hashlib.sha256(raw).hexdigest())

    def test_loader_refuses_duplicate_nonjson_and_oversized_data(self):
        duplicate = self.raw.replace(b'"protocol":', b'"protocol":"duplicate","protocol":', 1)
        nonjson = self.raw.replace(b'"qualificationSha256":', b'"not-json":NaN,"qualificationSha256":', 1)
        for raw in [duplicate, nonjson, b' ' * (64 * 1024 + 1), b'[]', b'{']:
            with self.subTest(data=raw[:30]), patch.object(Path, 'read_bytes', return_value=raw):
                with self.assertRaises(ValueError): target.load_registry_target(Path('inert.json'))

    def test_every_mapping_is_closed_against_missing_or_extra_fields(self):
        paths = [(), ('coreVersions',), ('coreArtifacts',), ('coreArtifacts', 'footprintjs'),
                 ('coreArtifacts', 'foottrace'), ('publishedEngine',), ('publishedEngine', 'source'),
                 ('publishedEngine', 'tag'), ('publishedEngine', 'release'), ('publishedEngine', 'run'),
                 ('publishedEngine', 'registry'), ('publishedEngine', 'registry', 'distTags'),
                 ('publishedEngine', 'producer'), ('publishedEngine', 'archive'),
                 ('publishedEngine', 'archive', 'modes'), ('publishedEngine', 'archive', 'memberRoots'),
                 ('foottraceRegistry',)]
        for path in paths:
            for mutation in ['missing', 'extra']:
                with self.subTest(path=path, mutation=mutation):
                    value = copy.deepcopy(self.value); selected = value
                    for key in path: selected = selected[key]
                    if mutation == 'missing': selected.pop(next(iter(selected)))
                    else: selected['unreviewed'] = True
                    with self.assertRaises(ValueError): target.validate_registry_target(value)

    def test_pending_false_publication_and_unverified_claims_refuse(self):
        changes = [(('status',), 'DATA_ONLY'), (('protocol',), 'another'),
                   (('publishedEngine', 'repository'), 'another/repo'),
                   (('publishedEngine', 'release', 'draft'), True),
                   (('publishedEngine', 'release', 'prerelease'), False),
                   (('publishedEngine', 'run', 'status'), 'in_progress'),
                   (('publishedEngine', 'run', 'conclusion'), 'failure'),
                   (('publishedEngine', 'run', 'event'), 'push'),
                   (('publishedEngine', 'registry', 'registryIntegrityVerified'), False),
                   (('publishedEngine', 'registry', 'attestationVerified'), True),
                   (('publishedEngine', 'registry', 'subflowCapture'), False),
                   (('publishedEngine', 'producer', 'metadataSourceRunRepoMatched'), False),
                   (('publishedEngine', 'archive', 'singleBoundedGzip'), False)]
        for path, replacement in changes:
            with self.subTest(path=path):
                value = copy.deepcopy(self.value); selected = value
                for key in path[:-1]: selected = selected[key]
                selected[path[-1]] = replacement
                with self.assertRaises(ValueError): target.validate_registry_target(value)

    def test_source_tag_release_run_and_registry_version_joins_refuse(self):
        changes = [(('publishedEngine', 'tag', 'sha'), 'b' * 40),
                   (('publishedEngine', 'tag', 'ref'), 'refs/tags/wrong'),
                   (('publishedEngine', 'tag', 'type'), 'tag'),
                   (('publishedEngine', 'release', 'target_commitish'), 'b' * 40),
                   (('publishedEngine', 'release', 'tag_name'), 'wrong'),
                   (('publishedEngine', 'release', 'html_url'), 'https://github.com/another/release'),
                   (('publishedEngine', 'run', 'head_sha'), 'b' * 40),
                   (('publishedEngine', 'run', 'html_url'), 'https://github.com/another/run'),
                   (('publishedEngine', 'registry', 'version'), '98.0.0-rc.0'),
                   (('publishedEngine', 'registry', 'distTags', 'next'), '98.0.0-rc.0'),
                   (('publishedEngine', 'registry', 'peer'), '^1.0.0')]
        for path, replacement in changes:
            with self.subTest(path=path):
                value = copy.deepcopy(self.value); selected = value
                for key in path[:-1]: selected = selected[key]
                selected[path[-1]] = replacement
                with self.assertRaises(ValueError): target.validate_registry_target(value)

    def test_wrong_rc_stable_engine_or_trace_prerelease_refuses(self):
        for name, version in [('footprintjs', '98.0.0-rc.1'), ('footprintjs', '13.0.0'),
                              ('footprintjs', '014.0.0-rc.0'), ('foottrace', '2.1.0-rc.0')]:
            with self.subTest(name=name, version=version):
                value = copy.deepcopy(self.value); value['coreVersions'][name] = version
                with self.assertRaises(ValueError): target.validate_registry_target(value)

    def test_self_consistent_unicode_version_digits_are_not_canonical_semver(self):
        for name in ['footprintjs', 'foottrace']:
            old = self.value['coreVersions'][name]
            malformed = old[:-1] + '1\u0661'
            # Negative metadata only: all text joins agree, isolating canonical version validation.
            value = json.loads(json.dumps(self.value).replace(old, malformed))
            with self.subTest(name=name), self.assertRaises(ValueError):
                target.validate_registry_target(value)

    def test_registry_archive_identity_and_member_totals_must_join(self):
        changes = [(('publishedEngine', 'archive', 'bytes'), 1),
                   (('publishedEngine', 'archive', 'sha256'), 'b' * 64),
                   (('publishedEngine', 'archive', 'shasum'), 'b' * 40),
                   (('publishedEngine', 'archive', 'integrity'), 'sha512-YQ=='),
                   (('publishedEngine', 'archive', 'regularCanonicalMembers'), 1),
                   (('publishedEngine', 'archive', 'modes', '0o644'), 1),
                   (('publishedEngine', 'archive', 'memberRoots', 'dist'), 1),
                   (('publishedEngine', 'archive', 'sourceMapMembers'), 1),
                   (('publishedEngine', 'producer', 'singleMember'), '../package.tgz')]
        for path, replacement in changes:
            with self.subTest(path=path):
                value = copy.deepcopy(self.value); selected = value
                for key in path[:-1]: selected = selected[key]
                selected[path[-1]] = replacement
                with self.assertRaises(ValueError): target.validate_registry_target(value)

    def test_core_artifact_locators_sri_and_source_claims_refuse(self):
        for name in ['footprintjs', 'foottrace']:
            for field, replacement in [('version', '98.0.0'), ('resolved', 'file:/wrong'),
                                       ('integrity', 'sha512-YQ=='), ('sourceCommit', 'claimed')]:
                with self.subTest(name=name, field=field):
                    value = copy.deepcopy(self.value); value['coreArtifacts'][name][field] = replacement
                    with self.assertRaises(ValueError): target.validate_registry_target(value)
        self.value['foottraceRegistry']['gitHead'] = 'b' * 40
        with self.assertRaises(ValueError): target.validate_registry_target(self.value)

    def test_matching_but_short_sri_is_not_a_sha512_identity(self):
        for name in ['footprintjs', 'foottrace']:
            with self.subTest(name=name):
                value = copy.deepcopy(self.value)
                old = value['coreArtifacts'][name]['integrity']
                value = json.loads(json.dumps(value).replace(old, 'sha512-YQ=='))
                with self.assertRaises(ValueError): target.validate_registry_target(value)

    def test_hashes_and_provider_numbers_are_exact_and_bounded(self):
        changes = [(('qualificationSha256',), 'made-up'), (('publishedEngine', 'source', 'tree'), 'x' * 40),
                   (('foottraceRegistry', 'metadataSha256'), 'b' * 63),
                   (('publishedEngine', 'producer', 'sha256'), 'b' * 63),
                   (('publishedEngine', 'archive', 'censusCanonicalSha256'), 'b' * 63),
                   (('publishedEngine', 'release', 'id'), True),
                   (('publishedEngine', 'run', 'id'), 0),
                   (('publishedEngine', 'producer', 'artifactId'), 2 ** 53)]
        for path, replacement in changes:
            with self.subTest(path=path):
                value = copy.deepcopy(self.value); selected = value
                for key in path[:-1]: selected = selected[key]
                selected[path[-1]] = replacement
                with self.assertRaises(ValueError): target.validate_registry_target(value)

    def test_matching_synthetic_af_bindings_accept_only_exact_or_caret(self):
        self.assertIsNone(self.bind())
        for name, version in self.value['coreVersions'].items(): self.authored['dependencies'][name] = version
        self.expected['runtimeRequirements']['dependencies']['foottrace'] = self.value['coreVersions']['foottrace']
        for section in ['peerDependencies', 'devDependencies']:
            self.expected['runtimeRequirements'][section]['footprintjs'] = self.value['coreVersions']['footprintjs']
        for demo in self.demos.values(): demo['dependencies']['agentfootprint'] = SYNTHETIC_AF_VERSION
        self.assertIsNone(self.bind())

    def test_pending_stale_or_partial_ready_binding_refuses(self):
        self.expected['status'] = 'AWAITING_QUALIFIED_AF'
        with self.assertRaises(ValueError): self.bind()
        self.expected['status'] = 'NATIVE_SOURCE_READY'
        self.expected['coreVersions']['footprintjs'] = '13.0.0'
        with self.assertRaises(ValueError): self.bind()
        self.expected['coreVersions'] = copy.deepcopy(self.value['coreVersions'])
        del self.expected['coreArtifacts']['foottrace']
        with self.assertRaises(ValueError): self.bind()

    def test_wrong_target_digest_or_partial_artifact_refuses(self):
        self.expected['registryTargetSha256'] = 'b' * 64
        with self.assertRaises(ValueError): self.bind()
        self.expected['registryTargetSha256'] = hashlib.sha256(self.raw).hexdigest()
        self.expected['coreArtifacts']['footprintjs']['integrity'] = self.value['coreArtifacts']['foottrace']['integrity']
        with self.assertRaises(ValueError): self.bind()

    def test_authored_core_declarations_cannot_hide_an_old_or_broad_target(self):
        for replacement in ['^13.0.0', '*', 'next', 'file:/elsewhere', ' >=14.0.0-rc.0', '~14.0.0-rc.0']:
            with self.subTest(range=replacement):
                authored = copy.deepcopy(self.authored); authored['dependencies']['footprintjs'] = replacement
                with self.assertRaises(ValueError):
                    target.verify_target_bindings(self.expected, authored, self.demos, self.value,
                                                  hashlib.sha256(self.raw).hexdigest())

    def test_stale_af_direct_peer_or_dev_requirements_refuse(self):
        for section, name, replacement in [('dependencies', 'foottrace', '^2.0.0'),
                                            ('peerDependencies', 'footprintjs', '^13.0.0'),
                                            ('devDependencies', 'footprintjs', '^13.0.0')]:
            with self.subTest(section=section):
                expected = copy.deepcopy(self.expected); expected['runtimeRequirements'][section][name] = replacement
                with self.assertRaises(ValueError):
                    target.verify_target_bindings(expected, self.authored, self.demos, self.value,
                                                  hashlib.sha256(self.raw).hexdigest())

    def test_demo_slots_links_and_actual_synthetic_af_version_must_match(self):
        for demo in DEMOS:
            for name, replacement in [('agentfootprint', '^15.0.0-rc.0'), ('hcifootprint', 'file:/other')]:
                with self.subTest(demo=demo, name=name):
                    demos = copy.deepcopy(self.demos); demos[demo]['dependencies'][name] = replacement
                    with self.assertRaises(ValueError):
                        target.verify_target_bindings(self.expected, self.authored, demos, self.value,
                                                      hashlib.sha256(self.raw).hexdigest())
        del self.demos[DEMOS[1]]
        with self.assertRaises(ValueError): self.bind()

    def test_missing_af_version_or_requirement_never_infers_a_new_identity(self):
        self.expected['archive'] = {}
        with self.assertRaises(ValueError): self.bind()
        self.expected['archive']['version'] = SYNTHETIC_AF_VERSION
        del self.expected['runtimeRequirements']['peerDependencies']
        with self.assertRaises(ValueError): self.bind()

    def test_component_has_no_typed_in_family_version(self):
        source = Path(target.__file__).read_text()
        self.assertIsNone(re.search(r'\d+\.\d+\.\d+', source))


if __name__ == '__main__': unittest.main()

"""Inert input metadata controls; no fixture is an admitted AF source."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from native_input.config import load_input
from native_input.artifact_test import fixture, wrap


def inert_ready_input():
    target_path = Path(__file__).parent.parent / 'registry-target.json'
    raw = target_path.read_bytes(); target = json.loads(raw)
    versions = target['coreVersions']
    manifest = {'name': 'agentfootprint', 'version': '15.0.0-rc.0',
                'dependencies': {'foottrace': '^' + versions['foottrace']},
                'peerDependencies': {'footprintjs': '^' + versions['footprintjs']},
                'devDependencies': {'footprintjs': '^' + versions['footprintjs']}}
    _, value = wrap(fixture(manifest=manifest))
    value['runtimeRequirements'] = {name: manifest[name] for name in
                                   ['dependencies', 'peerDependencies', 'devDependencies']}
    value.update(status='NATIVE_SOURCE_READY', protocol='hcifootprint.native-input.v2',
        repository='footprintjs/agentfootprint', repositoryId=42,
        registryTargetSha256=hashlib.sha256(raw).hexdigest(),
        qualifiedTupleSha256='a' * 64, independentReviewSha256='b' * 64,
        coreVersions=copy.deepcopy(versions), coreArtifacts=copy.deepcopy(target['coreArtifacts']),
        run={'id': 1, 'run_attempt': 1, 'workflow_id': 2, 'name': 'CI',
             'event': 'pull_request', 'head_branch': 'inert-input-fixture',
             'status': 'completed', 'conclusion': 'failure'},
        sourceJob={'id': 3, 'name': 'test-package (24)', 'status': 'completed',
                   'conclusion': 'success', 'actualSourceArtifactIdPresentInCanonicalLog': True},
        heldProducerJob={'id': 4, 'name': 'docs', 'reason': 'AF-docs/Lens dependency bootstrap cycle'})
    return value


class InputTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='hci-native-input-')
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'input.json'
        self.value = inert_ready_input()

    def check(self):
        self.path.write_text(json.dumps(self.value)); return load_input(self.path)

    def test_synthetic_ready_metadata_has_a_closed_role_not_compatibility(self):
        self.assertEqual(self.check()['status'], 'NATIVE_SOURCE_READY')

    def test_pending_row_has_no_AF_identity_and_cannot_be_admitted(self):
        self.value = {key: self.value[key] for key in ['protocol', 'registryTargetSha256', 'coreVersions']}
        self.value['status'] = 'AWAITING_QUALIFIED_AF'
        with self.assertRaisesRegex(ValueError, 'Awaiting new qualified AF'): self.check()
        self.value['archive'] = {}
        with self.assertRaisesRegex(ValueError, 'fields differ'): self.check()

    def test_old_protocol_does_not_carry_to_the_new_target(self):
        self.value['protocol'] = 'hcifootprint.native-input.v1'
        self.assertRaises(ValueError, self.check)

    def test_core_identity_digits_are_canonical_ascii(self):
        for name, version in [('footprintjs', '14.0.0-rc.1\u0661'), ('foottrace', '2.1.1\u0661')]:
            with self.subTest(name=name):
                self.value = inert_ready_input()
                self.value['coreVersions'][name] = version
                artifact = self.value['coreArtifacts'][name]
                artifact['version'] = version
                artifact['resolved'] = f'https://registry.npmjs.org/{name}/-/{name}-{version}.tgz'
                self.assertRaises(ValueError, self.check)

    def test_unknown_missing_duplicate_or_provisional_input_refuses(self):
        for field in ['commands', 'callbacks', 'roots']:
            self.value[field] = []; self.assertRaises(ValueError, self.check); del self.value[field]
        self.value['status'] = 'DATA_ONLY'; self.assertRaises(ValueError, self.check)
        self.path.write_text('{"status":"NATIVE_SOURCE_READY","status":"DATA_ONLY"}')
        self.assertRaises(ValueError, load_input, self.path)

    def test_parser_overflow_cannot_hide_in_unused_provider_metadata(self):
        raw = json.dumps(self.value).replace('"name": "CI"', '"name": 1e999')
        self.path.write_text(raw)
        with self.assertRaisesRegex(ValueError, 'Non-JSON'):
            load_input(self.path)

    def test_other_failed_job_or_noninteger_provider_selector_refuses(self):
        self.value['heldProducerJob']['name'] = 'test'; self.assertRaises(ValueError, self.check)
        self.value['heldProducerJob']['name'] = 'docs'
        self.value['run']['id'] = '../another'; self.assertRaises(ValueError, self.check)

    def test_unqualified_core_or_false_source_binding_or_fake_locator_refuses(self):
        for field, replacement in [('version', 'not-source'), ('resolved', 'file:/elsewhere'),
                                   ('sourceCommit', 'claimed-without-proof'), ('integrity', 'made-up')]:
            before = copy.deepcopy(self.value)
            self.value['coreArtifacts']['footprintjs'][field] = replacement
            self.assertRaises(ValueError, self.check); self.value = before
        self.value['coreVersions']['foottrace'] += '-rc.0'; self.assertRaises(ValueError, self.check)
        self.value = inert_ready_input(); self.value['registryTargetSha256'] = 'not-a-hash'
        self.assertRaises(ValueError, self.check)


if __name__ == '__main__': unittest.main()

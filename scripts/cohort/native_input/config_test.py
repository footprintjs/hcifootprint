import copy
import json
from pathlib import Path
import tempfile
import unittest
from native_input.config import load_input


class InputTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='hci-native-input-')
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'input.json'
        self.value = json.loads((Path(__file__).parent.parent / 'native-input.json').read_text())

    def check(self):
        self.path.write_text(json.dumps(self.value)); return load_input(self.path)

    def test_reviewed_row_has_a_closed_native_source_role(self):
        self.assertEqual(self.check()['status'], 'NATIVE_SOURCE_READY')

    def test_unknown_missing_duplicate_or_provisional_input_refuses(self):
        for field in ['commands', 'callbacks', 'roots']:
            self.value[field] = []; self.assertRaises(ValueError, self.check); del self.value[field]
        self.value['status'] = 'DATA_ONLY'; self.assertRaises(ValueError, self.check)
        self.path.write_text('{"status":"NATIVE_SOURCE_READY","status":"DATA_ONLY"}')
        self.assertRaises(ValueError, load_input, self.path)

    def test_other_failed_job_or_noninteger_provider_selector_refuses(self):
        self.value['heldProducerJob']['name'] = 'test'; self.assertRaises(ValueError, self.check)
        self.value['heldProducerJob']['name'] = 'docs'
        self.value['run']['id'] = '../another'; self.assertRaises(ValueError, self.check)

    def test_core_prerelease_false_source_binding_or_fake_locator_refuses(self):
        for field, replacement in [('version', 'not-source'), ('resolved', 'file:/elsewhere'),
                                   ('sourceCommit', 'claimed-without-proof'), ('integrity', 'made-up')]:
            before = copy.deepcopy(self.value)
            self.value['coreArtifacts']['footprintjs'][field] = replacement
            self.assertRaises(ValueError, self.check); self.value = before
        self.value['coreVersions']['footprintjs'] += '-rc.0'; self.assertRaises(ValueError, self.check)


if __name__ == '__main__': unittest.main()

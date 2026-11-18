import hashlib
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from native_input.owned_files import OwnedFiles
from native_input.proof import read_proof, seal_proof


class ProofTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='hci-proof-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'proof'; self.root.mkdir()
        files = OwnedFiles(self.root)
        self.guard = SimpleNamespace(proof=self.root, files=files, written={})
        def write_bytes(name, raw):
            with files.new(self.root / name) as stream: stream.write(raw)
            self.guard.written[name] = hashlib.sha256(raw).hexdigest()
        self.guard.write_bytes = write_bytes
        write_bytes('native-result.json', json.dumps({'inert': 'proof fixture, not compatibility'}).encode())

    def test_seal_binds_every_recorded_raw_file_and_reader_never_executes(self):
        seal_proof(self.guard)
        bundle = read_proof(self.root)
        seal = json.loads(bundle.pop('proof-seal.json'))
        self.assertEqual(seal['files'], {n: hashlib.sha256(b).hexdigest() for n, b in bundle.items()})
        self.assertEqual(seal['protocol'], 'hcifootprint.native-proof.v1')

    def test_altered_missing_extra_or_repeated_proof_refuses(self):
        path = self.root / 'native-result.json'; original = path.read_bytes()
        path.write_bytes(b'changed')
        self.assertRaises(ValueError, seal_proof, self.guard)
        path.unlink(); self.assertRaises(ValueError, seal_proof, self.guard)
        path.write_bytes(original)
        extra = self.root / 'extra.log'; extra.write_bytes(b'unrecorded')
        self.assertRaises(ValueError, seal_proof, self.guard)
        extra.unlink(); seal_proof(self.guard)
        self.assertRaises(ValueError, seal_proof, self.guard)

    def test_links_directories_and_nonproof_names_refuse(self):
        outside = self.root.parent / 'outside'; outside.write_bytes(b'preserve')
        path = self.root / 'native-result.json'; path.unlink(); path.symlink_to(outside)
        self.assertRaises((OSError, ValueError), read_proof, self.root)
        path.unlink(); path.mkdir()
        self.assertRaises((OSError, ValueError), read_proof, self.root)
        path.rmdir(); (self.root / 'script.py').write_bytes(b'never execute')
        self.assertRaises(ValueError, read_proof, self.root)
        self.assertEqual(outside.read_bytes(), b'preserve')

    def test_byte_bounds_apply_before_and_during_read(self):
        from unittest.mock import patch
        with patch('native_input.proof.MAX_FILE', 1):
            self.assertRaisesRegex(ValueError, 'byte bound', read_proof, self.root)
        with patch('native_input.proof.MAX_TOTAL', 1):
            self.assertRaisesRegex(ValueError, 'byte bound', read_proof, self.root)

    def test_seal_reserves_its_own_file_and_byte_budget(self):
        from unittest.mock import patch
        size = (self.root / 'native-result.json').stat().st_size
        with patch('native_input.proof.MAX_FILES', 1):
            self.assertRaises(ValueError, seal_proof, self.guard)
        with patch('native_input.proof.MAX_TOTAL', size):
            self.assertRaises(ValueError, seal_proof, self.guard)
        self.assertFalse((self.root / 'proof-seal.json').exists())

    def test_file_added_during_seal_read_refuses(self):
        from unittest.mock import patch
        from native_input import proof
        original = proof._read
        def interleave(*args):
            result = original(*args)
            (self.root / 'late.json').write_bytes(b'{}')
            return result
        with patch('native_input.proof._read', side_effect=interleave):
            self.assertRaises(ValueError, seal_proof, self.guard)

    def test_nonregular_leaf_is_opened_nonblocking_then_refused(self):
        from unittest.mock import patch
        path = self.root / 'native-result.json'; path.unlink(); os.mkfifo(path)
        original = os.open
        def refuse_blocking_fifo(name, flags, *args, **kwargs):
            if name == path.name:
                self.assertTrue(flags & os.O_NONBLOCK, 'FIFO must not block before fstat')
            return original(name, flags, *args, **kwargs)
        with patch('native_input.owned_files.os.open', side_effect=refuse_blocking_fifo):
            self.assertRaisesRegex(ValueError, 'regular file', read_proof, self.root)


if __name__ == '__main__': unittest.main()

from pathlib import Path
import os
import tempfile
import unittest
from native_input.owned_files import OwnedFiles


class OwnedFileTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='hci-owned-files-')
        self.addCleanup(self.temp.cleanup)
        base = Path(self.temp.name).resolve()
        self.root = base / 'owned'; self.root.mkdir()
        self.outside = base / 'outside'; self.outside.mkdir()
        self.proof = self.root / 'proof'; self.proof.mkdir()
        self.files = OwnedFiles(self.root); self.files.register(self.proof / 'anchor')

    def test_atomic_leaf_replacement_preserves_symlink_and_hardlink_targets(self):
        outside = self.outside / 'data'; outside.write_bytes(b'outside'); outside.chmod(0o600)
        for kind in ['symlink', 'hardlink']:
            path = self.proof / kind
            if kind == 'symlink': path.symlink_to(outside)
            else: os.link(outside, path)
            self.files.replace(path, b'restored', 0o644)
            self.assertEqual(path.read_bytes(), b'restored')
            self.assertFalse(path.is_symlink())
            self.assertEqual(outside.read_bytes(), b'outside')
            self.assertEqual(outside.stat().st_mode & 0o777, 0o600)

    def test_changed_parent_refuses_every_read_write_and_cleanup(self):
        self.proof.rename(self.root / 'saved-proof'); self.proof.symlink_to(self.outside, target_is_directory=True)
        outside = self.outside / 'leaf'; outside.write_bytes(b'outside')
        for action in [lambda: self.files.new(self.proof / 'new'),
                       lambda: self.files.read(self.proof / 'leaf'),
                       lambda: self.files.replace(self.proof / 'leaf', b'wrong', 0o644),
                       lambda: self.files.remove_generated(self.proof / 'leaf')]:
            with self.assertRaises((OSError, ValueError)): action()
        self.assertEqual(outside.read_bytes(), b'outside')
        self.assertFalse((self.outside / 'new').exists())

    def test_new_same_named_directory_is_not_the_admitted_parent(self):
        self.proof.rename(self.root / 'saved-proof'); self.proof.mkdir()
        with self.assertRaises(ValueError): self.files.register(self.proof / 'new')
        with self.assertRaises(ValueError): self.files.new(self.proof / 'new')

    def test_generated_leaf_link_is_removed_without_touching_target(self):
        target = self.outside / 'data'; target.write_bytes(b'outside')
        path = self.proof / 'generated'; path.symlink_to(self.outside, target_is_directory=True)
        self.files.remove_generated(path)
        self.assertFalse(path.is_symlink())
        self.assertEqual(target.read_bytes(), b'outside')


if __name__ == '__main__': unittest.main()

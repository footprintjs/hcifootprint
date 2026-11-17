import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from native_input.installed import ConsumerGuard, join_image


class InstalledTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='hci-installed-guard-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.image = self.root / 'package'; self.image.mkdir()
        (self.image / 'index.js').write_bytes(b'original')
        self.members = [{'path': 'package/index.js', 'size': 8,
                         'sha256': hashlib.sha256(b'original').hexdigest()}]

    def test_actual_installed_member_join(self):
        self.assertEqual(join_image(self.image, self.members)['members'], 1)

    def test_missing_changed_extra_and_linked_members_refuse(self):
        for change in ['missing', 'changed', 'extra', 'link']:
            with self.subTest(change=change):
                target = self.image / 'index.js'
                if not target.exists(): target.write_bytes(b'original')
                if change == 'missing': target.unlink()
                if change == 'changed': target.write_bytes(b'mutated')
                if change == 'extra': (self.image / '.hidden').write_bytes(b'new')
                if change == 'link':
                    target.unlink(); target.symlink_to(self.root / 'outside.js')
                    (self.root / 'outside.js').write_bytes(b'original')
                with self.assertRaises(ValueError): join_image(self.image, self.members)
                if target.is_symlink(): target.unlink()
                if (self.image / '.hidden').exists(): (self.image / '.hidden').unlink()
                target.write_bytes(b'original')

    def test_prepared_consumer_rejects_changes_before_install_or_types(self):
        consumer = self.root / 'consumer'; consumer.mkdir()
        for name in ConsumerGuard.SPECIMENS: (consumer / name).write_bytes(b'authored')
        guard = ConsumerGuard(consumer, lambda *_args: None)
        for name in ['package.json', 'tsconfig.json', 'types.mts']:
            (consumer / name).write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'specimen/compiler changed'): guard.verify()
            (consumer / name).write_bytes(b'authored')
        (consumer / '.npmrc').write_bytes(b'unexpected')
        with self.assertRaisesRegex(ValueError, 'unexpected source files'):
            ConsumerGuard(consumer, lambda *_args: None)


if __name__ == '__main__': unittest.main()

import json
from pathlib import Path
import tempfile
import unittest
from native_input.source_guard import DEMOS, GENERATED, ORIGINALS, SourceGuard, digest


class GuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='hci-native-guard-')
        self.addCleanup(self.temp.cleanup)
        self.audit = Path(self.temp.name).resolve()
        self.root = self.audit / 'source'; self.root.mkdir()
        for name in ORIGINALS:
            path = self.root / name; path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({'dependencies': {'hcifootprint': 'file:../..', 'agentfootprint': '^1.0.0-rc.0'}}))
        (self.root / 'authored.mjs').write_text('export const original = true;\n')
        patches = self.root / 'patches'; patches.mkdir()
        (patches / 'typedoc+fixture.patch').write_text(
            '--- a/node_modules/typedoc/dist/node-utils.js\n+++ b/node_modules/typedoc/dist/node-utils.js\n'
            '@@ -1,2 +1,2 @@\n one\n-two\n+patched\n')
        self.guard = SourceGuard(self.root, self.audit)

    def test_only_two_demo_slots_are_projected_and_exactly_restored(self):
        before = {n: (self.root / n).read_bytes() for n in ORIGINALS}
        archive = self.audit / 'original.tgz'; archive.write_bytes(b'actual-input')
        self.guard.admit_inputs([archive]); self.guard.project(archive)
        self.guard.verify('projected')
        for demo in DEMOS:
            self.assertEqual(json.loads((self.root / demo / 'package.json').read_text())['dependencies']['agentfootprint'], 'file:' + str(archive))
        self.guard.restore()
        self.assertEqual(before, {n: (self.root / n).read_bytes() for n in ORIGINALS})

    def test_fresh_native_locks_do_not_reuse_stale_registry_resolution(self):
        before = {n: (self.root / n).read_bytes() for n in ORIGINALS}
        self.guard.fresh_locks()
        for name in ['package-lock.json', 'docs-next/package-lock.json']:
            self.assertFalse((self.root / name).exists())
        self.guard.verify('fresh-locks')
        for name in ['package-lock.json', 'docs-next/package-lock.json']:
            (self.root / name).write_text('{"genuine-generated-fixture":true}')
            self.guard.accept([name])
        self.guard.verify('genuine-locks')
        self.guard.restore()
        self.assertEqual(before, {n: (self.root / n).read_bytes() for n in ORIGINALS})

    def test_hidden_untracked_and_authored_changes_refuse(self):
        for name in ['authored.mjs', '.hidden-state']:
            with self.subTest(name=name):
                path = self.root / name; old = path.read_bytes() if path.exists() else None
                path.write_bytes(b'changed')
                with self.assertRaisesRegex(ValueError, 'source changed'): self.guard.verify('mutated-' + name)
                if old is None: path.unlink()
                else: path.write_bytes(old)

    def test_new_unknown_ignored_looking_directory_is_not_exempt(self):
        path = self.root / '.cache/private'; path.mkdir(parents=True); (path / 'input').write_bytes(b'x')
        with self.assertRaisesRegex(ValueError, 'source changed'): self.guard.verify('unknown-cache')

    def test_original_archive_mutation_refuses(self):
        archive = self.audit / 'original.tgz'; archive.write_bytes(b'original')
        self.guard.admit_inputs([archive]); archive.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'native input changed'): self.guard.verify('archive')

    def test_only_declared_projection_roles_can_be_accepted(self):
        for name in ['authored.mjs', 'package.json', 'docs-next/package.json']:
            with self.assertRaisesRegex(ValueError, 'Unexpected authored transition'):
                self.guard.accept([name])

    def test_generated_absences_restore_and_unexpected_source_does_not_get_hidden(self):
        for name in GENERATED:
            path = self.root / name
            if Path(name).suffix:
                path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(b'generated')
            else:
                path.mkdir(parents=True, exist_ok=True); (path / 'output').write_bytes(b'generated')
        self.guard.restore()
        self.assertFalse(any((self.root / name).exists() for name in GENERATED))

    def test_restoration_does_not_hide_changed_unexpected_authored_source(self):
        (self.root / 'authored.mjs').write_bytes(b'wrong')
        with self.assertRaisesRegex(ValueError, 'restoration failed'): self.guard.restore()

    def test_replacing_a_prior_proof_is_not_a_new_baseline(self):
        (self.audit / 'proof/source-baseline.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'Retained native proof changed'): self.guard.verify('tainted-proof')

    def test_preexisting_generated_data_refuses_before_a_run(self):
        (self.root / 'dist').mkdir()
        with self.assertRaisesRegex(ValueError, 'absent generated-output baselines'):
            SourceGuard(self.root, self.audit)

    def test_authored_input_alias_refuses_before_reading_external_bytes(self):
        external = self.audit / 'outside'; external.write_bytes(b'not source')
        path = self.root / 'docs-next/package.json'; path.unlink(); path.symlink_to(external)
        with self.assertRaisesRegex(ValueError, 'Canonical regular authored input'):
            SourceGuard(self.root, self.audit)

    def tool(self):
        path = self.root / 'node_modules/typedoc/dist/node-utils.js'
        path.parent.mkdir(parents=True); path.write_bytes(b'one\ntwo\n'); path.chmod(0o644)
        self.guard.files.register(path)
        self.guard.tool_original = path.read_bytes()
        self.guard.tool_baseline = digest(path)
        self.guard.tool_expected = digest(path)
        return path

    def test_only_entire_authored_tool_patch_is_accepted_and_restored(self):
        path = self.tool(); original = digest(path)
        path.write_bytes(b'one\npatched\n')
        self.guard.accept_tool_patch(); self.guard.verify('permitted-tool')
        self.guard.restore()
        self.assertEqual(digest(path), original)
        self.assertEqual(path.read_bytes(), b'one\ntwo\n')

    def test_extra_tool_mutation_or_mode_change_refuses(self):
        path = self.tool(); path.write_bytes(b'one\npatched\nextra\n')
        with self.assertRaisesRegex(ValueError, 'entire authored patch'): self.guard.accept_tool_patch()
        path.write_bytes(b'one\npatched\n'); path.chmod(0o755)
        with self.assertRaisesRegex(ValueError, 'changed its mode'): self.guard.accept_tool_patch()

    def test_restoration_never_writes_through_a_substituted_authored_leaf(self):
        outside = self.audit / 'outside'; outside.write_bytes(b'preserve outside'); outside.chmod(0o600)
        path = self.root / 'docs-next/package.json'; path.unlink(); path.symlink_to(outside)
        try: self.guard.restore()
        except ValueError: pass
        self.assertEqual(outside.read_bytes(), b'preserve outside')
        self.assertEqual(outside.stat().st_mode & 0o777, 0o600)

    def test_restoration_never_follows_a_substituted_source_parent(self):
        original = self.root / 'docs-next'; original.rename(self.root / 'saved-docs')
        outside = self.audit / 'outside-dir'; outside.mkdir()
        (outside / 'package.json').write_bytes(b'preserve outside')
        (outside / 'package-lock.json').write_bytes(b'preserve lock')
        original.symlink_to(outside, target_is_directory=True)
        with self.assertRaises((ValueError, OSError)): self.guard.restore()
        self.assertEqual((outside / 'package.json').read_bytes(), b'preserve outside')
        self.assertEqual((outside / 'package-lock.json').read_bytes(), b'preserve lock')

    def test_tool_restoration_preserves_substituted_outside_target(self):
        leaf = self.tool(); outside = self.audit / 'outside-tool'; outside.write_bytes(b'preserve outside')
        leaf.unlink(); leaf.symlink_to(outside)
        try: self.guard.restore()
        except ValueError: pass
        self.assertEqual(outside.read_bytes(), b'preserve outside')


if __name__ == '__main__': unittest.main()

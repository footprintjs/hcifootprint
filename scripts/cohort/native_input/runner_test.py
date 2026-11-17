import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from native_input.gates import REQUIRED
from native_input.runner import NativeRun, run_native


class RecipeTests(unittest.TestCase):
    def test_root_resolution_requests_the_qualified_core_without_selecting_demo_saves(self):
        with tempfile.TemporaryDirectory(prefix='hci-native-resolution-') as directory:
            audit = Path(directory); (audit / 'inputs').mkdir()
            run = NativeRun.__new__(NativeRun)
            run.audit = audit
            run.input = {'archive': {'filename': 'original.tgz'},
                         'coreVersions': {'footprintjs': '13.0.0', 'foottrace': '2.0.0'}}
            run.guard = SimpleNamespace(write=lambda *args: None, admit_inputs=lambda *args: None,
                                        project=lambda *args: None, fresh_locks=lambda: None)
            commands = []
            class Captured(Exception): pass
            def command(label, argv, **kwargs):
                commands.append((label, argv)); raise Captured()
            run.command = command
            with patch.dict(os.environ, {'GH_TOKEN': 'fixture'}), \
                 patch('native_input.runner.fetch_candidate', return_value=(b'original-zip', {})), \
                 patch('native_input.runner.inspect_candidate', return_value={'tarball': b'original-tgz', 'facts': {}}):
                with self.assertRaises(Captured): run.execute()
            label, argv = commands[0]
            self.assertEqual(label, 'root-lock')
            self.assertIn('footprintjs@13.0.0', argv)
            self.assertIn('foottrace@2.0.0', argv)
            self.assertIn('--save-prefix=^', argv)
            self.assertIn('--strict-peer-deps', argv)
            self.assertNotIn('--workspaces', argv)

    def test_primary_command_failure_survives_secondary_guard_failure(self):
        with tempfile.TemporaryDirectory(prefix='hci-recipe-') as directory:
            results = {}
            run = NativeRun.__new__(NativeRun)
            run.root = Path(directory); run.records = []
            from native_input.owned_files import OwnedFiles
            run.guard = SimpleNamespace(proof=run.root, written={}, files=OwnedFiles(run.root),
                                        write=lambda name, value: results.update({name: value}))
            def check(label):
                if label.endswith('-after'): raise ValueError('secondary guard')
            run.check = check
            with patch('native_input.runner.subprocess.run', return_value=SimpleNamespace(returncode=23)), contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaises(subprocess.CalledProcessError) as error:
                    run.command('owned', ['not-executed'])
            self.assertEqual(error.exception.returncode, 23)
            self.assertEqual(results['owned-result.json']['afterGuardError'], 'secondary guard')

    def verdict(self, primary=None, cleanup=None, missing_gate=False, version_error=None):
        with tempfile.TemporaryDirectory(prefix='hci-native-verdict-') as directory:
            root = Path(directory).resolve() / 'source'; (root / 'scripts/cohort').mkdir(parents=True)
            (root / 'scripts/cohort/native-input.json').write_text(json.dumps({'protocol': 'hcifootprint.native-input.v1'}))
            results = {}
            rows = [{'label': name, 'exit': 1 if name == 'ordinary-pins-refused' else 0,
                     'expectedExit': 1 if name == 'ordinary-pins-refused' else 0, 'afterGuardError': None} for name in REQUIRED]
            if missing_gate: rows.pop()
            def execute():
                if primary is not None: raise primary
            def restore():
                if cleanup is not None: raise cleanup
            fake = SimpleNamespace(records=rows, execute=execute,
                guard=SimpleNamespace(restore=restore, write=lambda name, value: results.update({name: value})))
            def output(argv, **kwargs):
                if argv == ['git', 'status', '--porcelain']: return b''
                if argv == ['git', 'rev-parse', 'HEAD']: return 'a' * 40
                if argv == ['git', 'rev-parse', 'HEAD^{tree}']: return 'b' * 40
                if argv == ['node', '--version']: return 'fixture-node'
                if argv == ['npm', '--version']:
                    if version_error is not None: raise version_error
                    return 'fixture-npm'
                raise AssertionError('Unexpected process: ' + str(argv))
            with patch.dict(os.environ, {'HCI_SOURCE_HEAD': 'a' * 40, 'HCI_SOURCE_BASE': 'c' * 40}), \
                 patch('native_input.runner.NativeRun', return_value=fake), \
                 patch('native_input.runner.load_input', return_value={'protocol': 'hcifootprint.native-input.v1'}), \
                 patch('native_input.runner.subprocess.check_output', side_effect=output), \
                 contextlib.redirect_stdout(io.StringIO()):
                code = run_native(root)
            return code, results['native-result.json']

    def test_original_and_restoration_errors_are_distinct(self):
        code, result = self.verdict(OSError('original'), ValueError('restoration'))
        self.assertEqual(code, 1)
        self.assertEqual(result['primaryError']['message'], 'original')
        self.assertEqual(result['restorationError']['message'], 'restoration')

    def test_version_failure_retains_primary_and_restoration_errors(self):
        code, result = self.verdict(OSError('original'), ValueError('restoration'),
                                    version_error=OSError('version unavailable'))
        self.assertEqual((code, result['status']), (1, 'failed'))
        self.assertEqual(result['primaryError']['message'], 'original')
        self.assertEqual(result['restorationError']['message'], 'restoration')
        self.assertEqual(result['diagnosticErrors']['npm']['message'], 'version unavailable')
        self.assertEqual(result['node'], 'fixture-node')
        self.assertIsNone(result['npm'])

    def test_version_failure_cannot_pass_and_version_interruption_is_unknown(self):
        code, result = self.verdict(version_error=OSError('version unavailable'))
        self.assertEqual((code, result['status']), (1, 'failed'))
        code, result = self.verdict(version_error=KeyboardInterrupt())
        self.assertEqual((code, result['status']), (1, 'unknown-interrupted'))

    def test_interruption_is_unknown_and_missing_gate_cannot_pass(self):
        code, result = self.verdict(KeyboardInterrupt())
        self.assertEqual((code, result['status']), (1, 'unknown-interrupted'))
        code, result = self.verdict(missing_gate=True)
        self.assertEqual((code, result['status']), (1, 'failed'))
        self.assertIn('gate census', result['primaryError']['message'])

    def test_complete_fixture_verdict_keeps_registry_and_whole_producer_false(self):
        code, result = self.verdict()
        self.assertEqual((code, result['status']), (0, 'passed'))
        self.assertFalse(result['ordinaryRegistryReady'])
        self.assertFalse(result['producerWholeCIReady'])


if __name__ == '__main__': unittest.main()

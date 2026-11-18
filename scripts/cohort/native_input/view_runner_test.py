import os
from pathlib import Path
import unittest
from unittest.mock import patch
from native_input.view_runner import run_view

ENV = {'GITHUB_REPOSITORY': 'footprintjs/hcifootprint', 'GITHUB_RUN_ID': '123',
       'GITHUB_RUN_ATTEMPT': '1', 'HCI_VIEW_NODE': '22',
       'HCI_EXECUTORS_RESULT': 'success', 'GH_TOKEN': 'inert-workflow-fixture'}
SOURCE = {'repository': 'footprintjs/hcifootprint', 'head': 'a' * 40,
          'base': 'b' * 40, 'tree': 'c' * 40}


class ViewRunnerTests(unittest.TestCase):
    def test_current_source_context_is_bound_and_token_ends_before_validation(self):
        def validate(bundle, expected, context, view):
            self.assertNotIn('GH_TOKEN', os.environ)
            self.assertEqual(context['source'], SOURCE)
            self.assertEqual(context['tested'], {'head': 'a' * 40, 'tree': 'c' * 40})
            self.assertEqual(context['executor'], {'job': 'native-source', 'nodeMajor': '22'})
            self.assertEqual((context['workflowRun'], context['workflowAttempt']), ('123', '1'))
            self.assertEqual((bundle, expected, view), ({'inert': b'fixture'}, {'qualified': 'fixture'}, 'docs'))
            return {'inert': 'summary fixture only'}
        with patch.dict(os.environ, ENV), \
             patch('native_input.view_runner.preflight_native', return_value=(Path('/inert/source'), SOURCE, {'qualified': 'fixture'})), \
             patch('native_input.view_runner.fetch_proof', return_value=({'inert': b'fixture'}, {'inert': 'provider fixture'})) as fetch, \
             patch('native_input.view_runner.verify_view', side_effect=validate):
            result = run_view(Path('/inert/source'), 'docs')
            self.assertEqual(result['proof'], {'inert': 'summary fixture only'})
            self.assertEqual(fetch.call_args.args[1], 'inert-workflow-fixture')
            self.assertEqual(fetch.call_count, 1)

    def test_refused_metadata_or_failed_cancelled_skipped_executor_never_fetches(self):
        with patch.dict(os.environ, ENV), \
             patch('native_input.view_runner.preflight_native', side_effect=ValueError('changed source')), \
             patch('native_input.view_runner.fetch_proof') as fetch:
            self.assertRaisesRegex(ValueError, 'changed source', run_view, Path('/inert/source'), 'test')
            fetch.assert_not_called()
            self.assertEqual(os.environ['GH_TOKEN'], ENV['GH_TOKEN'])
        for outcome in ['failure', 'cancelled', 'skipped', '', 'unknown']:
            with patch.dict(os.environ, {**ENV, 'HCI_EXECUTORS_RESULT': outcome}), \
                 patch('native_input.view_runner.preflight_native', return_value=(Path('/inert/source'), SOURCE, {})), \
                 patch('native_input.view_runner.fetch_proof') as fetch:
                self.assertRaises(ValueError, run_view, Path('/inert/source'), 'test')
                fetch.assert_not_called()
                self.assertEqual(os.environ['GH_TOKEN'], ENV['GH_TOKEN'])

    def test_selectors_foreign_repo_and_unknown_run_context_refuse(self):
        faults = [('GITHUB_REPOSITORY', 'other/repo'), ('GITHUB_RUN_ID', '0'),
                  ('GITHUB_RUN_ATTEMPT', '\u0661'), ('HCI_VIEW_NODE', 'latest'), ('HCI_VIEW_NODE', '24')]
        for name, value in faults:
            with patch.dict(os.environ, {**ENV, name: value}), \
                 patch('native_input.view_runner.preflight_native', return_value=(Path('/inert/source'), SOURCE, {})), \
                 patch('native_input.view_runner.fetch_proof') as fetch:
                self.assertRaises(ValueError, run_view, Path('/inert/source'), 'docs')
                fetch.assert_not_called()
        self.assertRaises(ValueError, run_view, Path('/inert/source'), 'caller-command')

    def test_original_transport_failure_survives_without_retry_or_token_retention(self):
        failure = OSError('inert original transport error')
        with patch.dict(os.environ, ENV), \
             patch('native_input.view_runner.preflight_native', return_value=(Path('/inert/source'), SOURCE, {})), \
             patch('native_input.view_runner.fetch_proof', side_effect=failure) as fetch:
            with self.assertRaises(OSError) as error: run_view(Path('/inert/source'), 'test')
            self.assertIs(error.exception, failure)
            self.assertEqual(fetch.call_count, 1)
            self.assertNotIn('GH_TOKEN', os.environ)


if __name__ == '__main__': unittest.main()

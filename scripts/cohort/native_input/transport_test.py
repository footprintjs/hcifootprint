import copy
import unittest
import io
import urllib.error
from unittest.mock import patch
from native_input.transport import fetch_candidate, validate_provider


def fixture():
    expected = {
        'status': 'NATIVE_SOURCE_READY', 'repository': 'footprintjs/agentfootprint', 'repositoryId': 42,
        'source': {'head': 'a' * 40},
        'run': {'id': 7, 'run_attempt': 1, 'workflow_id': 8,
                'event': 'pull_request', 'head_branch': 'candidate', 'conclusion': 'failure'},
        'sourceJob': {'id': 9, 'name': 'package'},
        'heldProducerJob': {'id': 10, 'name': 'docs'},
        'sourceArtifact': {'id': 11, 'name': 'original', 'size_in_bytes': 12,
                           'digest': 'sha256:' + 'b' * 64, 'expired': False}}
    run = {**expected['run'], 'head_sha': 'a' * 40, 'status': 'completed', 'repository': {'id': 42}}
    jobs = {'total_count': 2, 'jobs': [
        {'id': 9, 'name': 'package', 'status': 'completed', 'conclusion': 'success'},
        {'id': 10, 'name': 'docs', 'status': 'completed', 'conclusion': 'failure'}]}
    artifact = {**expected['sourceArtifact'], 'workflow_run': {'id': 7, 'head_sha': 'a' * 40, 'repository_id': 42}}
    return expected, run, jobs, artifact


class ProviderTests(unittest.TestCase):
    def test_named_held_job_must_be_present_in_the_actual_run(self):
        values = fixture(); values[2]['jobs'].pop(); values[2]['total_count'] = 1
        with self.assertRaises(ValueError): validate_provider(*values)
    def test_repository_identity_is_not_inferred_from_mutable_name(self):
        values = fixture(); values[1]['repository']['id'] = 99
        with self.assertRaises(ValueError): validate_provider(*values)
        values = fixture(); values[3]['workflow_run']['repository_id'] = 99
        with self.assertRaises(ValueError): validate_provider(*values)

    def test_data_or_forbidden_transport_has_no_retry_or_fallback(self):
        values = fixture(); values[0]['status'] = 'DATA_ONLY'
        with patch('native_input.transport._json') as read:
            with self.assertRaises(ValueError): fetch_candidate(values[0], 'fixture-token')
            read.assert_not_called()
        values = fixture()
        forbidden = urllib.error.HTTPError('https://api.github.com/fixture', 403, 'Forbidden', {}, None)
        with patch('native_input.transport._json', side_effect=forbidden) as read:
            with self.assertRaises(urllib.error.HTTPError): fetch_candidate(values[0], 'fixture-token')
            self.assertEqual(read.call_count, 1)

    def test_signed_asset_read_does_not_forward_api_authorization(self):
        values = fixture()
        redirect = urllib.error.HTTPError('https://api.github.com/fixture', 302, 'Found',
                                         {'Location': 'https://assets.invalid/original'}, None)
        with patch('native_input.transport._json', side_effect=list(values[1:])), \
             patch('native_input.transport.urllib.request.build_opener') as factory, \
             patch('native_input.transport.urllib.request.urlopen', return_value=io.BytesIO(b'original')) as asset:
            factory.return_value.open.side_effect = redirect
            raw, proof = fetch_candidate(values[0], 'fixture-token')
            self.assertEqual(raw, b'original')
            asset.assert_called_once_with('https://assets.invalid/original')
            self.assertFalse(proof['wholeProducerCI'])
    def test_named_cycle_is_explicitly_not_full_ci(self):
        proof = validate_provider(*fixture())
        self.assertFalse(proof['wholeProducerCI'])
        self.assertEqual(proof['retainedDocumentationHold']['id'], 10)

    def test_wrong_run_conclusion_refuses(self):
        values = fixture()
        values[1]['conclusion'] = 'cancelled'
        with self.assertRaises(ValueError):
            validate_provider(*values)

    def test_all_other_failed_or_unknown_jobs_refuse(self):
        for conclusion in ['failure', 'cancelled', 'skipped', None]:
            values = fixture()
            values[2]['jobs'].append({'id': 12, 'name': 'records',
                                      'status': 'completed', 'conclusion': conclusion})
            values[2]['total_count'] += 1
            with self.assertRaisesRegex(ValueError, 'outside named'):
                validate_provider(*values)

    def test_data_only_and_unfinished_or_partial_job_pages_refuse(self):
        for change in ['data', 'pending', 'partial', 'missing-source']:
            values = fixture()
            if change == 'data': values[0]['status'] = 'DATA_ONLY'
            if change == 'pending': values[2]['jobs'][1]['status'] = 'in_progress'
            if change == 'partial': values[2]['total_count'] += 1
            if change == 'missing-source': values[2]['jobs'][0]['id'] = 99
            with self.assertRaises(ValueError): validate_provider(*values)

    def test_run_and_artifact_identity_mismatch_refuse(self):
        for target, key, value in [(1, 'head_sha', 'c' * 40), (1, 'id', 77),
                                   (1, 'run_attempt', 2), (3, 'expired', True),
                                   (3, 'id', 77), (3, 'digest', 'changed')]:
            values = fixture(); values[target][key] = value
            with self.assertRaises(ValueError): validate_provider(*values)
        values = fixture(); values[3]['workflow_run']['head_sha'] = 'c' * 40
        with self.assertRaises(ValueError): validate_provider(*values)


if __name__ == '__main__': unittest.main()

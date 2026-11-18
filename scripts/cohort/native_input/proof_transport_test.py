"""Inert provider/ZIP fixtures; never contacts GitHub or executes proof data."""
import copy
import hashlib
import io
import json
import stat
import struct
import unittest
import urllib.error
import warnings
import zipfile
from unittest.mock import patch

from native_input import proof_transport as transport


def archive(items=None):
    items = items if items is not None else [
        ('proof/native-result.json', b'{"inert":true}', stat.S_IFREG),
        ('proof/proof-seal.json', b'{"inertSeal":true}', stat.S_IFREG),
        ('proof/one.log', b'proof log\n', stat.S_IFREG),
        ('inputs/original-source.zip', b'never opened or extracted', stat.S_IFREG),
        ('pack/hcifootprint.tgz', b'never opened or executed', stat.S_IFREG),
        ('npm-cache/_logs/npm.log', b'diagnostic only', stat.S_IFREG)]
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as stream:
        for name, body, kind in items:
            info = zipfile.ZipInfo(name)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (kind | 0o644) << 16
            with warnings.catch_warnings():
                warnings.simplefilter('ignore', UserWarning)
                stream.writestr(info, body)
    return output.getvalue()


def fixture(raw=None):
    raw = archive() if raw is None else raw
    head = 'a' * 40
    context = {'source': {'repository': 'footprintjs/hcifootprint', 'head': head,
                         'base': 'b' * 40, 'tree': 'c' * 40},
               'tested': {'head': head, 'tree': 'c' * 40},
               'workflowRun': '42', 'workflowAttempt': '1',
               'executor': {'job': 'native-source', 'nodeMajor': '24'}}
    run = {'id': 42, 'run_attempt': 1, 'workflow_id': 8,
           'name': 'Native source cohort', 'path': '.github/workflows/native-cohort.yml',
           'head_sha': head, 'repository': {'id': 1287419920, 'full_name': 'footprintjs/hcifootprint'},
           'status': 'in_progress', 'conclusion': None}
    attempt = copy.deepcopy(run)
    jobs = {'total_count': 1, 'jobs': [
        {'id': 9, 'run_id': 42, 'run_attempt': 1, 'head_sha': head,
         'name': 'native-source (24)', 'status': 'completed', 'conclusion': 'success',
         'started_at': '2026-11-18T01:00:00Z', 'completed_at': '2026-11-18T01:10:00Z'}]}
    artifact = {'id': 10, 'name': 'hcifootprint-native-24-' + head, 'expired': False,
                'size_in_bytes': len(raw), 'digest': 'sha256:' + hashlib.sha256(raw).hexdigest(),
                'created_at': '2026-11-18T01:09:00Z',
                'workflow_run': {'id': 42, 'head_sha': head, 'repository_id': 1287419920}}
    return {'context': context, 'run': run, 'attempt': attempt, 'jobs': jobs,
            'artifacts': {'total_count': 1, 'artifacts': [artifact]}, 'raw': raw}


class TransportTests(unittest.TestCase):
    def fetch(self, values, token='inert-token-never-return'):
        with patch.object(transport, '_json', side_effect=[values[k] for k in ['run', 'attempt', 'jobs', 'artifacts']]) as metadata, \
                patch.object(transport.urllib.request, 'build_opener') as opener:
            opener.return_value.open.return_value = io.BytesIO(values['raw'])
            result = transport.fetch_proof(values['context'], token)
        return result, metadata, opener

    def refused(self, mutate):
        values = fixture(); mutate(values)
        with self.assertRaises(ValueError): self.fetch(values)

    def test_exact_current_attempt_and_successful_node_job_read_proof_only(self):
        values = fixture(); before = copy.deepcopy(values)
        (bundle, facts), metadata, opener = self.fetch(values)
        self.assertEqual(bundle, {'native-result.json': b'{"inert":true}',
                                 'proof-seal.json': b'{"inertSeal":true}', 'one.log': b'proof log\n'})
        self.assertEqual(facts['artifact']['id'], 10)
        self.assertEqual(facts['executor']['nodeMajor'], '24')
        self.assertEqual(facts['executor']['jobId'], 9)
        self.assertFalse(facts['wholeWorkflowReady'])
        self.assertEqual(metadata.call_count, 4)
        self.assertEqual([call.args[0] for call in metadata.call_args_list], [
            'repos/footprintjs/hcifootprint/actions/runs/42',
            'repos/footprintjs/hcifootprint/actions/runs/42/attempts/1',
            'repos/footprintjs/hcifootprint/actions/runs/42/attempts/1/jobs?per_page=100',
            'repos/footprintjs/hcifootprint/actions/runs/42/artifacts?per_page=100'])
        opener.return_value.open.assert_called_once()
        self.assertNotIn('inert-token-never-return', json.dumps(facts))
        self.assertEqual(values, before)

    def test_other_workflow_jobs_may_still_be_running_or_fail_without_false_whole_ci_claim(self):
        values = fixture()
        for key in ['run', 'attempt']:
            values[key].update(status='completed', conclusion='failure')
        (bundle, facts), _, _ = self.fetch(values)
        self.assertIn('native-result.json', bundle)
        self.assertFalse(facts['wholeWorkflowReady'])

    def test_node22_role_is_bound_in_job_and_artifact_name(self):
        values = fixture(); values['context']['executor']['nodeMajor'] = '22'
        values['jobs']['jobs'][0]['name'] = 'native-source (22)'
        values['artifacts']['artifacts'][0]['name'] = 'hcifootprint-native-22-' + 'a' * 40
        self.assertEqual(self.fetch(values)[0][1]['executor']['nodeMajor'], '22')

    def test_bad_context_or_missing_token_refuses_before_provider(self):
        mutations = [lambda c: c.update(workflowRun='0'), lambda c: c.update(workflowAttempt='01'),
                     lambda c: c.update(workflowRun='\u0661'), lambda c: c.update(callback='not allowed'),
                     lambda c: c['source'].update(repository='other/repo'),
                     lambda c: c['source'].update(head='bad'),
                     lambda c: c['executor'].update(nodeMajor=24),
                     lambda c: c['executor'].update(job='other')]
        for mutate in mutations:
            values = fixture(); mutate(values['context'])
            with patch.object(transport, '_json') as read:
                self.assertRaises(ValueError, transport.fetch_proof, values['context'], 'inert')
                read.assert_not_called()
        with patch.object(transport, '_json') as read:
            self.assertRaises(ValueError, transport.fetch_proof, fixture()['context'], '')
            read.assert_not_called()

    def test_run_attempt_and_workflow_owner_fields_cannot_drift(self):
        for section, key, value in [('run', 'id', 43), ('run', 'run_attempt', 2),
            ('attempt', 'run_attempt', 2), ('attempt', 'head_sha', 'b' * 40),
            ('run', 'path', '.github/workflows/other.yml'), ('run', 'name', 'other'),
            ('run', 'status', 'queued'), ('run', 'conclusion', {'unexpected': 'metadata'}),
            ('attempt', 'workflow_id', 99)]:
            with self.subTest(section=section, key=key):
                self.refused(lambda f: f[section].update({key: value}))
        self.refused(lambda f: f['run']['repository'].update(id=1))
        self.refused(lambda f: f['attempt']['repository'].update(full_name='other/repo'))

    def test_exact_successful_job_and_complete_unique_pages_required(self):
        for key, value in [('name', 'native-source (22)'), ('status', 'in_progress'),
                           ('conclusion', 'failure'), ('conclusion', 'skipped'),
                           ('run_id', 43), ('run_attempt', 2), ('head_sha', 'b' * 40)]:
            self.refused(lambda f: f['jobs']['jobs'][0].update({key: value}))
        self.refused(lambda f: f['jobs'].update(total_count=2))
        self.refused(lambda f: f['jobs'].update(total_count=True))
        self.refused(lambda f: f['jobs']['jobs'].append(copy.deepcopy(f['jobs']['jobs'][0])))
        self.refused(lambda f: f['artifacts'].update(total_count=2))
        self.refused(lambda f: f['jobs'].update(total_count=101))
        for field, rows in [('jobs', 'jobs'), ('artifacts', 'artifacts')]:
            def balanced_duplicate(f):
                f[field][rows].append(copy.deepcopy(f[field][rows][0]))
                f[field]['total_count'] = 2
            self.refused(balanced_duplicate)
            def duplicate_with_another_name(f):
                f[field][rows].append({**f[field][rows][0], 'name': 'other'})
                f[field]['total_count'] = 2
            self.refused(duplicate_with_another_name)
        def ambiguous_job(f):
            f['jobs']['jobs'].append({**f['jobs']['jobs'][0], 'id': 11})
            f['jobs']['total_count'] = 2
        self.refused(ambiguous_job)
        def ambiguous_artifact(f):
            f['artifacts']['artifacts'].append({**f['artifacts']['artifacts'][0], 'id': 11})
            f['artifacts']['total_count'] = 2
        self.refused(ambiguous_artifact)

    def test_artifact_uniqueness_owner_expiry_hash_and_attempt_time_required(self):
        for key, value in [('name', 'other'), ('expired', True), ('expired', 0),
                           ('digest', None), ('digest', 'sha1:wrong'), ('size_in_bytes', True),
                           ('created_at', '2026-11-18T00:59:59Z'),
                           ('created_at', '2026-11-18T01:10:01Z')]:
            self.refused(lambda f: f['artifacts']['artifacts'][0].update({key: value}))
        for key, value in [('id', 43), ('repository_id', 99), ('head_sha', 'b' * 40)]:
            self.refused(lambda f: f['artifacts']['artifacts'][0]['workflow_run'].update({key: value}))
        self.refused(lambda f: f['artifacts']['artifacts'].append(copy.deepcopy(f['artifacts']['artifacts'][0])))

    def test_http_failures_are_the_original_unknown_error_without_retry(self):
        values = fixture()
        for status in [403, 404]:
            error = urllib.error.HTTPError('https://api.github.com/inert', status, 'fixture', {}, None)
            self.addCleanup(error.close)
            with patch.object(transport, '_json', side_effect=error) as read:
                with self.assertRaises(urllib.error.HTTPError) as caught:
                    transport.fetch_proof(values['context'], 'inert')
                self.assertIs(caught.exception, error)
                self.assertEqual(read.call_count, 1)

    def test_signed_redirect_drops_api_authorization_and_never_enters_provider_facts(self):
        values = fixture(); signed = 'https://assets.invalid/proof?secret=inert-signed-url'
        redirect = urllib.error.HTTPError('https://api.github.com/inert', 302, 'Found', {'Location': signed}, None)
        self.addCleanup(redirect.close)
        with patch.object(transport, '_json', side_effect=[values[k] for k in ['run', 'attempt', 'jobs', 'artifacts']]), \
                patch.object(transport.urllib.request, 'build_opener') as factory, \
                patch.object(transport.urllib.request, 'urlopen', return_value=io.BytesIO(values['raw'])) as asset:
            factory.return_value.open.side_effect = redirect
            bundle, facts = transport.fetch_proof(values['context'], 'inert-token-never-return')
            request = factory.return_value.open.call_args.args[0]
            self.assertEqual(request.get_header('Authorization'), 'Bearer inert-token-never-return')
            asset.assert_called_once_with(signed)
            self.assertNotIn(signed, json.dumps(facts))
            self.assertNotIn('inert-token-never-return', json.dumps(facts))
            self.assertIn('native-result.json', bundle)

    def test_invalid_asset_redirect_or_download_error_has_no_fallback(self):
        values = fixture()
        for location in ['http://assets.invalid/proof', 'https://user:pass@assets.invalid/proof', '']:
            redirect = urllib.error.HTTPError('https://api.github.com/inert', 302, 'Found', {'Location': location}, None)
            self.addCleanup(redirect.close)
            with patch.object(transport, '_json', side_effect=[values[k] for k in ['run', 'attempt', 'jobs', 'artifacts']]), \
                    patch.object(transport.urllib.request, 'build_opener') as factory, \
                    patch.object(transport.urllib.request, 'urlopen') as asset:
                factory.return_value.open.side_effect = redirect
                self.assertRaises(ValueError, transport.fetch_proof, values['context'], 'inert')
                asset.assert_not_called()

    def test_original_api_download_and_asset_errors_propagate_once(self):
        values = fixture()
        for stage in ['api', 'asset', 'api-http', 'asset-http']:
            error = urllib.error.URLError('inert original failure') if not stage.endswith('-http') else (
                urllib.error.HTTPError('https://provider.invalid/inert', 403, 'inert original failure', {}, None))
            if isinstance(error, urllib.error.HTTPError): self.addCleanup(error.close)
            redirect = urllib.error.HTTPError('https://api.github.com/inert', 302, 'Found',
                                              {'Location': 'https://assets.invalid/proof'}, None)
            self.addCleanup(redirect.close)
            with patch.object(transport, '_json', side_effect=[values[k] for k in ['run', 'attempt', 'jobs', 'artifacts']]), \
                    patch.object(transport.urllib.request, 'build_opener') as factory, \
                    patch.object(transport.urllib.request, 'urlopen') as asset:
                factory.return_value.open.side_effect = error if stage.startswith('api') else redirect
                asset.side_effect = error
                with self.assertRaises(urllib.error.URLError) as caught:
                    transport.fetch_proof(values['context'], 'inert')
                self.assertIs(caught.exception, error)
                factory.return_value.open.assert_called_once()
                self.assertEqual(asset.call_count, 0 if stage.startswith('api') else 1)

    def test_outer_bytes_are_bound_before_zip_parsing(self):
        for field, value in [('digest', 'sha256:' + '0' * 64), ('size_in_bytes', 1)]:
            values = fixture(); values['artifacts']['artifacts'][0][field] = value
            with patch.object(transport.zipfile, 'ZipFile', side_effect=AssertionError('ZIP parsed before digest')):
                self.assertRaises(ValueError, self.fetch, values)

    def test_zip_names_links_nonfiles_and_nested_proof_are_refused(self):
        for name, kind in [('../escape', stat.S_IFREG), ('/proof/a.json', stat.S_IFREG),
                           ('proof/a\\b.json', stat.S_IFREG), ('proof/../a.json', stat.S_IFREG),
                           ('proof/sub/a.json', stat.S_IFREG), ('proof/a.py', stat.S_IFREG),
                           ('unknown/a.json', stat.S_IFREG), ('proof/a.json', stat.S_IFLNK),
                           ('proof/a.json', stat.S_IFDIR), ('proof/a.json', stat.S_IFIFO)]:
            with self.subTest(name=name, kind=kind):
                self.assertRaises(ValueError, self.fetch, fixture(archive([(name, b'inert', kind)])))
        duplicate = archive([('proof/a.json', b'a', stat.S_IFREG), ('proof/a.json', b'b', stat.S_IFREG)])
        self.assertRaises(ValueError, self.fetch, fixture(duplicate))

    def test_unknown_zip_flags_are_refused_even_on_unread_nonproof_members(self):
        raw = bytearray(archive())
        cursor = 0
        while True:
            cursor = raw.find(b'PK\x01\x02', cursor)
            if cursor < 0: break
            flags = struct.unpack_from('<H', raw, cursor + 8)[0]
            struct.pack_into('<H', raw, cursor + 8, flags | 0x40)
            cursor += 4
        self.assertRaises(ValueError, self.fetch, fixture(bytes(raw)))

    def test_unread_member_local_header_name_and_flags_must_match_central_directory(self):
        for field in ['name', 'flags']:
            raw = bytearray(archive())
            with zipfile.ZipFile(io.BytesIO(raw)) as stream:
                info = stream.getinfo('inputs/original-source.zip')
            if field == 'name':
                raw[info.header_offset + 30] = ord('/')
            else:
                struct.pack_into('<H', raw, info.header_offset + 6, info.flag_bits | 0x40)
            self.assertRaises(ValueError, self.fetch, fixture(bytes(raw)))

    def test_zip_and_proof_expansion_limits_refuse(self):
        values = fixture()
        for name, limit in [('MAX_ZIP_BYTES', len(values['raw']) - 1), ('MAX_FILE', 1),
                            ('MAX_TOTAL', 1), ('MAX_FILES', 2), ('MAX_ARCHIVE_MEMBERS', 2)]:
            with self.subTest(bound=name), patch.object(transport, name, limit):
                self.assertRaises(ValueError, self.fetch, values)

    def test_nonproof_members_are_never_inflated_and_nothing_is_extracted(self):
        values = fixture()
        original = zipfile.ZipFile.open
        opened = []
        def only_proof(stream, member, *args, **kwargs):
            name = member.filename if isinstance(member, zipfile.ZipInfo) else member
            self.assertTrue(name.startswith('proof/'))
            opened.append(name)
            return original(stream, member, *args, **kwargs)
        with patch.object(zipfile.ZipFile, 'open', only_proof), \
                patch.object(zipfile.ZipFile, 'extract', side_effect=AssertionError('extract')), \
                patch.object(zipfile.ZipFile, 'extractall', side_effect=AssertionError('extractall')):
            self.fetch(values)
        self.assertEqual(len(opened), 3)


if __name__ == '__main__': unittest.main()

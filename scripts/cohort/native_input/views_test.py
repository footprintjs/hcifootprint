"""SMALL SYNTHETIC proof fixtures; never an actual CI or compatibility claim."""
import base64
import copy
import hashlib
import json
import unittest
from native_input.gates import REQUIRED
from native_input.views import verify_view
from native_input.command_contract_test import command_fixture


ORIGINALS = ('package.json', 'package-lock.json', 'demos/live-desk/package.json',
             'demos/onboarding-wizard/package.json', 'docs-next/package.json',
             'docs-next/package-lock.json')


def encoded(value):
    return (json.dumps(value, sort_keys=True) + '\n').encode()


def seal(bundle):
    bundle['proof-seal.json'] = encoded({'protocol': 'hcifootprint.native-proof.v1',
        'files': {name: hashlib.sha256(raw).hexdigest() for name, raw in bundle.items()
                  if name != 'proof-seal.json'}})


def fixture(node='22'):
    source = {'repository': 'footprintjs/hcifootprint', 'head': 'a' * 40,
              'base': 'b' * 40, 'tree': 'c' * 40}
    context = {'source': source, 'tested': {'head': 'd' * 40, 'tree': 'e' * 40},
               'workflowRun': '123', 'workflowAttempt': '1',
               'executor': {'job': 'native-source', 'nodeMajor': node}}
    rows, command_input, pack = command_fixture()
    expected = {'protocol': 'hcifootprint.native-input.v2', 'status': 'NATIVE_SOURCE_READY',
                'registryTargetSha256': '1' * 64, 'qualifiedTupleSha256': '2' * 64,
                'independentReviewSha256': '3' * 64, 'SYNTHETIC': True, **command_input}
    result = {'protocol': 'hcifootprint.native-result.v2', 'status': 'passed',
              'primaryError': None, 'restorationError': None, 'diagnosticErrors': {},
              'node': 'v' + node + '.20.0', 'npm': '11.19.1', 'python': 'SYNTHETIC interpreter',
              **copy.deepcopy(context), 'input': copy.deepcopy(expected), 'commands': rows,
              'ordinaryRegistryReady': False, 'producerWholeCIReady': False}
    bundle = {'native-result.json': encoded(result), 'hci-pack.json': encoded(pack)}
    guard = {'matchesExpected': True, 'sourceInventorySha256': '4' * 64}
    for row in rows:
        name = row['label']
        bundle[name + '-result.json'] = encoded(row)
        bundle[name + '.log'] = b'SYNTHETIC raw log, not actual command proof\xff\n'
        for phase in ['before', 'after']:
            bundle[name + '-' + phase + '-guard.json'] = encoded(guard)
    bundle['all-native-gates-complete-guard.json'] = encoded(guard)
    raw = b'{"SYNTHETIC":true}\n'
    originals = {name: {'base64': base64.b64encode(raw).decode(), 'mode': 0o644}
                 for name in ORIGINALS}
    baseline = {'.': {'kind': 'directory', 'mode': 0o755}}
    baseline.update({name: {'kind': 'file', 'bytes': len(raw),
        'sha256': hashlib.sha256(raw).hexdigest(), 'mode': 0o644} for name in ORIGINALS})
    bundle.update({'source-originals.json': encoded(originals),
                   'source-baseline.json': encoded(baseline),
                   'source-after-restoration.json': encoded(baseline),
                   'restoration.json': encoded({'authoredAndAbsencesRestored': True,
                                               'installedImagesRetained': []})})
    seal(bundle)
    return bundle, expected, context


class ViewTests(unittest.TestCase):
    def check(self, values, view='test'):
        return verify_view(*values, view)

    def changed_json(self, values, name, change):
        bundle = values[0]
        value = json.loads(bundle[name]); change(value)
        bundle[name] = encoded(value); seal(bundle)

    def result_change(self, values, change):
        self.changed_json(values, 'native-result.json', change)

    def test_all_fixed_views_require_complete_synthetic_proof_without_effect_or_mutation(self):
        for node in ['22', '24']:
            for view in ['test', 'docs', 'docs-links', 'installed-cohort']:
                values = fixture(node); before = copy.deepcopy(values)
                summary = self.check(values, view)
                self.assertEqual(summary['kind'], 'native-source-compatibility')
                self.assertEqual(summary['view'], view)
                self.assertEqual(summary['gateCount'], 29)
                self.assertEqual(summary['executor'], values[2]['executor'])
                self.assertIs(summary['ordinaryRegistryReady'], False)
                self.assertIs(summary['producerWholeCIReady'], False)
                self.assertEqual(values, before)

    def test_unknown_views_and_non_bundle_types_refuse(self):
        for view in ['consumer', '', '../test', None, ['test']]:
            with self.subTest(view=view), self.assertRaises(ValueError): self.check(fixture(), view)
        for bundle in [None, [], {'proof-seal.json': 'text'}]:
            values = fixture(); values = (bundle, *values[1:])
            with self.assertRaises(ValueError): self.check(values)

    def test_seal_missing_extra_unbound_and_changed_files_refuse(self):
        for change in [lambda b: b.pop('proof-seal.json'),
                       lambda b: b.update({'extra.log': b'unbound'}),
                       lambda b: b.pop('typecheck.log'),
                       lambda b: b.update({'typecheck.log': b'changed'})]:
            values = fixture(); change(values[0])
            with self.assertRaises(ValueError): self.check(values)

    def test_seal_protocol_self_reference_and_hash_type_refuse(self):
        for change in [lambda s: s.update(protocol='other'),
                       lambda s: s['files'].update({'proof-seal.json': '0' * 64}),
                       lambda s: s['files'].update({'typecheck.log': True}),
                       lambda s: s.update(extra=True)]:
            values = fixture(); value = json.loads(values[0]['proof-seal.json']); change(value)
            values[0]['proof-seal.json'] = encoded(value)
            with self.assertRaises(ValueError): self.check(values)

    def test_unsafe_proof_names_refuse_even_when_sealed(self):
        for name in ['../outside', '/absolute', 'a/b', 'a\\b', '.', '..', '', 'nul\x00.log']:
            values = fixture(); values[0][name] = b'inert'; seal(values[0])
            with self.subTest(name=name), self.assertRaises(ValueError): self.check(values)

    def test_every_json_rejects_duplicate_keys_nonfinite_invalid_or_nonjson(self):
        for raw in [b'{"x":1,"x":2}', b'{"x":NaN}', b'{"x":Infinity}', b'{"x":1e999}',
                    b'not-json', b'\xff']:
            values = fixture(); values[0]['extra.json'] = raw; seal(values[0])
            with self.subTest(raw=raw), self.assertRaises(ValueError): self.check(values)
        values = fixture()
        values[0]['proof-seal.json'] = b'{"protocol":"hcifootprint.native-proof.v1","files":{},"files":{}}'
        with self.assertRaises(ValueError): self.check(values)

    def test_file_and_total_bounds_refuse_before_parsing(self):
        values = fixture(); values[0]['oversized.log'] = bytes(16 * 1024 * 1024 + 1)
        with self.assertRaises(ValueError): self.check(values)
        values = fixture(); block = bytes(16 * 1024 * 1024)
        values[0].update({str(i) + '.log': block for i in range(5)})
        with self.assertRaises(ValueError): self.check(values)

    def test_native_result_protocol_status_and_errors_refuse(self):
        for key, value in [('protocol', 'hcifootprint.native-result.v1'), ('status', 'unknown-interrupted'),
                           ('status', 'failed'), ('primaryError', {'message': 'failure'}),
                           ('restorationError', 'failed'), ('diagnosticErrors', {'npm': 'missing'}),
                           ('evidenceError', 'lost'), ('ordinaryRegistryReady', True),
                           ('ordinaryRegistryReady', 0), ('producerWholeCIReady', True)]:
            values = fixture(); self.result_change(values, lambda r: r.update({key: value}))
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): self.check(values)

    def test_exact_source_tested_run_attempt_executor_and_versions_refuse_drift(self):
        for change in [lambda r: r['source'].update(head='f' * 40),
                       lambda r: r['source'].update(base='f' * 40),
                       lambda r: r['source'].update(tree='f' * 40),
                       lambda r: r['tested'].update(head='f' * 40),
                       lambda r: r['tested'].update(tree='f' * 40),
                       lambda r: r.update(workflowRun='124'),
                       lambda r: r.update(workflowAttempt='2'),
                       lambda r: r['executor'].update(job='other'),
                       lambda r: r['executor'].update(nodeMajor='24'),
                       lambda r: r.update(node='v24.20.0'), lambda r: r.update(node='22.20.0'),
                       lambda r: r.update(npm='11.19.2')]:
            values = fixture(); self.result_change(values, change)
            with self.assertRaises(ValueError): self.check(values)

    def test_context_is_closed_and_well_typed(self):
        for change in [lambda c: c.update(extra=True), lambda c: c.update(workflowRun=123),
                       lambda c: c.update(workflowAttempt='0'),
                       lambda c: c['source'].update(repository='other/repo'),
                       lambda c: c['tested'].update(tree='short'),
                       lambda c: c['executor'].update(nodeMajor='23')]:
            values = fixture(); change(values[2])
            with self.assertRaises(ValueError): self.check(values)

    def test_input_must_match_every_qualification_field_with_exact_json_types(self):
        for key, value in [('registryTargetSha256', '0' * 64), ('qualifiedTupleSha256', '0' * 64),
                           ('independentReviewSha256', '0' * 64), ('SYNTHETIC', 1), ('extra', True)]:
            values = fixture(); self.result_change(values, lambda r: r['input'].update({key: value}))
            with self.subTest(key=key), self.assertRaises(ValueError): self.check(values)

    def test_every_missing_reordered_duplicate_or_failed_gate_refuses_all_views(self):
        for label in REQUIRED:
            values = fixture()
            self.result_change(values, lambda r: r.update(commands=[v for v in r['commands'] if v['label'] != label]))
            with self.subTest(label=label), self.assertRaises(ValueError): self.check(values, 'docs-links')
        for change in [lambda r: r['commands'].reverse(),
                       lambda r: r['commands'].append(copy.deepcopy(r['commands'][0])),
                       lambda r: r['commands'][0].update(exit=1),
                       lambda r: r['commands'][0].update(afterGuardError='mismatch')]:
            values = fixture(); self.result_change(values, change)
            with self.assertRaises(ValueError): self.check(values)

    def test_per_command_result_and_log_are_mandatory_and_exact(self):
        for name in ['typecheck-result.json', 'typecheck.log']:
            values = fixture(); values[0].pop(name); seal(values[0])
            with self.assertRaises(ValueError): self.check(values)
        values = fixture()
        self.changed_json(values, 'typecheck-result.json', lambda r: r.update(argv=['wrong']))
        with self.assertRaises(ValueError): self.check(values)

    def test_resealed_self_consistent_wrong_commands_refuse_for_all_29_gates(self):
        for index in range(29):
            for key, value in [('argv', ['true']), ('cwd', '/unrelated')]:
                values = fixture(); result = json.loads(values[0]['native-result.json'])
                row = result['commands'][index]; row[key] = value
                values[0]['native-result.json'] = encoded(result)
                values[0][row['label'] + '-result.json'] = encoded(row); seal(values[0])
                with self.subTest(label=row['label'], key=key), self.assertRaises(ValueError): self.check(values)

    def test_actual_pack_semantic_facts_are_required_for_command_binding(self):
        values = fixture(); values[0].pop('hci-pack.json'); seal(values[0])
        with self.assertRaises(ValueError): self.check(values)
        values = fixture()
        self.changed_json(values, 'hci-pack.json', lambda p: p['archive'].update(filename='../outside.tgz'))
        with self.assertRaises(ValueError): self.check(values)

    def test_every_guard_is_mandatory_true_and_well_formed(self):
        for name in ['typecheck-before-guard.json', 'typecheck-after-guard.json',
                     'all-native-gates-complete-guard.json']:
            values = fixture(); values[0].pop(name); seal(values[0])
            with self.subTest(name=name), self.assertRaises(ValueError): self.check(values)
        for value in [False, 1, None]:
            values = fixture()
            self.changed_json(values, 'typecheck-before-guard.json', lambda g: g.update(matchesExpected=value))
            with self.assertRaises(ValueError): self.check(values)
        values = fixture(); values[0]['unexpected-guard.json'] = encoded({'matchesExpected': False}); seal(values[0])
        with self.assertRaises(ValueError): self.check(values)

    def test_restoration_requires_exact_baseline_and_explicit_success(self):
        values = fixture()
        self.changed_json(values, 'source-after-restoration.json', lambda i: i['package.json'].update(mode=0o600))
        with self.assertRaises(ValueError): self.check(values)
        for value in [False, 1, None]:
            values = fixture()
            self.changed_json(values, 'restoration.json', lambda r: r.update(authoredAndAbsencesRestored=value))
            with self.assertRaises(ValueError): self.check(values)

    def test_six_raw_original_roles_must_join_baseline_bytes_hash_and_modes(self):
        for name in ORIGINALS:
            values = fixture(); self.changed_json(values, 'source-originals.json', lambda o: o.pop(name))
            with self.subTest(name=name), self.assertRaises(ValueError): self.check(values)
        for change in [lambda o: o['package.json'].update(base64='invalid!'),
                       lambda o: o['package.json'].update(base64=base64.b64encode(b'other').decode()),
                       lambda o: o['package.json'].update(mode=0o600),
                       lambda o: o.update(extra={'base64': '', 'mode': 0o644})]:
            values = fixture(); self.changed_json(values, 'source-originals.json', change)
            with self.assertRaises(ValueError): self.check(values)


if __name__ == '__main__': unittest.main()

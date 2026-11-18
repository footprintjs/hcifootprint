"""Independent SMALL SYNTHETIC recipe fixtures; no actual campaign evidence."""
import base64
import copy
import hashlib
import unittest
from native_input.command_contract import BADGE_SCRIPT, verify_command_contract


EXPECTED_BADGE = (
    "import{readFileSync as r}from'node:fs';import{checkTestBadge,countTestFiles}from'./scripts/check-test-badge.mjs';"
    "const x=checkTestBadge({readme:r('README.md','utf8'),tally:JSON.parse(r('.test-tally.json','utf8')),testFileCount:countTestFiles()});"
    "if(x.verdict!=='ok')throw Error(JSON.stringify(x));console.log(JSON.stringify(x));"
)
ROOT = '/home/runner/work/hcifootprint/hcifootprint/hci-native/source'
AUDIT = '/home/runner/work/hcifootprint/hcifootprint/hci-native'


def command_fixture():
    # These 29 statements are independent specimens transcribed from the actual
    # recipe. Do not build them with the command-contract implementation itself.
    commands = [
        ('root-lock', ['npm', 'install', '--package-lock-only', '--ignore-scripts', '--strict-peer-deps', '--no-audit', '--no-fund', '--save-prefix=^', 'footprintjs@77.0.0-rc.0', 'foottrace@88.1.0'], ROOT),
        ('docs-lock', ['npm', 'install', '--package-lock-only', '--ignore-scripts', '--strict-peer-deps', '--no-audit', '--no-fund'], ROOT + '/docs-next'),
        ('root-install', ['npm', 'ci', '--strict-peer-deps'], ROOT),
        ('native-pins', ['node', 'scripts/cohort/native_input.mjs', 'pins'], ROOT),
        ('ordinary-pins-refused', ['npm', 'run', 'test:cohort:pins'], ROOT),
        ('cohort-faults', ['npm', 'run', 'test:cohort'], ROOT),
        ('native-fixtures', ['python3', '-m', 'unittest', 'discover', '-s', 'scripts/cohort/native_input', '-p', '*_test.py'], ROOT),
        ('typecheck', ['npm', 'run', 'typecheck'], ROOT),
        ('build', ['npm', 'run', 'build'], ROOT),
        ('library-test', ['npm', 'test'], ROOT),
        ('whole-badge', ['node', '--input-type=module', '-e', EXPECTED_BADGE], ROOT),
        ('coverage', ['npm', 'run', 'test:coverage'], ROOT),
        ('agent-guide', ['npm', 'run', 'docs:agents:check'], ROOT),
        ('docs-toolchain', ['npm', 'run', 'docs:toolchain:check'], ROOT),
        ('live-desk', ['npm', 'run', 'verify', '--workspace', 'live-desk'], ROOT),
        ('onboarding-wizard-demo', ['npm', 'run', 'verify', '--workspace', 'onboarding-wizard-demo'], ROOT),
        ('publint', ['npx', 'publint'], ROOT),
        ('attw', ['npx', '@arethetypeswrong/cli', '--pack', '--profile', 'esm-only'], ROOT),
        ('pack', ['npm', 'pack', '--ignore-scripts', '--pack-destination', AUDIT + '/pack', '--json'], ROOT),
        ('prepare-consumer', ['node', 'scripts/cohort/prepare-consumer.mjs', AUDIT + '/packed-consumer', AUDIT + '/pack/hcifootprint-99.0.0.tgz'], ROOT),
        ('consumer-install', ['npm', 'install', '--ignore-scripts', '--strict-peer-deps', '--no-audit', '--no-fund'], AUDIT + '/packed-consumer'),
        ('consumer-identity', ['npm', 'run', 'check:identity'], AUDIT + '/packed-consumer'),
        ('consumer-types', ['npm', 'run', 'check:types'], AUDIT + '/packed-consumer'),
        ('consumer-runtime', ['npm', 'run', 'check:runtime'], AUDIT + '/packed-consumer'),
        ('docs-install', ['npm', 'ci', '--strict-peer-deps'], ROOT + '/docs-next'),
        ('docs-truth', ['npm', 'run', 'docs:truth:check'], ROOT),
        ('docs-api', ['npm', 'run', 'check:api'], ROOT + '/docs-next'),
        ('docs-build', ['npm', 'run', 'build'], ROOT + '/docs-next'),
        ('docs-links', ['node', 'scripts/check-doc-links.mjs', '--strict'], ROOT),
    ]
    rows = [{'label': label, 'argv': argv, 'cwd': cwd,
             'exit': 1 if label == 'ordinary-pins-refused' else 0,
             'expectedExit': 1 if label == 'ordinary-pins-refused' else 0,
             'afterGuardError': None} for label, argv, cwd in commands]
    expected = {'coreVersions': {'footprintjs': '77.0.0-rc.0', 'foottrace': '88.1.0'}}
    files = [{'path': name, 'size': size, 'mode': 0o644, 'sha256': hashlib.sha256(name.encode()).hexdigest()}
             for name, size in [('LICENSE', 6), ('README.md', 7), ('dist/index.js', 8), ('package.json', 19)]]
    pack = {'kind': 'hci-native-pack-inspection/1', 'nativeReady': False,
            'archive': {'filename': 'hcifootprint-99.0.0.tgz', 'bytes': 100, 'sha256': '1' * 64,
                        'shasum': '2' * 40, 'integrity': 'sha512-' + base64.b64encode(bytes(64)).decode()},
            'package': {'name': 'hcifootprint', 'version': '99.0.0', 'manifestSha256': files[-1]['sha256']},
            'entryCount': 4, 'unpackedSize': 40, 'expandedTarBytes': 10240, 'distFiles': 1, 'files': files}
    return rows, expected, pack


class CommandContractTests(unittest.TestCase):
    def test_independent_synthetic_recipe_passes_without_mutation(self):
        values = command_fixture(); before = copy.deepcopy(values)
        self.assertIsNone(verify_command_contract(*values))
        self.assertEqual(values, before)
        self.assertEqual(BADGE_SCRIPT, EXPECTED_BADGE)

    def test_every_gate_refuses_arbitrary_argv_and_cwd(self):
        for index in range(29):
            for key, value in [('argv', ['true']), ('cwd', '/unrelated')]:
                values = command_fixture(); values[0][index][key] = value
                with self.subTest(label=values[0][index]['label'], key=key), self.assertRaises(ValueError):
                    verify_command_contract(*values)

    def test_flags_inline_script_and_qualified_core_requests_cannot_change(self):
        for label, change in [('root-lock', lambda a: a.remove('--strict-peer-deps')),
                             ('root-lock', lambda a: a.__setitem__(-2, 'footprintjs@76.0.0')),
                             ('whole-badge', lambda a: a.__setitem__(-1, 'console.log("ok")')),
                             ('attw', lambda a: a.__setitem__(-1, 'strict')),
                             ('pack', lambda a: a.__setitem__(-2, '/other/pack')),
                             ('prepare-consumer', lambda a: a.__setitem__(-1, AUDIT + '/pack/other.tgz'))]:
            values = command_fixture(); change(next(r['argv'] for r in values[0] if r['label'] == label))
            with self.subTest(label=label), self.assertRaises(ValueError): verify_command_contract(*values)

    def test_missing_duplicate_reordered_and_failed_commands_refuse(self):
        for change in [lambda r: r.pop(), lambda r: r.append(copy.deepcopy(r[0])),
                       lambda r: r.reverse(), lambda r: r[0].update(exit=1)]:
            values = command_fixture(); change(values[0])
            with self.assertRaises(ValueError): verify_command_contract(*values)

    def test_root_candidate_must_be_canonical_absolute_fixed_layout(self):
        for root in ['relative/hci-native/source', '//host/hci-native/source',
                     ROOT + '/', ROOT.replace('/hci-native/', '/hci-native/./'),
                     ROOT.replace('/hci-native/', '/other/../hci-native/'), '/other/source',
                     ROOT.replace('/hci-native/', '//hci-native/'), ROOT + '\x00']:
            values = command_fixture()
            for row in values[0]:
                row['cwd'] = row['cwd'].replace(ROOT, root)
            with self.subTest(root=root), self.assertRaises(ValueError): verify_command_contract(*values)

    def test_consistent_relocation_cannot_hide_noncanonical_or_wrong_root_layout(self):
        def relocate(values, audit, source_name='source'):
            root = audit + '/' + source_name
            for row in values[0]:
                row['cwd'] = row['cwd'].replace(ROOT, root).replace(AUDIT, audit)
                row['argv'] = [arg.replace(ROOT, root).replace(AUDIT, audit) for arg in row['argv']]
        values = command_fixture(); relocate(values, '/another/runner/hci-native')
        self.assertIsNone(verify_command_contract(*values))
        for audit, source_name in [('/other/runner/not-native', 'source'),
                                   ('/other/runner/hci-native', 'elsewhere'),
                                   ('//other/runner/hci-native', 'source'),
                                   ('/other/./runner/hci-native', 'source'),
                                   ('/other/../runner/hci-native', 'source'),
                                   ('/other//runner/hci-native', 'source')]:
            values = command_fixture(); relocate(values, audit, source_name)
            with self.subTest(audit=audit, source=source_name), self.assertRaises(ValueError):
                verify_command_contract(*values)

    def test_versions_are_only_canonical_qualified_core_data(self):
        for change in [lambda v: v.update(footprintjs='77.0.0-rc.01'),
                       lambda v: v.update(footprintjs='77.0.0;true'),
                       lambda v: v.update(foottrace='88.1.0-rc.0'),
                       lambda v: v.update(extra='1.0.0'), lambda v: v.pop('foottrace')]:
            values = command_fixture(); change(values[1]['coreVersions'])
            with self.assertRaises(ValueError): verify_command_contract(*values)

    def test_pack_basename_and_package_identity_are_closed(self):
        for name in ['../outside.tgz', '/outside.tgz', 'a/b.tgz', 'a\\b.tgz',
                     'hcifootprint-99.0.0.tgz\n', 'other-99.0.0.tgz', 'hcifootprint-99.0.1.tgz']:
            values = command_fixture(); values[2]['archive']['filename'] = name
            with self.subTest(name=name), self.assertRaises(ValueError): verify_command_contract(*values)
        for change in [lambda p: p.update(kind='other'), lambda p: p.update(nativeReady=True),
                       lambda p: p['package'].update(name='other'), lambda p: p.update(extra=True),
                       lambda p: p['archive'].update(extra=True), lambda p: p['package'].update(extra=True)]:
            values = command_fixture(); change(values[2])
            with self.assertRaises(ValueError): verify_command_contract(*values)

    def test_pack_semantic_counts_digests_census_and_manifest_join_are_required(self):
        for change in [lambda p: p.update(entryCount=3), lambda p: p.update(unpackedSize=41),
                       lambda p: p.update(distFiles=0), lambda p: p.update(expandedTarBytes=1),
                       lambda p: p['archive'].update(bytes=0), lambda p: p['archive'].update(sha256='short'),
                       lambda p: p['archive'].update(shasum='short'), lambda p: p['archive'].update(integrity='sha512-AA=='),
                       lambda p: p['package'].update(manifestSha256='3' * 64),
                       lambda p: p['files'].append(copy.deepcopy(p['files'][0])),
                       lambda p: p['files'][0].update(path='../LICENSE'),
                       lambda p: p['files'][0].update(mode=True)]:
            values = command_fixture(); change(values[2])
            with self.assertRaises(ValueError): verify_command_contract(*values)


if __name__ == '__main__': unittest.main()

"""Closed, effect-free command evidence for the fixed native executor."""
import base64
import binascii
import re
from .gates import require_gates

BADGE_SCRIPT = (
    "import{readFileSync as r}from'node:fs';import{checkTestBadge,countTestFiles}from'./scripts/check-test-badge.mjs';"
    "const x=checkTestBadge({readme:r('README.md','utf8'),tally:JSON.parse(r('.test-tally.json','utf8')),testFileCount:countTestFiles()});"
    "if(x.verdict!=='ok')throw Error(JSON.stringify(x));console.log(JSON.stringify(x));"
)


NUMBER = r'(0|[1-9][0-9]*)'
PLAIN = NUMBER + r'\.' + NUMBER + r'\.' + NUMBER
PUBLIC = {'package.json', 'README.md', 'LICENSE'}


def _need(condition, message):
    if not condition:
        raise ValueError(message)


def _closed(value, keys, label):
    _need(type(value) is dict and set(value) == set(keys), label + ' fields differ')


def _hex(value, length):
    _need(type(value) is str and re.fullmatch(r'[0-9a-f]{' + str(length) + '}', value),
          'Exact pack digest required')


def _count(value, maximum):
    _need(type(value) is int and 0 <= value <= maximum, 'Bounded exact pack count required')


def _canonical_path(value):
    _need(type(value) is str and value.startswith('/') and not value.startswith('//')
          and all(part not in ('', '.', '..') for part in value[1:].split('/'))
          and '\\' not in value and ':' not in value
          and all(32 <= ord(char) != 127 for char in value), 'Canonical absolute native path required')
    return value


def _pack_name(value):
    """Consume only the fixed inspect_hci_pack facts, never caller path selectors."""
    _closed(value, ('kind', 'nativeReady', 'archive', 'package', 'entryCount',
                    'unpackedSize', 'expandedTarBytes', 'distFiles', 'files'), 'Actual HCI pack')
    _need(value['kind'] == 'hci-native-pack-inspection/1' and value['nativeReady'] is False,
          'Actual inspected HCI pack facts required')
    package, archive = value['package'], value['archive']
    _closed(package, ('name', 'version', 'manifestSha256'), 'Packed package')
    _closed(archive, ('filename', 'bytes', 'sha256', 'shasum', 'integrity'), 'Packed archive')
    version = package['version']
    _need(package['name'] == 'hcifootprint' and type(version) is str
          and re.fullmatch(PLAIN + r'(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?'
                          r'(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?', version),
          'Canonical actual HCI package version required')
    release = version.split('+')[0].partition('-')[2]
    _need(not release or all(not part.isdecimal() or part == '0' or not part.startswith('0')
                            for part in release.split('.')), 'Canonical packed prerelease required')
    name = archive['filename']
    _need(type(name) is str and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._+-]*\.tgz', name)
          and name == 'hcifootprint-' + version + '.tgz', 'Exact safe inspected pack basename required')
    _count(archive['bytes'], 32 * 1024 * 1024)
    _need(archive['bytes'] > 0, 'Actual nonempty HCI pack required')
    _hex(archive['sha256'], 64); _hex(archive['shasum'], 40)
    _hex(package['manifestSha256'], 64)
    integrity = archive['integrity']
    _need(type(integrity) is str and integrity.startswith('sha512-'), 'Actual pack SRI required')
    try:
        digest = base64.b64decode(integrity[7:], validate=True)
    except (ValueError, binascii.Error) as error:
        raise ValueError('Canonical actual pack SRI required') from error
    _need(len(digest) == 64 and base64.b64encode(digest).decode() == integrity[7:],
          'Canonical actual pack SHA512 required')
    for key, maximum in [('entryCount', 20_000), ('unpackedSize', 128 * 1024 * 1024),
                         ('expandedTarBytes', 128 * 1024 * 1024), ('distFiles', 20_000)]:
        _count(value[key], maximum)
    files = value['files']
    _need(type(files) is list and 0 < len(files) <= 20_000, 'Actual pack member census required')
    census = {}
    for row in files:
        _closed(row, ('path', 'size', 'mode', 'sha256'), 'Actual packed member')
        path = row['path']
        _need(type(path) is str and '\\' not in path and ':' not in path
              and all(part not in ('', '.', '..') for part in path.split('/'))
              and all(32 <= ord(char) != 127 for char in path)
              and (path in PUBLIC or path.startswith('dist/')), 'Safe public pack member required')
        _need(path not in census, 'Duplicate actual packed member')
        _count(row['size'], 128 * 1024 * 1024); _count(row['mode'], 0o777)
        _hex(row['sha256'], 64)
        census[path] = row
    _need(PUBLIC.issubset(census) and list(census) == sorted(census), 'Complete ordered public pack census required')
    _need(value['entryCount'] == len(census)
          and value['unpackedSize'] == sum(row['size'] for row in files)
          and 0 < value['distFiles'] == sum(name.startswith('dist/') for name in census),
          'Actual pack census summary differs')
    minimum = sum(512 + ((row['size'] + 511) // 512) * 512 for row in files) + 1024
    _need(value['expandedTarBytes'] >= minimum and value['expandedTarBytes'] % 512 == 0,
          'Actual expanded pack byte count differs')
    _need(census['package.json']['sha256'] == package['manifestSha256'], 'Packed manifest digest join differs')
    return name


def verify_command_contract(rows: list, expected_input: dict, pack_facts: dict) -> None:
    """Refuse any drift from all 29 fixed command statements and path roles."""
    _need(type(rows) is list, 'Actual command rows required')
    for row in rows:
        _closed(row, ('label', 'argv', 'cwd', 'exit', 'expectedExit', 'afterGuardError'), 'Command evidence')
        _need(type(row['argv']) is list and all(type(arg) is str for arg in row['argv']), 'Actual argv required')
    require_gates(rows)
    root = _canonical_path(next(row['cwd'] for row in rows if row['label'] == 'root-install'))
    _need(root.endswith('/hci-native/source'), 'Fixed isolated native source layout required')
    audit = root.rsplit('/', 1)[0]
    docs, consumer = root + '/docs-next', audit + '/packed-consumer'
    _need(type(expected_input) is dict, 'Exact qualified input required')
    versions = expected_input.get('coreVersions')
    _closed(versions, ('footprintjs', 'foottrace'), 'Qualified command core roles')
    for role in ('footprintjs', 'foottrace'):
        pattern = PLAIN + (r'(?:-rc\.' + NUMBER + r')?' if role == 'footprintjs' else '')
        _need(type(versions[role]) is str and re.fullmatch(pattern, versions[role]),
              'Canonical qualified command core version required')
    packed = audit + '/pack/' + _pack_name(pack_facts)
    npm_lock = ['npm', 'install', '--package-lock-only', '--ignore-scripts', '--strict-peer-deps', '--no-audit', '--no-fund']
    recipe = [
        ('root-lock', npm_lock + ['--save-prefix=^', 'footprintjs@' + versions['footprintjs'], 'foottrace@' + versions['foottrace']], root),
        ('docs-lock', npm_lock, docs),
        ('root-install', ['npm', 'ci', '--strict-peer-deps'], root),
        ('native-pins', ['node', 'scripts/cohort/native_input.mjs', 'pins'], root),
        ('ordinary-pins-refused', ['npm', 'run', 'test:cohort:pins'], root),
        ('cohort-faults', ['npm', 'run', 'test:cohort'], root),
        ('native-fixtures', ['python3', '-m', 'unittest', 'discover', '-s', 'scripts/cohort/native_input', '-p', '*_test.py'], root),
        ('typecheck', ['npm', 'run', 'typecheck'], root),
        ('build', ['npm', 'run', 'build'], root),
        ('library-test', ['npm', 'test'], root),
        ('whole-badge', ['node', '--input-type=module', '-e', BADGE_SCRIPT], root),
        ('coverage', ['npm', 'run', 'test:coverage'], root),
        ('agent-guide', ['npm', 'run', 'docs:agents:check'], root),
        ('docs-toolchain', ['npm', 'run', 'docs:toolchain:check'], root),
        ('live-desk', ['npm', 'run', 'verify', '--workspace', 'live-desk'], root),
        ('onboarding-wizard-demo', ['npm', 'run', 'verify', '--workspace', 'onboarding-wizard-demo'], root),
        ('publint', ['npx', 'publint'], root),
        ('attw', ['npx', '@arethetypeswrong/cli', '--pack', '--profile', 'esm-only'], root),
        ('pack', ['npm', 'pack', '--ignore-scripts', '--pack-destination', audit + '/pack', '--json'], root),
        ('prepare-consumer', ['node', 'scripts/cohort/prepare-consumer.mjs', consumer, packed], root),
        ('consumer-install', ['npm', 'install', '--ignore-scripts', '--strict-peer-deps', '--no-audit', '--no-fund'], consumer),
        ('consumer-identity', ['npm', 'run', 'check:identity'], consumer),
        ('consumer-types', ['npm', 'run', 'check:types'], consumer),
        ('consumer-runtime', ['npm', 'run', 'check:runtime'], consumer),
        ('docs-install', ['npm', 'ci', '--strict-peer-deps'], docs),
        ('docs-truth', ['npm', 'run', 'docs:truth:check'], root),
        ('docs-api', ['npm', 'run', 'check:api'], docs),
        ('docs-build', ['npm', 'run', 'build'], docs),
        ('docs-links', ['node', 'scripts/check-doc-links.mjs', '--strict'], root),
    ]
    actual = [(row['label'], row['argv'], row['cwd']) for row in rows]
    _need(actual == recipe, 'Fixed native command argv/cwd differs')

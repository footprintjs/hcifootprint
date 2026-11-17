"""Read-only HCI pack fidelity: original bytes, report, authored manifest and dist.

Migration: native audit callers pass the unmodified single npm pack JSON object
and the authored public root manifest. npm has no SHA256 field: compute it here;
if a caller also supplies one, it must match. No install or acceptance is implied.
"""
import base64
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import stat
import tarfile

MAX_TGZ_BYTES = 32 * 1024 * 1024
MAX_TAR_BYTES = 128 * 1024 * 1024
MAX_MANIFEST_BYTES = 1024 * 1024
MAX_MEMBERS = 20_000
PUBLIC_FILES = {'package.json', 'README.md', 'LICENSE'}


class PackError(ValueError):
    """The actual HCI pack or its source/report joins failed validation."""


def _need(condition, message):
    if not condition:
        raise PackError(message)


def _sha(raw):
    return hashlib.sha256(raw).hexdigest()


def _count(value, maximum, label):
    _need(type(value) is int and 0 <= value <= maximum, label + ' is not bounded')


def _path(name):
    _need(type(name) is str and name and '\\' not in name and ':' not in name,
          'Unsafe packed path')
    _need(all(part not in ('', '.', '..') for part in name.split('/'))
          and all(ord(char) >= 32 and ord(char) != 127 for char in name),
          'Noncanonical packed path')
    name.encode('utf-8')
    _need(name in PUBLIC_FILES or name.startswith('dist/'), 'Unexpected packed member')
    return name


def _read(path, maximum):
    meta = path.lstat()
    _need(stat.S_ISREG(meta.st_mode) and path.resolve(strict=True) == path,
          'Canonical regular source/archive file required: ' + str(path))
    _count(meta.st_size, maximum, 'File bytes')
    with path.open('rb') as stream:
        raw = stream.read(maximum + 1)
    _need(len(raw) == meta.st_size, 'File changed or exceeded its bound')
    return raw


def _unique(pairs):
    result = {}
    for key, value in pairs:
        _need(key not in result, 'Duplicate packed manifest key')
        result[key] = value
    return result


def _invalid(_value):
    raise PackError('Non-JSON packed manifest number')


def _float(value):
    number = float(value)
    _need(math.isfinite(number), 'Non-finite packed manifest number')
    return number


def _same(left, right):
    if type(left) is not type(right):
        return type(left) in (int, float) and type(right) in (int, float) and left == right
    if type(left) is dict:
        return left.keys() == right.keys() and all(_same(left[key], right[key]) for key in left)
    if type(left) is list:
        return len(left) == len(right) and all(_same(a, b) for a, b in zip(left, right))
    return left == right


def _report(reported, authored, archive, raw):
    _need(type(reported) is dict and type(authored) is dict, 'Actual pack report/authored manifest required')
    _need(authored.get('name') == 'hcifootprint' and type(authored.get('version')) is str,
          'Authored public HCI manifest required')
    filename = reported.get('filename')
    _need(type(filename) is str and filename == archive.name and filename.endswith('.tgz')
          and '/' not in filename and '\\' not in filename and ':' not in filename
          and all(ord(c) >= 32 and ord(c) != 127 for c in filename), 'Exact pack basename required')
    for field in ('name', 'version'):
        _need(reported.get(field) == authored[field], 'Pack report identity differs: ' + field)
    _need(reported.get('id') == authored['name'] + '@' + authored['version'], 'Pack report id differs')
    observed = {'filename': filename, 'bytes': len(raw), 'sha256': _sha(raw),
                'shasum': hashlib.sha1(raw).hexdigest(),
                'integrity': 'sha512-' + base64.b64encode(hashlib.sha512(raw).digest()).decode('ascii')}
    _count(reported.get('size'), MAX_TGZ_BYTES, 'Reported archive bytes')
    _need(reported['size'] == len(raw), 'Pack report archive bytes differ')
    for key in ('shasum', 'integrity'):
        _need(reported.get(key) == observed[key], 'Pack report archive digest differs: ' + key)
    _need('sha256' not in reported or reported['sha256'] == observed['sha256'], 'Pack SHA256 differs')
    _need(reported.get('bundled') == [], 'Unexpected bundled package')
    _count(reported.get('entryCount'), MAX_MEMBERS, 'Reported entry count')
    _count(reported.get('unpackedSize'), MAX_TAR_BYTES, 'Reported unpacked bytes')
    rows = reported.get('files')
    _need(type(rows) is list and 0 < len(rows) <= MAX_MEMBERS, 'Bounded full npm files census required')
    census = {}
    for row in rows:
        _need(type(row) is dict and set(row) == {'path', 'size', 'mode'}, 'npm file census fields differ')
        name = _path(row['path'])
        _need(name not in census, 'Duplicate npm report path')
        _count(row['size'], MAX_TAR_BYTES, 'Reported member bytes')
        _count(row['mode'], 0o777, 'Reported member mode')
        census[name] = dict(row)
    _need(reported['entryCount'] == len(census)
          and reported['unpackedSize'] == sum(row['size'] for row in census.values()),
          'npm report count/size summary differs')
    return observed, census


def _members(raw):
    with gzip.GzipFile(fileobj=io.BytesIO(raw)) as compressed:
        expanded = compressed.read(MAX_TAR_BYTES + 1)
    _need(len(expanded) <= MAX_TAR_BYTES and len(expanded) % 512 == 0, 'Expanded tar exceeds bound or is truncated')
    members, end = {}, 0
    with tarfile.open(fileobj=io.BytesIO(expanded), mode='r:') as stream:
        for member in stream:
            _need(len(members) < MAX_MEMBERS, 'Actual member count exceeds bound')
            _need(member.type in (tarfile.REGTYPE, tarfile.AREGTYPE)
                  and member.sparse is None, 'Tar links/directories/nonfiles refused')
            _need(member.offset == end, 'Unlisted tar prefix/header bytes')
            _need(member.name.startswith('package/'), 'Tar member outside package/')
            name = _path(member.name[len('package/'):])
            _need(name not in members, 'Duplicate actual tar path')
            _count(member.size, MAX_TAR_BYTES, 'Actual member bytes')
            _count(member.mode, 0o777, 'Actual member mode')
            end = member.offset_data + ((member.size + 511) // 512) * 512
            _need(end <= len(expanded), 'Truncated tar member body')
            body = expanded[member.offset_data:member.offset_data + member.size]
            members[name] = ({'path': name, 'size': member.size, 'mode': member.mode,
                              'sha256': _sha(body)}, body)
    _need(len(expanded) - end >= 1024 and not any(expanded[end:]), 'Missing tar end or unlisted trailing data')
    return members, len(expanded)


def _dist(root):
    folder, found = root / 'dist', set()
    _need(folder.is_dir() and folder.resolve(strict=True) == folder, 'Actual built dist directory required')
    def visit(directory):
        for path in sorted(directory.iterdir()):
            meta = path.lstat()
            _need(not path.is_symlink(), 'Built dist symlink refused')
            if stat.S_ISDIR(meta.st_mode):
                visit(path)
            else:
                _need(stat.S_ISREG(meta.st_mode), 'Built dist nonfile refused')
                found.add(_path(path.relative_to(root).as_posix()))
                _need(len(found) <= MAX_MEMBERS, 'Built dist count exceeds bound')
    visit(folder)
    _need(bool(found), 'Actual built dist files required')
    return found


def inspect_hci_pack(root: Path, archive: Path, reported: dict, authored: dict) -> dict:
    """Return JSON facts; read source/archive only, never mutate, extract or execute."""
    try:
        root, archive = Path(root).absolute(), Path(archive).absolute()
        _need(root.is_dir() and root.resolve(strict=True) == root, 'Canonical HCI source root required')
        _need(not archive.is_relative_to(root), 'Packed archive must be outside the source root')
        raw = _read(archive, MAX_TGZ_BYTES)
        identity, expected = _report(reported, authored, archive, raw)
        members, expanded_size = _members(raw)
        actual = {name: {key: facts[key] for key in ('path', 'size', 'mode')}
                  for name, (facts, _) in members.items()}
        _need(actual == expected, 'Actual tar member census differs from npm report')
        _need(PUBLIC_FILES.issubset(members), 'Packed public manifest/README/LICENSE missing')
        packed = members['package.json'][1]
        _need(len(packed) <= MAX_MANIFEST_BYTES, 'Packed manifest exceeds bound')
        manifest = json.loads(packed.decode('utf-8'), object_pairs_hook=_unique,
                              parse_constant=_invalid, parse_float=_float)
        _need(type(manifest) is dict and _same(manifest, authored), 'Packed manifest differs from authored public root')
        built = _dist(root)
        _need(built == {name for name in members if name.startswith('dist/')}, 'Full real dist census differs')
        for name in sorted(built | {'README.md', 'LICENSE'}):
            body = members[name][1]
            _need(_read(root / name, len(body)) == body, 'Packed/source bytes differ: ' + name)
        return {'kind': 'hci-native-pack-inspection/1', 'nativeReady': False,
                'archive': identity, 'package': {'name': manifest['name'], 'version': manifest['version'],
                                               'manifestSha256': _sha(packed)},
                'entryCount': len(members), 'unpackedSize': sum(row['size'] for row in actual.values()),
                'expandedTarBytes': expanded_size, 'distFiles': len(built),
                'files': [members[name][0] for name in sorted(members)]}
    except (OSError, EOFError, tarfile.TarError, UnicodeError, RecursionError,
            json.JSONDecodeError) as error:
        raise PackError('HCI pack inspection unavailable: ' + str(error)) from error

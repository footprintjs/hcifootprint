"""Small real gzip/tar and filesystem fixtures; no npm or package execution."""
import base64
import copy
import gzip
import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest import mock

from native_input import pack


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


class PackTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='hci-pack-fixture-')
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name).resolve()
        self.root = self.base / 'source'
        (self.root / 'dist').mkdir(parents=True)
        self.archive = self.base / 'hcifootprint-7.0.0.tgz'
        self.authored = {'name': 'hcifootprint', 'version': '7.0.0',
                         'dependencies': {'footprintjs': '^13.0.0', 'foottrace': '^2.0.0'},
                         'files': ['dist/**/*', 'README.md'], 'metadata': {'one': 1}}
        self.items = [('package/package.json', json.dumps(self.authored).encode(), tarfile.REGTYPE, 0o644),
                      ('package/dist/index.js', b'export const original = true;\n', tarfile.REGTYPE, 0o644),
                      ('package/dist/index.d.ts', b'export declare const original: true;\n', tarfile.REGTYPE, 0o644),
                      ('package/README.md', b'# Original HCI\n', tarfile.REGTYPE, 0o644),
                      ('package/LICENSE', b'MIT original bytes\n', tarfile.REGTYPE, 0o644)]
        for name, body, _, _ in self.items:
            path = self.root / name.removeprefix('package/')
            path.write_bytes(body)
        self.repack()

    def repack(self, items=None, expanded=None):
        items = self.items if items is None else items
        if expanded is None:
            output = io.BytesIO()
            with tarfile.open(fileobj=output, mode='w', format=tarfile.USTAR_FORMAT) as stream:
                for name, body, kind, mode in items:
                    member = tarfile.TarInfo(name)
                    member.type, member.mode = kind, mode
                    member.size = len(body) if kind in (tarfile.REGTYPE, tarfile.AREGTYPE) else 0
                    if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
                        member.linkname = 'package/dist/index.js'
                    stream.addfile(member, io.BytesIO(body) if member.size else None)
            expanded = output.getvalue()
        self.expanded = expanded
        raw = gzip.compress(expanded, mtime=0)
        self.archive.write_bytes(raw)
        files = [{'path': name.removeprefix('package/'), 'size': len(body), 'mode': mode}
                 for name, body, kind, mode in items if kind in (tarfile.REGTYPE, tarfile.AREGTYPE)]
        self.reported = {'id': 'hcifootprint@7.0.0', 'name': 'hcifootprint', 'version': '7.0.0',
                         'size': len(raw), 'unpackedSize': sum(row['size'] for row in files),
                         'filename': self.archive.name, 'shasum': hashlib.sha1(raw).hexdigest(),
                         'integrity': 'sha512-' + base64.b64encode(hashlib.sha512(raw).digest()).decode(),
                         'entryCount': len(files), 'files': files, 'bundled': []}

    def inspect(self):
        return pack.inspect_hci_pack(self.root, self.archive, self.reported, self.authored)

    def refused(self):
        with self.assertRaises(ValueError):
            self.inspect()

    def test_valid_real_tarball_and_raw_manifest_facts(self):
        before = copy.deepcopy((self.reported, self.authored))
        files_before = {str(p): p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        facts = self.inspect()
        self.assertEqual(facts['archive']['sha256'], sha(self.archive.read_bytes()))
        self.assertEqual(facts['archive']['bytes'], self.reported['size'])
        self.assertEqual(facts['package']['manifestSha256'], sha(self.items[0][1]))
        self.assertEqual(facts['entryCount'], 5)
        self.assertEqual(facts['distFiles'], 2)
        self.assertFalse(facts['nativeReady'])
        self.assertEqual([row['path'] for row in facts['files']], sorted(row['path'] for row in self.reported['files']))
        self.assertEqual((self.reported, self.authored), before)
        self.assertEqual({str(p): p.read_bytes() for p in self.root.rglob('*') if p.is_file()}, files_before)
        json.dumps(facts, allow_nan=False)

    def test_all_archive_identity_fields_are_bound(self):
        original = copy.deepcopy(self.reported)
        for key, value in [('size', 1), ('shasum', '0' * 40), ('integrity', 'sha512-' + 'A' * 88),
                           ('sha256', '0' * 64), ('name', 'other'), ('version', '0.0.0'),
                           ('id', 'hcifootprint@0.0.0'), ('bundled', ['hidden'])]:
            with self.subTest(key=key):
                self.reported = {**original, key: value}
                self.refused()
        self.reported = {**original, 'sha256': sha(self.archive.read_bytes())}
        self.assertEqual(self.inspect()['archive']['sha256'], self.reported['sha256'])

    def test_report_filename_must_be_exact_safe_basename(self):
        for name in ['../hcifootprint-7.0.0.tgz', '/tmp/archive.tgz', 'sub/archive.tgz',
                     'C:\\archive.tgz', 'different.tgz', '', 'archive\x00.tgz']:
            with self.subTest(name=name):
                self.reported['filename'] = name
                self.refused()

    def test_report_requires_complete_actual_census(self):
        original = copy.deepcopy(self.reported)
        for changed in [[], original['files'][:-1], original['files'] + [original['files'][0]],
                        original['files'] + [{'path': 'dist/unlisted.js', 'size': 0, 'mode': 420}]]:
            self.reported = {**original, 'files': changed}
            self.refused()
        for key, value in [('entryCount', 4), ('unpackedSize', 0), ('entryCount', True), ('size', True)]:
            self.reported = {**original, key: value}
            self.refused()
        for key, value in [('size', 0), ('mode', 493), ('mode', True), ('path', '../escape')]:
            self.reported = copy.deepcopy(original)
            self.reported['files'][1][key] = value
            self.refused()

    def test_missing_required_report_fields(self):
        for key in ['filename', 'name', 'version', 'size', 'unpackedSize', 'shasum',
                    'integrity', 'entryCount', 'files']:
            with self.subTest(key=key):
                original = self.reported.pop(key)
                self.refused()
                self.reported[key] = original

    def test_unexpected_or_unsafe_real_tar_member(self):
        original_files = copy.deepcopy(self.reported['files'])
        for name in ['package/../escape', '/package/dist/index.js', 'package/dist/../index.js',
                     'package/dist/a\\b', 'package/dist/a:b', 'package/dist//index.js',
                     'package/dist/./index.js', 'package/dist/a\n.js', 'outside/dist/index.js',
                     'package/demos/live-desk/package.json', 'package/README.other']:
            with self.subTest(name=name):
                changed = list(self.items)
                changed[1] = (name, *changed[1][1:])
                self.repack(changed)
                self.reported['files'] = copy.deepcopy(original_files)
                self.refused()

    def test_duplicate_actual_tar_path(self):
        original = copy.deepcopy(self.reported)
        self.repack(self.items + [self.items[1]])
        self.reported.update(files=original['files'], entryCount=original['entryCount'],
                             unpackedSize=original['unpackedSize'])
        self.refused()

    def test_links_directories_devices_and_special_modes_refused(self):
        for kind in [tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.DIRTYPE, tarfile.FIFOTYPE,
                     tarfile.CHRTYPE, tarfile.BLKTYPE, tarfile.GNUTYPE_SPARSE]:
            with self.subTest(kind=kind):
                self.repack(self.items + [('package/dist/extra', b'', kind, 0o644)])
                self.refused()
        self.repack(self.items + [('package/dist/extra', b'', tarfile.REGTYPE, 0o4755)])
        self.refused()

    def test_manifest_semantics_and_duplicate_keys(self):
        for body in [b'{"name":"hcifootprint","name":"other"}', b'[]', b'\xff',
                     json.dumps({**self.authored, 'metadata': {'one': True}}).encode(),
                     json.dumps({**self.authored, 'dependencies': {'footprintjs': '^12.0.0'}}).encode(),
                     b'{"value":NaN}']:
            with self.subTest(body=body):
                self.repack([('package/package.json', body, tarfile.REGTYPE, 0o644)] + self.items[1:])
                self.refused()
        body = json.dumps(self.authored, indent=3).encode()
        self.repack([('package/package.json', body, tarfile.REGTYPE, 0o644)] + self.items[1:])
        self.assertEqual(self.inspect()['package']['manifestSha256'], sha(body))

    def test_dist_byte_changes_missing_files_and_extra_built_files(self):
        index = self.root / 'dist/index.js'
        original = index.read_bytes()
        index.write_bytes(b'x' * len(original))
        self.refused()
        index.write_bytes(original)
        self.repack([row for row in self.items if row[0] != 'package/dist/index.js'])
        self.refused()
        self.repack()
        (self.root / 'dist/hidden.js').write_bytes(b'not packed')
        self.refused()

    def test_extra_packed_dist_file_without_actual_build_is_refused(self):
        self.repack(self.items + [('package/dist/extra.js', b'extra', tarfile.REGTYPE, 0o644)])
        self.refused()

    def test_hidden_nested_dist_files_are_included_and_verified(self):
        folder = self.root / 'dist/.nested'
        folder.mkdir()
        (folder / '.hidden').write_bytes(b'actual hidden build')
        self.repack(self.items + [('package/dist/.nested/.hidden', b'actual hidden build', tarfile.REGTYPE, 0o644)])
        self.assertEqual(self.inspect()['distFiles'], 3)
        (folder / '.hidden').write_bytes(b'changed hidden build')
        self.refused()

    def test_source_links_cannot_stand_for_real_build_or_readme(self):
        for relative in ['dist/index.js', 'README.md', 'LICENSE']:
            path = self.root / relative
            before = path.read_bytes()
            target = self.base / ('target-' + path.name)
            target.write_bytes(before)
            path.unlink()
            path.symlink_to(target)
            self.refused()
            path.unlink()
            path.write_bytes(before)
        (self.root / 'dist/linked-folder').symlink_to(self.base, target_is_directory=True)
        self.refused()

    def test_readme_license_required_and_exact_original_bytes(self):
        for relative in ['README.md', 'LICENSE']:
            path = self.root / relative
            before = path.read_bytes()
            path.write_bytes(b'changed')
            self.refused()
            path.write_bytes(before)
            self.repack([row for row in self.items if row[0] != 'package/' + relative])
            self.refused()
            self.repack()

    def test_archive_symlink_and_inside_source_refused(self):
        target = self.base / 'original.tgz'
        self.archive.rename(target)
        self.archive.symlink_to(target)
        self.refused()
        self.archive.unlink()
        target.rename(self.archive)
        inside = self.root / self.archive.name
        inside.write_bytes(self.archive.read_bytes())
        self.archive = inside
        self.refused()

    def test_bounded_compressed_expanded_and_file_count(self):
        for constant, value in [('MAX_TGZ_BYTES', self.archive.stat().st_size - 1),
                                ('MAX_TAR_BYTES', len(self.expanded) - 1), ('MAX_MEMBERS', 4)]:
            with self.subTest(constant=constant), mock.patch.object(pack, constant, value):
                self.refused()
        with mock.patch.object(pack, 'MAX_TAR_BYTES', 100), mock.patch.object(
                pack.tarfile, 'open', side_effect=AssertionError('tar parsed before expansion bound')):
            self.refused()

    def test_gzip_read_has_a_bound_before_allocation(self):
        calls, original = [], gzip.GzipFile
        class Reader:
            def __init__(self, *args, **kwargs):
                self.stream = original(*args, **kwargs)
            def __enter__(self):
                return self
            def __exit__(self, *args):
                self.stream.close()
            def read(self, size=-1):
                calls.append(size)
                return self.stream.read(size)
        with mock.patch.object(pack.gzip, 'GzipFile', Reader):
            self.inspect()
        self.assertEqual(calls, [pack.MAX_TAR_BYTES + 1])

    def test_actual_member_bound_precedes_excess_body_hash(self):
        self.reported['files'] = self.reported['files'][:-1]
        self.reported['entryCount'] = 4
        self.reported['unpackedSize'] = sum(row['size'] for row in self.reported['files'])
        original = pack._sha
        def bounded(raw):
            if raw == self.items[-1][1]:
                raise AssertionError('out of bound body processed')
            return original(raw)
        with mock.patch.object(pack, 'MAX_MEMBERS', 4), mock.patch.object(pack, '_sha', bounded):
            self.refused()

    def test_pax_long_unicode_file_and_mode_census(self):
        relative = 'dist/' + 'long-' * 25 + '\u03bb.js'
        path = self.root / relative
        path.write_bytes(b'actual long-named build')
        path.chmod(0o755)
        output = io.BytesIO()
        items = self.items + [('package/' + relative, path.read_bytes(), tarfile.REGTYPE, 0o755)]
        with tarfile.open(fileobj=output, mode='w', format=tarfile.PAX_FORMAT) as stream:
            for name, body, kind, mode in items:
                member = tarfile.TarInfo(name)
                member.type, member.mode, member.size = kind, mode, len(body)
                stream.addfile(member, io.BytesIO(body))
        self.repack(items, expanded=output.getvalue())
        facts = self.inspect()
        row = next(row for row in facts['files'] if row['path'] == relative)
        self.assertEqual(row['mode'], 0o755)
        self.assertEqual(row['sha256'], sha(path.read_bytes()))

    def test_trailing_nonzero_tar_data_and_missing_complete_end(self):
        self.repack(expanded=self.expanded + b'x' * 512)
        self.refused()
        self.repack()
        with tarfile.open(fileobj=io.BytesIO(self.expanded), mode='r:') as stream:
            last = stream.getmembers()[-1]
            end = last.offset_data + ((last.size + 511) // 512) * 512
        self.repack(expanded=self.expanded[:end + 512])
        self.refused()

    def test_no_extraction_or_package_execution(self):
        with mock.patch.object(tarfile.TarFile, 'extract', side_effect=AssertionError('extract')), \
                mock.patch.object(tarfile.TarFile, 'extractall', side_effect=AssertionError('extractall')), \
                mock.patch.object(tarfile.TarFile, 'extractfile', side_effect=AssertionError('extractfile')):
            self.assertEqual(self.inspect()['entryCount'], 5)


if __name__ == '__main__':
    unittest.main()

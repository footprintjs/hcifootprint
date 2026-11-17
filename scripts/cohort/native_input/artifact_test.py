"""Small in-memory archive fixtures; nothing is extracted or executed."""
import base64
import copy
import gzip
import hashlib
import io
import json
import stat
import tarfile
import unittest
import zipfile
from unittest import mock

from native_input import artifact


def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()


def sha(value):
    return hashlib.sha256(value).hexdigest()


def archive_identity(tarball):
    return {
        "filename": "agentfootprint-15.0.0-rc.0.tgz",
        "package": "agentfootprint", "version": "15.0.0-rc.0",
        "sha256": sha(tarball), "shasum": hashlib.sha1(tarball).hexdigest(),
        "integrity": "sha512-" + base64.b64encode(hashlib.sha512(tarball).digest()).decode(),
        "bytes": len(tarball),
    }


def fixture(manifest=None, packed=None, items=None):
    manifest = manifest or {
        "name": "agentfootprint", "version": "15.0.0-rc.0",
        "dependencies": {"contextfootprint": "0.1.1", "foottrace": "^2.0.0"},
        "peerDependencies": {"footprintjs": "^13.0.0"},
        "devDependencies": {"footprintjs": "^13.0.0"},
    }
    source_raw = json.dumps(manifest, indent=2).encode()
    lock = {"name": manifest["name"], "version": manifest["version"],
            "lockfileVersion": 3, "packages": {"": copy.deepcopy(manifest)}}
    lock_raw = encoded(lock)
    items = items if items is not None else [
        ("package/package.json", encoded(packed or manifest), tarfile.REGTYPE),
        ("package/dist/index.js", b"export const original = true;\n", tarfile.REGTYPE),
    ]
    stream = io.BytesIO()
    census = []
    with tarfile.open(fileobj=stream, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        for name, body, kind in items:
            member = tarfile.TarInfo(name)
            member.type, member.mode = kind, 0o644
            member.size = len(body) if kind == tarfile.REGTYPE else 0
            if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
                member.linkname = "package/package.json"
            archive.addfile(member, io.BytesIO(body) if kind == tarfile.REGTYPE else None)
            census.append({"path": name, "size": member.size, "sha256": sha(body)})
    expanded = stream.getvalue()
    tarball = gzip.compress(expanded, mtime=0)
    identity = archive_identity(tarball)
    source = {"head": "1" * 40, "tree": "2" * 40,
              "manifestSha256": sha(source_raw), "lockSha256": sha(lock_raw)}
    tested = {"head": "3" * 40, "tree": source["tree"]}
    candidate = {"protocol": "agentfootprint.source-candidate.v1", "source": source,
                 "tested": tested, "archive": {**identity, "files": census}}
    expected = {
        "sourceProtocol": candidate["protocol"], "source": copy.deepcopy(source),
        "tested": copy.deepcopy(tested), "sourceArtifact": {
            "id": 42, "name": "agentfootprint-source-" + source["head"], "expired": False,
        },
        "archive": {**identity, "memberCount": len(census),
                    "memberBytes": sum(x["size"] for x in census),
                    "expandedTarBytes": len(expanded), "memberCensusSha256": sha(encoded(census))},
        "runtimeRequirements": {
            "dependencies": {"foottrace": "^2.0.0"},
            "peerDependencies": {"footprintjs": "^13.0.0"},
            "devDependencies": {"footprintjs": "^13.0.0"},
        },
    }
    return {"candidate": candidate, "expected": expected, "expanded": expanded,
            "parts": {identity["filename"]: tarball, "source-package.json": source_raw,
                      "source-package-lock.json": lock_raw}}


def wrap(data, extra=(), modes=None):
    parts = {**data["parts"], "candidate.json": encoded(data["candidate"])}
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, body in list(parts.items()) + list(extra):
            member = zipfile.ZipInfo(name)
            member.compress_type = zipfile.ZIP_DEFLATED
            member.external_attr = (modes or {}).get(name, stat.S_IFREG | 0o644) << 16
            archive.writestr(member, body)
    blob = stream.getvalue()
    expected = copy.deepcopy(data["expected"])
    expected["sourceArtifact"].update(size_in_bytes=len(blob), digest="sha256:" + sha(blob))
    return blob, expected


def inspect(data):
    return artifact.inspect_candidate(*wrap(data))


class ArtifactTests(unittest.TestCase):
    def test_valid_original_bytes_and_data_only_facts(self):
        data = fixture()
        before = copy.deepcopy(data["expected"])
        result = inspect(data)
        self.assertEqual(result["tarball"], data["parts"][data["expected"]["archive"]["filename"]])
        self.assertEqual(result["source_manifest"]["name"], "agentfootprint")
        self.assertEqual(result["facts"]["archive"], data["expected"]["archive"])
        self.assertEqual(result["members"], data["candidate"]["archive"]["files"])
        self.assertFalse(result["facts"]["nativeReady"])
        self.assertEqual(data["expected"], before)

    def test_packed_manifest_semantics_ignore_json_layout(self):
        data = fixture()
        result = inspect(data)
        self.assertEqual(result["facts"]["source"], data["expected"]["source"])

    def test_outer_hash_size_and_closed_role(self):
        blob, expected = wrap(fixture())
        for path, value in [(('sourceArtifact', 'digest'), 'sha256:' + '0' * 64),
                            (('sourceArtifact', 'size_in_bytes'), len(blob) + 1),
                            (('archive', 'package'), 'another-package'),
                            (('sourceProtocol',), 'other.v1')]:
            with self.subTest(path=path):
                changed = copy.deepcopy(expected)
                target = changed
                for key in path[:-1]:
                    target = target[key]
                target[path[-1]] = value
                with self.assertRaises(ValueError):
                    artifact.inspect_candidate(blob, changed)

    def test_protocol_source_and_tested_binding(self):
        for section, key in [('source', 'head'), ('source', 'tree'), ('tested', 'head'), ('tested', 'tree')]:
            with self.subTest(section=section, key=key):
                data = fixture()
                data['candidate'][section][key] = '9' * 40
                with self.assertRaises(ValueError):
                    inspect(data)
        data = fixture()
        data['candidate']['protocol'] = 'wrong.v1'
        with self.assertRaises(ValueError):
            inspect(data)

    def test_source_manifest_and_lock_raw_hashes(self):
        for name in ['source-package.json', 'source-package-lock.json']:
            with self.subTest(name=name):
                data = fixture()
                data['parts'][name] += b' '
                with self.assertRaises(ValueError):
                    inspect(data)

    def test_zip_duplicates_unexpected_members_and_links(self):
        for extra, modes in [([('candidate.json', b'{}')], None),
                             ([('../escape', b'x')], None),
                             ([], {'candidate.json': stat.S_IFLNK | 0o777})]:
            with self.subTest(extra=extra, modes=modes):
                blob, expected = wrap(fixture(), extra, modes)
                with self.assertRaises(ValueError):
                    artifact.inspect_candidate(blob, expected)

    def test_zip_preamble_and_outer_bound(self):
        blob, expected = wrap(fixture())
        prefixed = b'unlisted' + blob
        expected['sourceArtifact'].update(size_in_bytes=len(prefixed), digest='sha256:' + sha(prefixed))
        with self.assertRaises(ValueError):
            artifact.inspect_candidate(prefixed, expected)
        with mock.patch.object(artifact, 'MAX_ZIP_BYTES', len(blob) - 1):
            with self.assertRaises(ValueError):
                artifact.inspect_candidate(blob, wrap(fixture())[1])

    def test_duplicate_json_keys_are_refused(self):
        data = fixture()
        raw = encoded(data['candidate'])
        duplicate = b'{"protocol":"agentfootprint.source-candidate.v1",' + raw[1:]
        data['parts']['candidate.json'] = duplicate
        # wrap normally authors candidate.json; preserve this deliberate raw duplicate.
        data['candidate'] = None
        with mock.patch(__name__ + '.encoded', side_effect=lambda value: duplicate if value is None else encoded_original(value)):
            with self.assertRaises(ValueError):
                inspect(data)

    def test_tar_paths_duplicates_and_links(self):
        for path, kind in [('package/../escape', tarfile.REGTYPE),
                           ('/package/absolute', tarfile.REGTYPE),
                           ('package/a\\b', tarfile.REGTYPE),
                           ('package/link', tarfile.SYMTYPE),
                           ('package/link', tarfile.LNKTYPE),
                           ('package/package.json', tarfile.REGTYPE)]:
            with self.subTest(path=path, kind=kind):
                base = fixture()
                manifest = json.loads(base['parts']['source-package.json'])
                data = fixture(items=[('package/package.json', encoded(manifest), tarfile.REGTYPE),
                                      (path, b'x' if kind == tarfile.REGTYPE else b'', kind)])
                with self.assertRaises(ValueError):
                    inspect(data)

    def test_ordered_census_and_summary_cannot_drift(self):
        data = fixture()
        data['candidate']['archive']['files'].reverse()
        with self.assertRaises(ValueError):
            inspect(data)
        for key, value in [('memberCount', 1), ('memberBytes', 1),
                           ('memberCensusSha256', '0' * 64), ('expandedTarBytes', 1024)]:
            with self.subTest(key=key):
                data = fixture()
                data['expected']['archive'][key] = value
                with self.assertRaises(ValueError):
                    inspect(data)

    def test_tgz_hash_shasum_sri_and_candidate_identity(self):
        for key, value in [('sha256', '0' * 64), ('shasum', '0' * 40),
                           ('integrity', 'sha512-' + 'A' * 88), ('bytes', 1)]:
            with self.subTest(key=key):
                data = fixture()
                data['expected']['archive'][key] = value
                data['candidate']['archive'][key] = value
                with self.assertRaises(ValueError):
                    inspect(data)

    def test_gzip_is_bounded_before_tar_parser(self):
        data = fixture()
        data['expected']['archive']['expandedTarBytes'] = 4096
        with mock.patch.object(artifact, 'MAX_TAR_BYTES', 4096), mock.patch.object(
                artifact.tarfile, 'open', side_effect=AssertionError('tar parser reached')):
            with self.assertRaises(ValueError):
                inspect(data)

    def test_gzip_read_itself_has_a_limit(self):
        calls = []
        original = artifact.gzip.GzipFile

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

        with mock.patch.object(artifact.gzip, 'GzipFile', Reader):
            inspect(fixture())
        self.assertEqual(calls, [artifact.MAX_TAR_BYTES + 1])

    def test_zip_claimed_expansion_refuses_before_inflation(self):
        data = fixture()
        blob, expected = wrap(data)
        with mock.patch.object(artifact, 'MAX_JSON_BYTES', 100), mock.patch.object(
                artifact.zipfile.ZipFile, 'open', side_effect=AssertionError('inflated over-limit member')):
            with self.assertRaises(ValueError):
                artifact.inspect_candidate(blob, expected)

    def test_nonzero_trailing_tar_data_is_not_an_unlisted_member(self):
        data = fixture()
        expanded = data['expanded'] + b'x' * 512
        tarball = gzip.compress(expanded, mtime=0)
        identity = archive_identity(tarball)
        data['parts'][identity['filename']] = tarball
        data['candidate']['archive'].update(identity)
        data['expected']['archive'].update(identity, expandedTarBytes=len(expanded))
        with self.assertRaises(ValueError):
            inspect(data)

    def test_member_bound_precedes_out_of_bound_body_hash(self):
        data = fixture()
        first = data['candidate']['archive']['files'][:1]
        data['candidate']['archive']['files'] = first
        data['expected']['archive'].update(memberCount=1, memberBytes=first[0]['size'],
                                            memberCensusSha256=sha(encoded(first)))
        original = artifact._sha

        def bounded_hash(body):
            if isinstance(body, memoryview) and bytes(body).startswith(b'export const'):
                raise AssertionError('out of bound member body reached')
            return original(body)

        with mock.patch.object(artifact, 'MAX_MEMBERS', 1), mock.patch.object(artifact, '_sha', bounded_hash):
            with self.assertRaises(ValueError):
                inspect(data)

    def test_no_archive_extraction_or_filesystem_open(self):
        with mock.patch('builtins.open', side_effect=AssertionError('filesystem effect')), \
                mock.patch.object(artifact.tarfile.TarFile, 'extract', side_effect=AssertionError('extract')), \
                mock.patch.object(artifact.tarfile.TarFile, 'extractall', side_effect=AssertionError('extractall')), \
                mock.patch.object(artifact.tarfile.TarFile, 'extractfile', side_effect=AssertionError('extractfile')):
            inspect(fixture())

    def test_packed_manifest_must_equal_original_source(self):
        data = fixture()
        manifest = json.loads(data['parts']['source-package.json'])
        packed = {**manifest, 'description': 'unreviewed packed edit'}
        with self.assertRaises(ValueError):
            inspect(fixture(manifest=manifest, packed=packed))

    def test_json_boolean_is_not_a_semantically_equal_number(self):
        data = fixture()
        manifest = json.loads(data['parts']['source-package.json'])
        manifest['metadata'] = {'value': 1}
        packed = copy.deepcopy(manifest)
        packed['metadata']['value'] = True
        with self.assertRaises(ValueError):
            inspect(fixture(manifest=manifest, packed=packed))

    def test_expected_runtime_requirements_and_original_lock_root(self):
        data = fixture()
        manifest = json.loads(data['parts']['source-package.json'])
        manifest['dependencies']['foottrace'] = '^1.0.0'
        with self.assertRaises(ValueError):
            inspect(fixture(manifest=manifest))
        data = fixture()
        lock = json.loads(data['parts']['source-package-lock.json'])
        lock['packages']['']['peerDependencies']['footprintjs'] = '^12.0.0'
        data['parts']['source-package-lock.json'] = encoded(lock)
        data['expected']['source']['lockSha256'] = sha(data['parts']['source-package-lock.json'])
        data['candidate']['source']['lockSha256'] = data['expected']['source']['lockSha256']
        with self.assertRaises(ValueError):
            inspect(data)


encoded_original = encoded

if __name__ == '__main__':
    unittest.main()

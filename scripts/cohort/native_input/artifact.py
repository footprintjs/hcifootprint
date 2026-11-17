"""Read the original AF source ZIP as bounded data, never execute or extract it."""
import base64
import gzip
import hashlib
import io
import json
import math
import re
import stat
import struct
import tarfile
import zipfile

MIB = 1024 * 1024
MAX_ZIP_BYTES = 16 * MIB
MAX_TGZ_BYTES = 32 * MIB
MAX_JSON_BYTES = 8 * MIB
MAX_MANIFEST_BYTES = MIB
MAX_TAR_BYTES = 128 * MIB
MAX_MEMBERS = 20_000
PROTOCOL = "agentfootprint.source-candidate.v1"
IDENTITY_KEYS = {"filename", "package", "version", "sha256", "shasum", "integrity", "bytes"}
SUMMARY_KEYS = {"memberCount", "memberBytes", "expandedTarBytes", "memberCensusSha256"}
SOURCE_KEYS = {"head", "tree", "manifestSha256", "lockSha256"}
REQUIREMENT_SLOTS = {"dependencies": "foottrace", "peerDependencies": "footprintjs",
                     "devDependencies": "footprintjs"}


class ArtifactError(ValueError):
    """The supplied bytes do not match the one closed original artifact role."""


def _need(condition, message):
    if not condition:
        raise ArtifactError(message)


def _object(value, keys, label):
    _need(type(value) is dict and all(type(k) is str for k in value), label + " object required")
    _need(set(value) == keys, label + " fields differ")
    return value


def _count(value, maximum, label, minimum=0):
    _need(type(value) is int and minimum <= value <= maximum, label + " exceeds its bound")


def _hex(value, length, label):
    _need(type(value) is str and re.fullmatch(r"[0-9a-f]{%d}" % length, value), label + " invalid")


def _sha(data):
    return hashlib.sha256(data).hexdigest()


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        _need(key not in result, "Duplicate JSON key")
        result[key] = value
    return result


def _finite_float(value):
    number = float(value)
    _need(math.isfinite(number), "Non-finite JSON number")
    return number


def _invalid_constant(_value):
    raise ArtifactError("Non-JSON constant")


def _json(data, label):
    value = json.loads(data.decode("utf-8"), object_pairs_hook=_unique_object,
                       parse_constant=_invalid_constant, parse_float=_finite_float)
    _need(type(value) is dict, label + " JSON object required")
    return value


def _json_equal(left, right):
    if type(left) is not type(right):
        return (type(left) in (int, float) and type(right) in (int, float)
                and left == right)
    if type(left) is dict:
        return left.keys() == right.keys() and all(_json_equal(left[k], right[k]) for k in left)
    if type(left) is list:
        return len(left) == len(right) and all(_json_equal(a, b) for a, b in zip(left, right))
    return left == right


def _package_path(name):
    _need(type(name) is str and "\\" not in name and ":" not in name, "Unsafe package path")
    name.encode("utf-8")
    parts = name.split("/")
    _need(len(parts) >= 2 and parts[0] == "package", "Package path outside package/")
    _need(all(p not in ("", ".", "..") for p in parts), "Noncanonical package path")
    _need(all(ord(c) >= 32 and ord(c) != 127 for c in name), "Control character in package path")


def _expected(value):
    _need(type(value) is dict, "Expected tuple object required")
    _need(value.get("sourceProtocol") == PROTOCOL, "Only the original AF protocol is supported")
    source = _object(value.get("source"), SOURCE_KEYS, "Expected source")
    tested = _object(value.get("tested"), {"head", "tree"}, "Expected tested source")
    for key in ["head", "tree"]:
        _hex(source[key], 40, "Source " + key)
        _hex(tested[key], 40, "Tested " + key)
    _need(tested["tree"] == source["tree"], "Tested tree differs from source")
    for key in ["manifestSha256", "lockSha256"]:
        _hex(source[key], 64, key)
    archive = _object(value.get("archive"), IDENTITY_KEYS | SUMMARY_KEYS, "Expected archive")
    _need(archive["package"] == "agentfootprint", "Only the original AF package is supported")
    version = archive["version"]
    _need(type(version) is str and re.fullmatch(r"\d+\.\d+\.\d+-rc\.\d+", version), "AF RC version required")
    _need(archive["filename"] == "agentfootprint-" + version + ".tgz", "Original archive name differs")
    _hex(archive["sha256"], 64, "Archive SHA256")
    _hex(archive["shasum"], 40, "Archive SHA1")
    _hex(archive["memberCensusSha256"], 64, "Member census SHA256")
    _count(archive["bytes"], MAX_TGZ_BYTES, "TGZ bytes", 1)
    _count(archive["expandedTarBytes"], MAX_TAR_BYTES, "Expanded tar bytes", 1)
    _count(archive["memberCount"], MAX_MEMBERS, "Member count", 1)
    _count(archive["memberBytes"], MAX_TAR_BYTES, "Member bytes")
    outer = value.get("sourceArtifact")
    _need(type(outer) is dict, "Expected source artifact required")
    _count(outer.get("id"), (1 << 63) - 1, "Source artifact id", 1)
    _need(outer.get("name") == "agentfootprint-source-" + source["head"], "Artifact/source head differs")
    _need(outer.get("expired") is False, "Expired or unknown source artifact")
    _count(outer.get("size_in_bytes"), MAX_ZIP_BYTES, "Outer ZIP bytes", 1)
    _need(type(outer.get("digest")) is str and re.fullmatch(r"sha256:[0-9a-f]{64}", outer["digest"]), "Outer digest required")
    requirements = _object(value.get("runtimeRequirements"), set(REQUIREMENT_SLOTS), "Runtime requirements")
    for section, package in REQUIREMENT_SLOTS.items():
        slots = _object(requirements[section], {package}, section)
        _need(type(slots[package]) is str and bool(slots[package]), "Runtime requirement range required")
    return value


def _local_end(data, member, cursor):
    _need(member.header_offset == cursor, "Unlisted ZIP prefix or local member")
    header = struct.unpack("<4s5H3I2H", data[cursor:cursor + 30])
    signature, _, flags, method, _, _, crc, compressed, expanded, names, extras = header
    encoding = "utf-8" if flags & 0x800 else "cp437"
    encoded_name = member.orig_filename.encode(encoding)
    _need(signature == b"PK\x03\x04" and flags == member.flag_bits
          and method == member.compress_type, "ZIP local header differs")
    _need(extras == 0 and names == len(encoded_name)
          and data[cursor + 30:cursor + 30 + names] == encoded_name, "ZIP local name/extra differs")
    cursor += 30 + names + member.compress_size
    if flags & 8:
        if data[cursor:cursor + 4] == b"PK\x07\x08":
            cursor += 4
        crc, compressed, expanded = struct.unpack("<3I", data[cursor:cursor + 12])
        cursor += 12
    _need((crc, compressed, expanded) == (member.CRC, member.compress_size, member.file_size), "ZIP descriptor differs")
    return cursor


def _zip_layout(data, members):
    record = struct.unpack("<4s4H2IH", data[-22:])
    magic, disk, central_disk, disk_count, count, size, offset, comment = record
    _need(magic == b"PK\x05\x06" and disk == central_disk == comment == 0
          and disk_count == count == 4 and offset + size == len(data) - 22, "Noncanonical ZIP directory")
    cursor = 0
    for member in sorted(members, key=lambda item: item.header_offset):
        cursor = _local_end(data, member, cursor)
    _need(cursor == offset, "Unlisted ZIP local bytes")
    directory_bytes = sum(46 + len(m.orig_filename.encode("utf-8" if m.flag_bits & 0x800 else "cp437"))
                          for m in members)
    _need(size == directory_bytes, "Unlisted ZIP directory bytes")


def _zip_parts(data, expected):
    filename = expected["archive"]["filename"]
    limits = {filename: MAX_TGZ_BYTES, "candidate.json": MAX_JSON_BYTES,
              "source-package.json": MAX_MANIFEST_BYTES, "source-package-lock.json": MAX_JSON_BYTES}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        members = archive.infolist()
        _need(len(members) == 4 and {m.filename for m in members} == set(limits), "Exactly four original ZIP members required")
        _need(not archive.comment, "ZIP comment refused")
        for member in members:
            _need(member.orig_filename == member.filename and "\x00" not in member.orig_filename, "Unsafe ZIP member name")
            _need(not member.is_dir() and stat.S_IFMT(member.external_attr >> 16) in (0, stat.S_IFREG), "ZIP links/nonfiles refused")
            _need(not member.extra and not member.comment and not member.flag_bits & ~(8 | 0x800), "ZIP extra/encryption/flags refused")
            _need(member.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), "Unsupported ZIP compression")
            _count(member.file_size, limits[member.filename], "ZIP member bytes")
        _need(sum(m.file_size for m in members) <= sum(limits.values()), "Expanded ZIP bound exceeded")
        _zip_layout(data, members)
        parts = {}
        for member in members:
            with archive.open(member) as stream:
                body = stream.read(limits[member.filename] + 1)
            _need(len(body) == member.file_size, "ZIP member size differs")
            parts[member.filename] = body
        return parts


def _source_documents(parts, expected):
    source = expected["source"]
    _need(_sha(parts["source-package.json"]) == source["manifestSha256"], "Original manifest raw SHA differs")
    _need(_sha(parts["source-package-lock.json"]) == source["lockSha256"], "Original lock raw SHA differs")
    manifest = _json(parts["source-package.json"], "Source manifest")
    lock = _json(parts["source-package-lock.json"], "Source lock")
    identity = expected["archive"]
    _need(manifest.get("name") == identity["package"] and manifest.get("version") == identity["version"], "Original manifest identity differs")
    _need(lock.get("lockfileVersion") == 3 and lock.get("name") == manifest["name"]
          and lock.get("version") == manifest["version"], "Original lock identity differs")
    _need(type(lock.get("packages")) is dict and type(lock["packages"].get("")) is dict, "Original lock root required")
    root = lock["packages"][""]
    for key in ["name", "version", *REQUIREMENT_SLOTS]:
        _need(_json_equal(root.get(key), manifest.get(key)), "Original lock root/manifest differs: " + key)
    for section, slots in expected["runtimeRequirements"].items():
        _need(type(manifest.get(section)) is dict, "Original runtime section missing")
        for name, value in slots.items():
            _need(manifest[section].get(name) == value, "Original runtime requirement differs: " + name)
    return manifest


def _candidate(parts, expected):
    candidate = _object(_json(parts["candidate.json"], "Candidate"),
                        {"protocol", "source", "tested", "archive"}, "Candidate")
    _need(candidate["protocol"] == PROTOCOL, "Candidate protocol differs")
    _need(candidate["source"] == expected["source"] and candidate["tested"] == expected["tested"], "Candidate source/tested binding differs")
    archive = _object(candidate["archive"], IDENTITY_KEYS | {"files"}, "Candidate archive")
    _need({k: archive[k] for k in IDENTITY_KEYS} == {k: expected["archive"][k] for k in IDENTITY_KEYS}, "Candidate original archive identity differs")
    files = archive["files"]
    _need(type(files) is list and 0 < len(files) <= MAX_MEMBERS, "Bounded candidate member census required")
    for item in files:
        _object(item, {"path", "size", "sha256"}, "Candidate member")
        _package_path(item["path"])
        _count(item["size"], MAX_TAR_BYTES, "Candidate member size")
        _hex(item["sha256"], 64, "Candidate member SHA256")
    return candidate


def _archive_identity(tarball, expected):
    _need(len(tarball) == expected["bytes"], "Original TGZ size differs")
    observed = {k: expected[k] for k in ["filename", "package", "version"]}
    observed.update(bytes=len(tarball), sha256=_sha(tarball),
                    shasum=hashlib.sha1(tarball).hexdigest(),
                    integrity="sha512-" + base64.b64encode(hashlib.sha512(tarball).digest()).decode("ascii"))
    _need(all(observed[k] == expected[k] for k in IDENTITY_KEYS), "Original TGZ digest/SRI differs")
    return observed


def _expanded_tar(tarball, expected):
    with gzip.GzipFile(fileobj=io.BytesIO(tarball)) as stream:
        expanded = stream.read(MAX_TAR_BYTES + 1)
    _need(len(expanded) <= MAX_TAR_BYTES, "Expanded tar exceeds its bound")
    _need(len(expanded) == expected["expandedTarBytes"] and len(expanded) % 512 == 0, "Expanded tar byte count differs")
    return expanded


def _tar_census(expanded):
    census, seen, packed_manifest = [], set(), None
    cursor = 0
    with tarfile.open(fileobj=io.BytesIO(expanded), mode="r:") as archive:
        for member in archive:
            _need(len(census) < MAX_MEMBERS, "Too many tar members")
            _package_path(member.name)
            _need(member.name not in seen, "Duplicate tar member")
            _need(member.type == tarfile.REGTYPE and not member.pax_headers
                  and member.offset == cursor and member.offset_data == cursor + 512
                  and not member.mode & 0o7000, "Tar links/extensions/nonfiles refused")
            _count(member.size, MAX_TAR_BYTES, "Tar member bytes")
            body = memoryview(expanded)[member.offset_data:member.offset_data + member.size]
            _need(len(body) == member.size, "Truncated tar member")
            census.append({"path": member.name, "size": member.size, "sha256": _sha(body)})
            seen.add(member.name)
            if member.name == "package/package.json":
                _need(member.size <= MAX_MANIFEST_BYTES, "Packed manifest exceeds bound")
                packed_manifest = _json(bytes(body), "Packed manifest")
            cursor = member.offset_data + ((member.size + 511) // 512) * 512
        _need(archive.offset == cursor, "Unaccounted tar bytes")
    _need(len(expanded) - cursor >= 1024 and not any(memoryview(expanded)[cursor:]), "Tar end markers/trailing bytes differ")
    _need(packed_manifest is not None, "Packed original manifest missing")
    return census, packed_manifest


def _inspect(zip_bytes, expected):
    _need(type(zip_bytes) is bytes and 0 < len(zip_bytes) <= MAX_ZIP_BYTES, "Bounded ZIP bytes required")
    expected = _expected(expected)
    outer = expected["sourceArtifact"]
    _need(len(zip_bytes) == outer["size_in_bytes"] and "sha256:" + _sha(zip_bytes) == outer["digest"], "Original outer ZIP size/hash differs")
    parts = _zip_parts(zip_bytes, expected)
    candidate = _candidate(parts, expected)
    manifest = _source_documents(parts, expected)
    tarball = parts[expected["archive"]["filename"]]
    identity = _archive_identity(tarball, expected["archive"])
    expanded = _expanded_tar(tarball, expected["archive"])
    census, packed = _tar_census(expanded)
    _need(census == candidate["archive"]["files"], "Ordered original member census differs")
    summary = {"memberCount": len(census), "memberBytes": sum(x["size"] for x in census),
               "expandedTarBytes": len(expanded),
               "memberCensusSha256": _sha(json.dumps(census, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))}
    _need(all(summary[k] == expected["archive"][k] for k in SUMMARY_KEYS), "Original archive member summary differs")
    _need(_json_equal(packed, manifest), "Packed manifest differs semantically from original source")
    facts = {"status": "VALIDATED_DATA_ONLY", "nativeReady": False,
             "protocol": PROTOCOL, "source": candidate["source"], "tested": candidate["tested"],
             "sourceArtifact": dict(outer), "archive": {**identity, **summary}}
    return {"facts": facts, "tarball": tarball, "source_manifest": manifest, "members": census}


def inspect_candidate(zip_bytes, expected):
    """Return original bytes/manifest plus observed facts; never grant readiness.

    The caller separately owns phase/source/producer/transport authorization.
    Malformed or mismatched data raises ValueError without filesystem effects.
    """
    try:
        return _inspect(zip_bytes, expected)
    except (zipfile.BadZipFile, tarfile.TarError, OSError, EOFError, UnicodeError,
            json.JSONDecodeError, RecursionError, struct.error) as error:
        raise ArtifactError("Malformed original AF artifact: " + type(error).__name__) from error

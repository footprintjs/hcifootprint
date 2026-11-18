"""Seal retained proof bytes and read the fixed same-run download without effects."""
import hashlib
import json
import re
from pathlib import Path
from .owned_files import OwnedFiles

MAX_FILE = 16 * 1024 * 1024
MAX_TOTAL = 64 * 1024 * 1024
MAX_FILES = 1024
SEAL = 'proof-seal.json'


def _names(root):
    names = sorted(path.name for path in root.iterdir())
    if not 0 < len(names) <= MAX_FILES:
        raise ValueError('Bounded nonempty native proof required')
    if any(not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:json|log)', name) for name in names):
        raise ValueError('Canonical flat native proof names required')
    return names


def _read(files, root, names):
    bundle, total = {}, 0
    for name in names:
        path = root / name
        files.register(path)
        raw = files.read(path, limit=min(MAX_FILE, MAX_TOTAL - total))
        total += len(raw)
        bundle[name] = raw
    files.check()
    return bundle


def read_proof(root):
    """No links, unbounded reads, extraction or downloaded code execution."""
    root = Path(root)
    files = OwnedFiles(root)
    names = _names(root)
    bundle = _read(files, root, names)
    if _names(root) != names:
        raise ValueError('Native proof file set changed during read')
    return bundle


def seal_proof(guard):
    """Join every retained proof file to the executor's recorded raw digest."""
    names = _names(guard.proof)
    if SEAL in names or set(names) != set(guard.written) or len(names) + 1 > MAX_FILES:
        raise ValueError('Native proof has missing, extra or preexisting seal files')
    bundle = _read(guard.files, guard.proof, names)
    observed = {name: hashlib.sha256(raw).hexdigest() for name, raw in bundle.items()}
    if _names(guard.proof) != names:
        raise ValueError('Native proof file set changed before sealing')
    if observed != guard.written:
        raise ValueError('Native proof changed before sealing')
    value = {'protocol': 'hcifootprint.native-proof.v1', 'files': observed}
    raw = (json.dumps(value, indent=2, sort_keys=True) + '\n').encode()
    if len(raw) > MAX_FILE or sum(map(len, bundle.values())) + len(raw) > MAX_TOTAL:
        raise ValueError('Native proof seal exceeds the retained byte budget')
    guard.write_bytes(SEAL, raw)
    if _names(guard.proof) != sorted([*names, SEAL]):
        raise ValueError('Native proof file set changed after sealing')

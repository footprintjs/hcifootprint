"""Read one exact same-run HCI proof artifact as bounded data only."""
import datetime
import hashlib
import io
import re
import stat
import struct
import urllib.error
import urllib.parse
import urllib.request
import zipfile

from .proof import MAX_FILE, MAX_FILES, MAX_TOTAL
from .transport import NoRedirect, _json, _request

REPOSITORY = 'footprintjs/hcifootprint'
REPOSITORY_ID = 1287419920
MAX_ZIP_BYTES = 32 * 1024 * 1024
MAX_ARCHIVE_MEMBERS = 20000
_PROOF_NAME = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:json|log)\Z')


def _positive(value):
    return type(value) is int and value > 0


def _context(value, token):
    if not isinstance(value, dict) or set(value) != {
            'source', 'tested', 'workflowRun', 'workflowAttempt', 'executor'}:
        raise ValueError('Closed native proof context required')
    for name, fields in [('source', {'repository', 'head', 'base', 'tree'}),
                         ('tested', {'head', 'tree'}), ('executor', {'job', 'nodeMajor'})]:
        if not isinstance(value[name], dict) or set(value[name]) != fields:
            raise ValueError('Closed native proof context role required: ' + name)
    source, executor = value['source'], value['executor']
    if source['repository'] != REPOSITORY:
        raise ValueError('Fixed HCI proof repository required')
    for digest in [source['head'], source['base'], source['tree'],
                   value['tested']['head'], value['tested']['tree']]:
        if not isinstance(digest, str) or not re.fullmatch(r'[0-9a-f]{40}', digest):
            raise ValueError('Exact native proof source identity required')
    for name in ['workflowRun', 'workflowAttempt']:
        if not isinstance(value[name], str) or not re.fullmatch(r'[1-9][0-9]*', value[name]):
            raise ValueError('Canonical positive native workflow identity required')
    if executor['job'] != 'native-source' or executor['nodeMajor'] not in ('22', '24'):
        raise ValueError('Fixed native executor role required')
    if not isinstance(token, str) or not token or any(c.isspace() or ord(c) < 32 for c in token):
        raise ValueError('Existing workflow token is unavailable')


def _run(value, context):
    if not isinstance(value, dict):
        raise ValueError('Native workflow metadata required')
    owner = value.get('repository')
    if not isinstance(owner, dict) or type(owner.get('id')) is not int or (
            owner['id'], owner.get('full_name')) != (REPOSITORY_ID, REPOSITORY):
        raise ValueError('Native workflow repository identity mismatch')
    for field, expected in [('id', int(context['workflowRun'])),
                            ('run_attempt', int(context['workflowAttempt']))]:
        if type(value.get(field)) is not int or value[field] != expected:
            raise ValueError('Native workflow identity mismatch: ' + field)
    if (not _positive(value.get('workflow_id')) or value.get('head_sha') != context['source']['head']
            or value.get('path') != '.github/workflows/native-cohort.yml'
            or value.get('name') != 'Native source cohort'
            or value.get('status') not in ('in_progress', 'completed')):
        raise ValueError('Native workflow source or workflow binding mismatch')
    conclusion = value.get('conclusion')
    terminal = ('success', 'failure', 'cancelled', 'neutral', 'skipped', 'timed_out',
                'action_required', 'stale', 'startup_failure')
    if ((value['status'] == 'in_progress' and conclusion is not None)
            or (value['status'] == 'completed' and conclusion not in terminal)):
        raise ValueError('Native workflow conclusion must be a canonical provider state')


def _page(value, field):
    if not isinstance(value, dict) or not isinstance(value.get(field), list):
        raise ValueError('Native provider page required: ' + field)
    rows, count = value[field], value.get('total_count')
    if type(count) is not int or not 0 <= count <= 100 or count != len(rows):
        raise ValueError('Incomplete native provider page: ' + field)
    ids = []
    for row in rows:
        if not isinstance(row, dict) or not _positive(row.get('id')):
            raise ValueError('Native provider row identity required: ' + field)
        ids.append(row['id'])
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate native provider identity: ' + field)
    return rows


def _time(value):
    if not isinstance(value, str) or not re.fullmatch(
            r'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z', value):
        raise ValueError('Native provider UTC timestamp required')
    return datetime.datetime.fromisoformat(value)


def _select(context, jobs, artifacts):
    node = context['executor']['nodeMajor']
    matches = [row for row in _page(jobs, 'jobs') if row.get('name') == 'native-source (' + node + ')']
    if len(matches) != 1:
        raise ValueError('Exactly one native executor job required')
    job = matches[0]
    if (type(job.get('run_id')) is not int or job['run_id'] != int(context['workflowRun'])
            or type(job.get('run_attempt')) is not int
            or job['run_attempt'] != int(context['workflowAttempt'])
            or job.get('head_sha') != context['source']['head']
            or job.get('status') != 'completed' or job.get('conclusion') != 'success'):
        raise ValueError('Successful exact-attempt native executor required')
    start, end = _time(job.get('started_at')), _time(job.get('completed_at'))
    if end < start:
        raise ValueError('Native executor time interval is invalid')
    name = 'hcifootprint-native-' + node + '-' + context['source']['head']
    matches = [row for row in _page(artifacts, 'artifacts') if row.get('name') == name]
    if len(matches) != 1:
        raise ValueError('Exactly one exact-head native proof artifact required')
    artifact = matches[0]
    owner = artifact.get('workflow_run')
    if (not isinstance(owner, dict) or type(owner.get('id')) is not int
            or owner['id'] != int(context['workflowRun'])
            or type(owner.get('repository_id')) is not int or owner['repository_id'] != REPOSITORY_ID
            or owner.get('head_sha') != context['source']['head']
            or artifact.get('expired') is not False
            or not _positive(artifact.get('size_in_bytes'))
            or artifact['size_in_bytes'] > MAX_ZIP_BYTES
            or not isinstance(artifact.get('digest'), str)
            or not re.fullmatch(r'sha256:[0-9a-f]{64}', artifact['digest'])
            or not start <= _time(artifact.get('created_at')) <= end):
        raise ValueError('Native artifact owner, digest, expiry or attempt interval mismatch')
    return job, artifact


def _download(artifact, token):
    path = 'repos/' + REPOSITORY + '/actions/artifacts/' + str(artifact['id']) + '/zip'
    opener = urllib.request.build_opener(NoRedirect())
    try:
        response = opener.open(_request(path, token))
    except urllib.error.HTTPError as error:
        if error.code != 302:
            raise
        url = error.headers.get('Location', '')
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != 'https' or not parsed.netloc or parsed.username or parsed.password:
            raise ValueError('Invalid native proof asset redirect') from error
        # A URL string deliberately carries none of the API request headers.
        response = urllib.request.urlopen(url)
    with response:
        raw = response.read(MAX_ZIP_BYTES + 1)
    digest = 'sha256:' + hashlib.sha256(raw).hexdigest()
    if len(raw) > MAX_ZIP_BYTES or len(raw) != artifact['size_in_bytes'] or digest != artifact['digest']:
        raise ValueError('Native proof ZIP bytes differ from the provider digest or size')
    return raw


def _member(raw, info):
    name = info.filename
    if (info.orig_filename != name or not name or any(ord(c) < 32 or ord(c) == 127 for c in name)
            or '\\' in name or ':' in name or any(part in ('', '.', '..') for part in name.split('/'))):
        raise ValueError('Unsafe native artifact member name')
    if not (name.startswith(('proof/', 'inputs/', 'pack/', 'npm-cache/_logs/'))):
        raise ValueError('Unexpected native artifact member root')
    mode = info.external_attr >> 16
    if stat.S_IFMT(mode) not in (0, stat.S_IFREG) or info.is_dir() or info.external_attr & 0x10:
        raise ValueError('Native artifact members must be regular files')
    allowed_flags = 0x800 | 8 | (6 if info.compress_type == zipfile.ZIP_DEFLATED else 0)
    if info.flag_bits & ~allowed_flags or info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
        raise ValueError('Unsupported native artifact ZIP flags or compression')
    # Check unread members' local names/flags too without inflating their payloads.
    offset = info.header_offset
    if offset < 0 or offset + 30 > len(raw) or raw[offset:offset + 4] != b'PK\x03\x04':
        raise ValueError('Invalid native artifact local header')
    flags, method = struct.unpack_from('<HH', raw, offset + 6)
    name_size, extra_size = struct.unpack_from('<HH', raw, offset + 26)
    start, end = offset + 30, offset + 30 + name_size
    payload = end + extra_size
    if payload + info.compress_size > len(raw) or (flags, method) != (info.flag_bits, info.compress_type):
        raise ValueError('Inconsistent native artifact local header')
    decoded = raw[start:end].decode('utf-8' if flags & 0x800 else 'cp437')
    if decoded != name:
        raise ValueError('Inconsistent native artifact local name')


def _bundle(raw):
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        members = archive.infolist()
        if not 0 < len(members) <= MAX_ARCHIVE_MEMBERS:
            raise ValueError('Native artifact member count exceeds its fixed bound')
        names, proof, total = set(), [], 0
        for info in members:
            _member(raw, info)
            if info.filename in names:
                raise ValueError('Duplicate native artifact member name')
            names.add(info.filename)
            if info.filename.startswith('proof/'):
                name = info.filename[len('proof/'):]
                if not _PROOF_NAME.fullmatch(name) or info.file_size > MAX_FILE:
                    raise ValueError('Bounded flat native proof files required')
                total += info.file_size
                proof.append((name, info))
        if not 0 < len(proof) <= MAX_FILES or total > MAX_TOTAL:
            raise ValueError('Native proof expansion exceeds its fixed bounds')
        bundle, total = {}, 0
        for name, info in proof:
            limit = min(MAX_FILE, MAX_TOTAL - total)
            with archive.open(info) as stream:
                value = stream.read(limit + 1)
            if len(value) > limit or len(value) != info.file_size:
                raise ValueError('Native proof bytes exceed advertised or fixed bounds')
            bundle[name] = value
            total += len(value)
        return bundle


def fetch_proof(context, token):
    """No extraction, execution, retry, credential fallback or whole-CI claim."""
    _context(context, token)
    path = 'repos/' + REPOSITORY + '/actions/runs/' + context['workflowRun']
    run = _json(path, token)
    _run(run, context)
    attempt = _json(path + '/attempts/' + context['workflowAttempt'], token)
    _run(attempt, context)
    if run['workflow_id'] != attempt['workflow_id']:
        raise ValueError('Native workflow identity changed across attempt metadata')
    jobs = _json(path + '/attempts/' + context['workflowAttempt'] + '/jobs?per_page=100', token)
    artifacts = _json(path + '/artifacts?per_page=100', token)
    job, artifact = _select(context, jobs, artifacts)
    raw = _download(artifact, token)
    bundle = _bundle(raw)
    facts = {'repository': REPOSITORY, 'repositoryId': REPOSITORY_ID,
             'sourceHead': context['source']['head'], 'workflowRun': context['workflowRun'],
             'workflowAttempt': context['workflowAttempt'], 'workflowId': run['workflow_id'],
             'workflowStatus': run['status'], 'workflowConclusion': run.get('conclusion'),
             'executor': {'job': 'native-source', 'nodeMajor': context['executor']['nodeMajor'],
                          'jobId': job['id'], 'status': job['status'], 'conclusion': job['conclusion']},
             'artifact': {key: artifact[key] for key in ['id', 'name', 'size_in_bytes', 'digest', 'created_at']},
             'proofFileCount': len(bundle), 'proofBytes': sum(map(len, bundle.values())),
             'wholeWorkflowReady': False}
    return bundle, facts

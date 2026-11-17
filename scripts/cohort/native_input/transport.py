"""One existing workflow-token read of the qualified original producer input."""
import json
import urllib.error
import urllib.parse
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, url):
        return None


def _request(path, token):
    return urllib.request.Request(
        'https://api.github.com/' + path,
        headers={'Authorization': 'Bearer ' + token,
                 'Accept': 'application/vnd.github+json',
                 'X-GitHub-Api-Version': '2022-11-28',
                 'User-Agent': 'hcifootprint-native-cohort'})


def _json(path, token):
    with urllib.request.urlopen(_request(path, token)) as response:
        raw = response.read(2 * 1024 * 1024 + 1)
    if len(raw) > 2 * 1024 * 1024:
        raise ValueError('Producer metadata exceeds the fixed bound')
    return json.loads(raw)


def validate_provider(expected, run, jobs, artifact):
    """The named documentation cycle cannot admit another failed producer job."""
    if expected['status'] != 'NATIVE_SOURCE_READY':
        raise ValueError('Producer is not qualified for native source use')
    if run.get('repository', {}).get('id') != expected['repositoryId']:
        raise ValueError('Producer repository identity mismatch')
    for key in ['id', 'run_attempt', 'workflow_id', 'event', 'head_branch', 'conclusion']:
        if run.get(key) != expected['run'][key]:
            raise ValueError('Producer run identity mismatch: ' + key)
    if run.get('head_sha') != expected['source']['head'] or run.get('status') != 'completed':
        raise ValueError('Producer head or terminal state mismatch')
    if jobs.get('total_count') != len(jobs.get('jobs', [])):
        raise ValueError('Incomplete producer job page')
    held = expected['heldProducerJob']
    source_job = expected['sourceJob']
    found_source = False
    found_hold = False
    for job in jobs['jobs']:
        if job.get('status') != 'completed':
            raise ValueError('Nonterminal producer job')
        if job.get('id') == source_job['id']:
            found_source = job.get('name') == source_job['name'] and job.get('conclusion') == 'success'
        if job.get('conclusion') == 'success':
            continue
        if job.get('id') != held['id'] or job.get('name') != held['name'] or job.get('conclusion') != 'failure':
            raise ValueError('Producer failure outside named documentation cycle')
        found_hold = True
    if not found_source:
        raise ValueError('Missing successful original producer package job')
    if not found_hold:
        raise ValueError('Missing exact named held producer documentation job')
    for key in ['id', 'name', 'size_in_bytes', 'digest', 'expired']:
        if artifact.get(key) != expected['sourceArtifact'][key]:
            raise ValueError('Producer artifact identity mismatch: ' + key)
    owner = artifact.get('workflow_run', {})
    if (owner.get('id') != run['id'] or owner.get('head_sha') != expected['source']['head']
            or owner.get('repository_id') != expected['repositoryId']):
        raise ValueError('Producer artifact belongs to another run/head')
    return {'run': run, 'jobs': jobs, 'artifact': artifact,
            'phase': 'NATIVE_SOURCE_READY', 'wholeProducerCI': False,
            'retainedDocumentationHold': held}


def fetch_candidate(expected, token):
    """No retry, credential fallback, registry substitution or producer rebuild."""
    if expected.get('status') != 'NATIVE_SOURCE_READY':
        raise ValueError('Producer is not qualified for native source use')
    if not token:
        raise ValueError('Existing workflow token is unavailable')
    repo = expected['repository']
    if repo != 'footprintjs/agentfootprint':
        raise ValueError('Unexpected native producer repository')
    base = 'repos/' + repo + '/actions/'
    run_id = str(expected['run']['id'])
    run = _json(base + 'runs/' + run_id, token)
    jobs = _json(base + 'runs/' + run_id + '/jobs?per_page=100', token)
    artifact_path = base + 'artifacts/' + str(expected['sourceArtifact']['id'])
    artifact = _json(artifact_path, token)
    proof = validate_provider(expected, run, jobs, artifact)
    # Never forward the workflow Authorization header to the signed asset host.
    opener = urllib.request.build_opener(NoRedirect())
    try:
        response = opener.open(_request(artifact_path + '/zip', token))
    except urllib.error.HTTPError as error:
        if error.code != 302:
            raise
        url = error.headers.get('Location', '')
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != 'https' or not parsed.netloc or parsed.username or parsed.password:
            raise ValueError('Invalid producer asset redirect') from error
        response = urllib.request.urlopen(url)
    with response:
        raw = response.read(16 * 1024 * 1024 + 1)
    if len(raw) > 16 * 1024 * 1024:
        raise ValueError('Producer ZIP exceeds fixed bound')
    return raw, proof

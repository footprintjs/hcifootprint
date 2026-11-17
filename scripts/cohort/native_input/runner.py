"""Fixed HCI native CI recipe. JSON supplies evidence, never commands or callbacks."""
import base64
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import sys
from .artifact import inspect_candidate
from .pack import inspect_hci_pack
from .installed import ConsumerGuard, join_image
from .gates import require_gates
from .config import load_input
from .source_guard import DEMOS, SourceGuard, inventory
from .transport import fetch_candidate


class NativeRun:
    def __init__(self, root, audit, expected):
        self.root, self.audit, self.input = root, audit, expected
        self.guard = SourceGuard(root, audit)
        self.installed = self.docs = False
        self.records = []
        self.consumer = None

    def identity(self, label):
        flag = '--docs' if self.docs else '--workspaces'
        path = self.guard.proof / (label + '-identity.json')
        result = subprocess.run(['node', 'scripts/cohort/identity.mjs', flag, str(self.root)],
                                cwd=self.root, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.guard.write_bytes(path.name, result.stdout)
        if result.returncode:
            self.guard.write_bytes(label + '-identity-error.log', result.stderr)
            raise ValueError('Actual physical identity refused during ' + label)
        proof = json.loads(result.stdout)
        workspace = proof['workspace'] if self.docs else proof
        actual = (self.root / 'node_modules/agentfootprint').resolve()
        for demo in workspace['workspaces'].values():
            if Path(demo['agentfootprint']).resolve() != actual:
                raise ValueError('Demo resolves another admitted AF image')
        if self.consumer is not None and self.consumer.baseline is not None:
            result = subprocess.run(['node', 'identity.mjs'], cwd=self.consumer.root,
                                    stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.guard.write_bytes(label + '-consumer-identity.json', result.stdout)
            if result.returncode:
                self.guard.write_bytes(label + '-consumer-identity-error.log', result.stderr)
                raise ValueError('Independent consumer physical identity refused during ' + label)

    def check(self, label):
        self.guard.verify(label)
        if self.consumer is not None:
            self.consumer.verify()
        if self.installed:
            self.identity(label)

    def command(self, label, argv, cwd=None, locks=(), installation=False,
                docs=False, build=False, tool=False, consumer_install=False, expected_exit=0):
        self.check(label + '-before')
        log = self.guard.proof / (label + '.log')
        with self.guard.files.new(log) as stream:
            result = subprocess.run(argv, cwd=cwd or self.root, stdout=stream, stderr=subprocess.STDOUT)
            stream.flush(); stream.seek(0); raw_log = stream.read()
        self.guard.written[log.name] = hashlib.sha256(raw_log).hexdigest()
        primary = None if result.returncode == expected_exit else subprocess.CalledProcessError(result.returncode, argv)
        after_error = None
        try:
            if primary is None:
                if locks:
                    self.guard.accept(locks)
                    for name in locks:
                        self.guard.write_bytes(label + '-' + name.replace('/', '_'), (self.root / name).read_bytes())
                if installation:
                    self.admit_installed()
                    self.installed = True
                if docs:
                    self.docs = True
                if build:
                    self.guard.admit_build()
                if tool:
                    self.guard.accept_tool_patch()
                if consumer_install:
                    self.consumer.admit(self.packed)
            self.check(label + '-after')
        except Exception as error:
            after_error = error
        record = {'label': label, 'argv': argv, 'cwd': str(cwd or self.root),
                  'exit': result.returncode, 'expectedExit': expected_exit,
                  'afterGuardError': str(after_error) if after_error else None}
        self.records.append(record)
        try:
            self.guard.write(label + '-result.json', record)
        except Exception as evidence_error:
            record['evidenceError'] = str(evidence_error)
            after_error = after_error or evidence_error
        print(json.dumps(record), flush=True)
        if primary or after_error:
            print(raw_log.decode(errors='replace')[-18000:], flush=True)
            raise primary or after_error
        return raw_log.decode(errors='strict')

    def admit_installed(self):
        join = join_image(self.root / 'node_modules/agentfootprint', self.validated['members'])
        self.guard.write('installed-original-archive-join.json', {
            'sha256': self.input['archive']['sha256'], **join})
        self.guard.admit_modules()

    def execute(self):
        token = os.environ.pop('GH_TOKEN', '')
        try:
            raw, provider = fetch_candidate(self.input, token)
        finally:
            del token
        self.guard.write('provider.json', provider)
        self.validated = inspect_candidate(raw, self.input)
        inputs = self.audit / 'inputs'
        archive = inputs / self.input['archive']['filename']
        zip_path = inputs / 'original-source.zip'
        zip_path.write_bytes(raw); archive.write_bytes(self.validated['tarball'])
        self.guard.write('original-source-data.json', self.validated['facts'])
        self.guard.admit_inputs([zip_path, archive])
        self.guard.project(archive)
        npm = ['npm', 'install', '--package-lock-only', '--ignore-scripts', '--strict-peer-deps', '--no-audit', '--no-fund']
        self.command('root-lock', npm + ['--workspaces', '--include-workspace-root'], locks=['package-lock.json'])
        self.command('docs-lock', npm, cwd=self.root / 'docs-next', locks=['docs-next/package-lock.json'])
        self.command('root-install', ['npm', 'ci', '--strict-peer-deps'], installation=True)
        self.command('native-pins', ['node', 'scripts/cohort/native_input.mjs', 'pins'])
        refused = self.command('ordinary-pins-refused', ['npm', 'run', 'test:cohort:pins'], expected_exit=1)
        if 'agentfootprint must declare a semver range' not in refused:
            raise ValueError('Ordinary checker failed for an unexpected reason')
        self.command('cohort-faults', ['npm', 'run', 'test:cohort'])
        self.command('native-fixtures', ['python3', '-m', 'unittest', 'discover', '-s', 'scripts/cohort/native_input', '-p', '*_test.py'])
        self.command('typecheck', ['npm', 'run', 'typecheck'])
        self.command('build', ['npm', 'run', 'build'], build=True)
        self.command('library-test', ['npm', 'test'])
        self.command('whole-badge', ['node', '--input-type=module', '-e',
            "import{readFileSync as r}from'node:fs';import{checkTestBadge,countTestFiles}from'./scripts/check-test-badge.mjs';"
            "const x=checkTestBadge({readme:r('README.md','utf8'),tally:JSON.parse(r('.test-tally.json','utf8')),testFileCount:countTestFiles()});"
            "if(x.verdict!=='ok')throw Error(JSON.stringify(x));console.log(JSON.stringify(x));"])
        self.guard.write_bytes('whole-library-tally.json', (self.root / '.test-tally.json').read_bytes())
        self.command('coverage', ['npm', 'run', 'test:coverage'])
        self.command('agent-guide', ['npm', 'run', 'docs:agents:check'])
        self.command('docs-toolchain', ['npm', 'run', 'docs:toolchain:check'], tool=True)
        for demo, package in zip(DEMOS, ['live-desk', 'onboarding-wizard-demo']):
            self.command(package, ['npm', 'run', 'verify', '--workspace', package])
        self.command('publint', ['npx', 'publint'])
        self.command('attw', ['npx', '@arethetypeswrong/cli', '--pack', '--profile', 'esm-only'])
        output = self.command('pack', ['npm', 'pack', '--ignore-scripts', '--pack-destination', str(self.audit / 'pack'), '--json'])
        reported = json.loads(output)
        if not isinstance(reported, list) or len(reported) != 1:
            raise ValueError('Expected the one actual HCI pack')
        packed = self.audit / 'pack' / reported[0]['filename']
        authored = json.loads(base64.b64decode(self.guard.originals['package.json']['base64']))
        self.packed = inspect_hci_pack(self.root, packed, reported[0], authored)
        self.guard.write('hci-pack.json', self.packed)
        self.guard.admit_inputs([packed], label='hci-pack')
        consumer = self.audit / 'packed-consumer'
        self.command('prepare-consumer', ['node', 'scripts/cohort/prepare-consumer.mjs', str(consumer), str(packed)])
        self.consumer = ConsumerGuard(consumer, self.guard.write)
        self.command('consumer-install', ['npm', 'install', '--ignore-scripts', '--strict-peer-deps', '--no-audit', '--no-fund'],
                     cwd=consumer, consumer_install=True)
        self.guard.write_bytes('consumer-real-lock.json', (consumer / 'package-lock.json').read_bytes())
        for gate in ['identity', 'types', 'runtime']:
            self.command('consumer-' + gate, ['npm', 'run', 'check:' + gate], cwd=consumer)
        self.command('docs-install', ['npm', 'ci', '--strict-peer-deps'], cwd=self.root / 'docs-next', docs=True)
        self.command('docs-truth', ['npm', 'run', 'docs:truth:check'])
        self.command('docs-api', ['npm', 'run', 'check:api'], cwd=self.root / 'docs-next')
        self.command('docs-build', ['npm', 'run', 'build'], cwd=self.root / 'docs-next')
        self.command('docs-links', ['node', 'scripts/check-doc-links.mjs', '--strict'])
        self.check('all-native-gates-complete')


def run_native(root):
    root = Path(root).resolve()
    if root.name != 'source':
        raise ValueError('Native execution requires the isolated source checkout')
    audit = root.parent
    with (audit / 'native-consumed').open('x') as marker:
        marker.write('one native execution; never automatically replay\n')
    if subprocess.check_output(['git', 'status', '--porcelain'], cwd=root):
        raise ValueError('Native execution requires clean exact source')
    source_head = os.environ.get('HCI_SOURCE_HEAD', '')
    source_base = os.environ.get('HCI_SOURCE_BASE', '')
    if not re.fullmatch(r'[0-9a-f]{40}', source_head) or not re.fullmatch(r'[0-9a-f]{40}', source_base):
        raise ValueError('Exact native source/base identities are unavailable')
    actual_head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    if actual_head != source_head:
        raise ValueError('Native checkout differs from the event source head')
    source = {'repository': 'footprintjs/hcifootprint', 'head': actual_head, 'base': source_base,
              'tree': subprocess.check_output(['git', 'rev-parse', 'HEAD^{tree}'], cwd=root, text=True).strip()}
    for name in ['inputs', 'pack', 'tmp', 'npm-cache']:
        (audit / name).mkdir()
    if (root / 'node_modules').exists() or (root / 'docs-next/node_modules').exists():
        raise ValueError('Native execution requires fresh install graphs')
    expected = load_input(root / 'scripts/cohort/native-input.json')
    os.environ.update(TMPDIR=str(audit / 'tmp'), NPM_CONFIG_CACHE=str(audit / 'npm-cache'),
                      NPM_CONFIG_FETCH_RETRIES='0', PYTHONDONTWRITEBYTECODE='1',
                      PYTHONPATH=str(root / 'scripts/cohort'))
    run = NativeRun(root, audit, expected)
    primary = cleanup = None
    try:
        run.execute()
        require_gates(run.records)
    except BaseException as error:
        primary = error
    finally:
        try:
            run.guard.restore()
        except BaseException as error:
            cleanup = error
        versions, diagnostic_errors = {}, {}
        interrupted = any(error is not None and not isinstance(error, Exception)
                          for error in [primary, cleanup])
        for name in ['node', 'npm']:
            try:
                versions[name] = subprocess.check_output([name, '--version'], text=True).strip()
            except BaseException as error:
                versions[name] = None
                diagnostic_errors[name] = {'type': type(error).__name__, 'message': str(error)}
                interrupted = interrupted or not isinstance(error, Exception)
        result = {'protocol': 'hcifootprint.native-result.v1',
                  'status': ('unknown-interrupted' if interrupted else
                             'passed' if primary is None and cleanup is None and not diagnostic_errors else 'failed'),
                  'primaryError': {'type': type(primary).__name__, 'message': str(primary)} if primary else None,
                  'restorationError': {'type': type(cleanup).__name__, 'message': str(cleanup)} if cleanup else None,
                  'node': versions['node'], 'npm': versions['npm'], 'diagnosticErrors': diagnostic_errors,
                  'python': sys.version,
                  'source': source,
                  'workflowRun': os.environ.get('GITHUB_RUN_ID'),
                  'workflowAttempt': os.environ.get('GITHUB_RUN_ATTEMPT'),
                  'input': expected, 'commands': run.records,
                  'ordinaryRegistryReady': False, 'producerWholeCIReady': False}
        try:
            run.guard.write('native-result.json', result)
        except BaseException as evidence_error:
            result['evidenceError'] = {'type': type(evidence_error).__name__, 'message': str(evidence_error)}
            result['status'] = ('unknown-interrupted' if interrupted or not isinstance(evidence_error, Exception)
                                else 'failed')
            cleanup = cleanup or evidence_error
        print(json.dumps(result), flush=True)
    return 0 if result['status'] == 'passed' else 1

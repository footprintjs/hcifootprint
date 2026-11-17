"""Guard authored HCI bytes separately from the finite temporary install outputs."""
import base64
import copy
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
from .tool_patch import patched_bytes
from .owned_files import OwnedFiles


ORIGINALS = ('package.json', 'package-lock.json', 'demos/live-desk/package.json',
             'demos/onboarding-wizard/package.json', 'docs-next/package.json',
             'docs-next/package-lock.json')
DEMOS = ('demos/live-desk', 'demos/onboarding-wizard')
GENERATED = ('dist', 'coverage', '.test-tally.json', 'demos/live-desk/dist',
             'demos/onboarding-wizard/dist', 'docs-next/.next', 'docs-next/.source',
             'docs-next/tsconfig.tsbuildinfo', 'demos/live-desk/tsconfig.tsbuildinfo',
             'demos/live-desk/tsconfig.node.tsbuildinfo',
             'demos/onboarding-wizard/tsconfig.tsbuildinfo',
             'demos/onboarding-wizard/tsconfig.node.tsbuildinfo')


def digest(path):
    meta = path.lstat()
    if path.is_symlink():
        return {'kind': 'link', 'target': os.readlink(path), 'mode': stat.S_IMODE(meta.st_mode)}
    if path.is_dir():
        return {'kind': 'directory', 'mode': stat.S_IMODE(meta.st_mode)}
    if not path.is_file():
        raise ValueError('Unsupported source file kind: ' + str(path))
    raw = path.read_bytes()
    return {'kind': 'file', 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'mode': stat.S_IMODE(meta.st_mode)}


def inventory(root, omitted=()):
    """Include hidden source entries; omitted roles are explicitly guarded elsewhere."""
    found = {}
    if not root.exists():
        return found
    def visit(path, relative):
        if relative in omitted or path.name == 'node_modules' or relative == '.git':
            return
        found[relative] = digest(path)
        if path.is_dir() and not path.is_symlink():
            for child in sorted(path.iterdir()):
                visit(child, child.name if relative == '.' else relative + '/' + child.name)
    visit(root, '.')
    return found


class SourceGuard:
    def __init__(self, root, audit):
        self.root, self.audit = Path(root).resolve(), Path(audit).resolve()
        self.proof = self.audit / 'proof'
        self.proof.mkdir(exist_ok=True)
        self.files = OwnedFiles(self.audit)
        self.files.register(self.proof / 'anchor')
        self.originals = {}
        for name in ORIGINALS:
            path = self.root / name
            if not path.is_file() or path.is_symlink() or path.resolve() != path:
                raise ValueError('Canonical regular authored input required: ' + name)
            self.files.register(path)
            self.originals[name] = {'base64': base64.b64encode(self.files.read(path)).decode(),
                                    'mode': stat.S_IMODE(path.stat().st_mode)}
        self.expected = inventory(self.root, GENERATED)
        self.baseline = copy.deepcopy(self.expected)
        self.generated_present = {name: (self.root / name).exists() for name in GENERATED}
        # The run starts from its fresh isolated checkout, never an existing working project.
        if any(self.generated_present.values()):
            raise ValueError('Native execution requires absent generated-output baselines')
        self.expected_modules = {}
        self.expected_inputs = {}
        self.tool_original = None
        self.tool_expected = None
        self.tool_baseline = None
        self.expected_build = None
        self.written = {}
        self.write('source-originals.json', self.originals)
        self.write('source-baseline.json', self.expected)

    def write(self, name, value):
        raw = (json.dumps(value, indent=2, sort_keys=True) + '\n').encode()
        self.write_bytes(name, raw)

    def write_bytes(self, name, raw):
        path = self.proof / name
        with self.files.new(path) as stream:
            stream.write(raw)
        self.written[name] = hashlib.sha256(raw).hexdigest()

    def accept(self, names):
        """Only code-owned projection/lock transitions may update these expectations."""
        allowed = {'package-lock.json', 'docs-next/package-lock.json',
                   *(demo + '/package.json' for demo in DEMOS)}
        if not set(names).issubset(allowed):
            raise ValueError('Unexpected authored transition')
        for name in names:
            self.files.read(self.root / name)
            self.expected[name] = digest(self.root / name)

    def verify(self, label):
        self.files.check()
        for name, expected in self.written.items():
            if hashlib.sha256(self.files.read(self.proof / name)).hexdigest() != expected:
                raise ValueError('Retained native proof changed: ' + name)
        actual = inventory(self.root, GENERATED)
        self.write(label + '-guard.json', {'sourceInventorySha256': hashlib.sha256(
            json.dumps(actual, sort_keys=True).encode()).hexdigest(), 'matchesExpected': actual == self.expected})
        if actual != self.expected:
            self.write(label + '-changed-source.json', actual)
            raise ValueError('Authored/untracked source changed during ' + label)
        for path, expected in self.expected_inputs.items():
            if digest(Path(path)) != expected:
                raise ValueError('Original native input changed: ' + path)
        if self.tool_expected is not None:
            if digest(self.root / 'node_modules/typedoc/dist/node-utils.js') != self.tool_expected:
                raise ValueError('Documentation tool leaf changed outside its authored patch')
        if self.expected_build is not None and inventory(self.root / 'dist') != self.expected_build:
            raise ValueError('Admitted library build changed')
        for name, expected in self.expected_modules.items():
            actual_image = self.module_inventory(name)
            if actual_image != expected:
                raise ValueError('Admitted installed image changed: ' + name)

    def module_inventory(self, name):
        omitted = ('dist/node-utils.js',) if name == 'node_modules/typedoc' else ()
        return inventory(self.root / name, omitted)

    def admit_inputs(self, paths, label='original'):
        for path in paths: self.files.register(path)
        self.expected_inputs.update({str(path): digest(Path(path)) for path in paths})
        self.write(label + '-inputs.json', self.expected_inputs)

    def fresh_locks(self):
        """Generate genuine native graphs without reusing stale registry selections."""
        self.verify('fresh-lock-baseline-before')
        for name in ['package-lock.json', 'docs-next/package-lock.json']:
            self.files.remove_generated(self.root / name)
            del self.expected[name]
        self.verify('fresh-lock-baseline-after')

    def project(self, archive):
        for demo in DEMOS:
            name = demo + '/package.json'
            original = json.loads(base64.b64decode(self.originals[name]['base64']))
            if original['dependencies']['hcifootprint'] != 'file:../..':
                raise ValueError('Unexpected authored demo HCI link')
            original['dependencies']['agentfootprint'] = 'file:' + str(Path(archive).resolve())
            self.files.replace(self.root / name, (json.dumps(original, indent=2) + '\n').encode(), self.originals[name]['mode'])
        self.accept([demo + '/package.json' for demo in DEMOS])
        self.write('projected-manifests.json', {demo: json.loads((self.root / demo / 'package.json').read_text())
                                               for demo in DEMOS})

    def admit_modules(self):
        for name in ['node_modules/agentfootprint', 'node_modules/footprintjs', 'node_modules/foottrace',
                     'node_modules/typescript', 'node_modules/vite', 'node_modules/vitest',
                     'node_modules/esbuild', 'node_modules/typedoc']:
            image = self.root / name
            if not image.is_dir() or image.is_symlink() or image.resolve() != image:
                raise ValueError('Expected actual installed native image: ' + name)
            self.expected_modules[name] = self.module_inventory(name)
        self.write('installed-images.json', self.expected_modules)
        leaf = self.root / 'node_modules/typedoc/dist/node-utils.js'
        self.files.register(leaf)
        self.tool_original = self.files.read(leaf)
        self.tool_expected = digest(leaf)
        self.tool_baseline = copy.deepcopy(self.tool_expected)
        self.write('typedoc-before.json', digest(leaf))
        compiler = self.root / 'node_modules/typescript'
        command = self.root / 'node_modules/.bin/tsc'
        locked = json.loads((self.root / 'package-lock.json').read_text())['packages']['node_modules/typescript']['version']
        actual = json.loads((compiler / 'package.json').read_text())['version']
        if actual != locked or command.resolve() != (compiler / 'bin/tsc').resolve():
            raise ValueError('Root compiler does not match the genuine lock/image')
        self.admit_inputs([command], label='root-compiler')
        self.write('root-compiler.json', {'version': actual, 'image': str(compiler.resolve()), 'command': digest(command)})

    def accept_tool_patch(self):
        leaf = 'node_modules/typedoc/dist/node-utils.js'
        patches = list((self.root / 'patches').glob('typedoc+*.patch'))
        if self.tool_original is None or len(patches) != 1:
            raise ValueError('Missing original documentation tool/patch')
        if self.files.read(self.root / leaf) != patched_bytes(self.tool_original, patches[0].read_text(), leaf):
            raise ValueError('Documentation tool differs from entire authored patch')
        if digest(self.root / leaf)['mode'] != self.tool_baseline['mode']:
            raise ValueError('Documentation tool patch changed its mode')
        self.tool_expected = digest(self.root / leaf)
        self.write('typedoc-patched.json', self.tool_expected)

    def admit_build(self):
        self.expected_build = inventory(self.root / 'dist')
        if not self.expected_build:
            raise ValueError('Missing explicit library build')
        self.write('built-dist.json', self.expected_build)

    def restore(self):
        """Restore raw originals and original absences; do not claim installed images absent."""
        before = inventory(self.root, GENERATED)
        self.write('source-before-restoration.json', before)
        # Preflight every admitted parent before the first recovery write/removal.
        self.files.check()
        for name, original in self.originals.items():
            path = self.root / name
            self.files.replace(path, base64.b64decode(original['base64']), original['mode'])
        for name in GENERATED:
            self.files.remove_generated(self.root / name)
        if self.tool_original is not None:
            leaf = self.root / 'node_modules/typedoc/dist/node-utils.js'
            self.files.replace(leaf, self.tool_original, self.tool_baseline['mode'])
            if digest(leaf) != self.tool_baseline:
                raise ValueError('Documentation tool restoration failed')
            self.write('typedoc-restored.json', digest(leaf))
        after = inventory(self.root, GENERATED)
        self.write('source-after-restoration.json', after)
        if after != self.baseline or any(os.path.lexists(self.root / name) for name in GENERATED):
            raise ValueError('Native source restoration failed')
        self.write('restoration.json', {'authoredAndAbsencesRestored': True,
                                        'installedImagesRetained': list(self.expected_modules)})

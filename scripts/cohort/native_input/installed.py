"""Join installed members to originals and preserve the independent consumer graph."""
import hashlib
import json
from pathlib import Path
from .source_guard import digest, inventory


def join_image(image, members, prefix='package/'):
    image = Path(image)
    if image.is_symlink() or not image.is_dir() or image.resolve() != image:
        raise ValueError('Expected a regular installed package, not a source link')
    image = image.resolve()
    expected = set()
    for member in members:
        relative = member['path'].removeprefix(prefix)
        path = image / relative
        if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(image):
            raise ValueError('Missing or escaped installed archive member: ' + relative)
        raw = path.read_bytes()
        if len(raw) != member['size'] or hashlib.sha256(raw).hexdigest() != member['sha256']:
            raise ValueError('Installed member differs from original archive: ' + relative)
        expected.add(relative)
    found = {name for name, entry in inventory(image).items() if entry['kind'] != 'directory'}
    if found != expected:
        raise ValueError('Installed member set differs from original archive')
    return {'image': str(image), 'members': len(expected)}


class ConsumerGuard:
    SPECIMENS = ('package.json', 'public-imports.json', 'tsconfig.json', 'identity.mjs', 'runtime.mjs', 'types.mts')

    def __init__(self, root, write):
        self.root, self.write = root, write
        self.specimens = {name: digest(root / name) for name in self.SPECIMENS}
        if set(inventory(root)) != {'.', *self.SPECIMENS}:
            raise ValueError('Consumer preparation produced unexpected source files')
        self.baseline = self.images = self.lock = None
        self.write('consumer-original-specimens.json', self.specimens)

    def verify(self):
        for name, expected in self.specimens.items():
            if digest(self.root / name) != expected:
                raise ValueError('Original consumer manifest/specimen/compiler changed: ' + name)
        if self.baseline is not None and inventory(self.root) != self.baseline:
            raise ValueError('Independent consumer source/setup changed')
        for name, expected in (self.images or {}).items():
            if inventory(self.root / 'node_modules' / name) != expected:
                raise ValueError('Independent consumer installed image changed: ' + name)
        if self.lock is not None and digest(self.root / 'node_modules/.package-lock.json') != self.lock:
            raise ValueError('Independent consumer hidden lock changed')

    def admit(self, packed):
        self.verify()
        if set(inventory(self.root)) != {'.', *self.SPECIMENS, 'package-lock.json'}:
            raise ValueError('Consumer install produced unexpected source files')
        manifest = json.loads((self.root / 'package.json').read_text())
        join = join_image(self.root / 'node_modules/hcifootprint', packed['files'], '')
        self.write('consumer-packed-member-join.json', join)
        compiler = self.root / 'node_modules/typescript'
        actual = json.loads((compiler / 'package.json').read_text())
        if actual['version'] != manifest['devDependencies']['typescript']:
            raise ValueError('Consumer compiler differs from the actual prepared pin')
        command = self.root / 'node_modules/.bin/tsc'
        if command.resolve() != (compiler / 'bin/tsc').resolve():
            raise ValueError('Consumer types command resolves another compiler')
        self.baseline = inventory(self.root)
        self.images = {name: inventory(self.root / 'node_modules' / name)
                       for name in ['hcifootprint', 'footprintjs', 'foottrace', 'typescript']}
        self.lock = digest(self.root / 'node_modules/.package-lock.json')
        self.write('consumer-compiler.json', {'version': actual['version'], 'image': str(compiler.resolve()),
                                              'command': digest(command), 'config': self.specimens['tsconfig.json']})
        self.write('consumer-installed-images.json', self.images)

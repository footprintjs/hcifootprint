"""Descriptor-relative writes/removal inside admitted directory identities only."""
import hashlib
import os
from pathlib import Path
import shutil
import stat


class OwnedFiles:
    def __init__(self, root):
        self.root = Path(root)
        self.directories = {}
        self.register(self.root / 'anchor')

    def parts(self, path):
        parts = Path(path).parent.relative_to(self.root).parts
        if any(part in ('.', '..') for part in parts):
            raise ValueError('Noncanonical owned path')
        return parts

    def register(self, path):
        cursor = self.root
        for part in (None, *self.parts(path)):
            if part is not None: cursor = cursor / part
            meta = cursor.lstat()
            if not stat.S_ISDIR(meta.st_mode):
                raise ValueError('Owned parent is not a canonical directory')
            key = cursor.relative_to(self.root).as_posix()
            identity = (meta.st_dev, meta.st_ino)
            if key in self.directories and self.directories[key] != identity:
                raise ValueError('Owned parent directory was replaced')
            self.directories[key] = identity

    def parent(self, path):
        flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
        descriptor = os.open(self.root, flags)
        key = '.'
        try:
            for part in (None, *self.parts(path)):
                if part is not None:
                    child = os.open(part, flags, dir_fd=descriptor)
                    os.close(descriptor); descriptor = child
                    key = part if key == '.' else key + '/' + part
                actual = os.fstat(descriptor)
                if self.directories.get(key) != (actual.st_dev, actual.st_ino):
                    raise ValueError('Owned parent identity changed')
            return descriptor
        except BaseException:
            os.close(descriptor)
            raise

    def check(self):
        for directory in self.directories:
            descriptor = self.parent(self.root / directory / 'anchor')
            os.close(descriptor)

    def new(self, path):
        descriptor = self.parent(path)
        try:
            leaf = os.open(Path(path).name, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                           0o600, dir_fd=descriptor)
            return os.fdopen(leaf, 'w+b')
        finally:
            os.close(descriptor)

    def read(self, path):
        descriptor = self.parent(path)
        try:
            leaf = os.open(Path(path).name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=descriptor)
            with os.fdopen(leaf, 'rb') as stream:
                if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                    raise ValueError('Owned regular file required')
                return stream.read()
        finally:
            os.close(descriptor)

    def replace(self, path, raw, mode):
        path = Path(path); descriptor = self.parent(path)
        temporary = '.hci-restore-' + hashlib.sha256(str(path.relative_to(self.root)).encode()).hexdigest()
        created = False
        try:
            leaf = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                           0o600, dir_fd=descriptor)
            created = True
            with os.fdopen(leaf, 'wb') as stream:
                stream.write(raw); stream.flush(); os.fsync(stream.fileno()); os.fchmod(stream.fileno(), mode)
            # Replacing a leaf never follows a substituted symlink or modifies a hardlink target.
            os.replace(temporary, path.name, src_dir_fd=descriptor, dst_dir_fd=descriptor)
        finally:
            if created:
                try: os.unlink(temporary, dir_fd=descriptor)
                except FileNotFoundError: pass
            os.close(descriptor)

    def remove_generated(self, path):
        path = Path(path); descriptor = self.parent(path)
        try:
            try: meta = os.stat(path.name, dir_fd=descriptor, follow_symlinks=False)
            except FileNotFoundError: return
            if stat.S_ISDIR(meta.st_mode):
                if not shutil.rmtree.avoids_symlink_attacks:
                    raise ValueError('Safe owned-directory cleanup is unavailable')
                shutil.rmtree(path.name, dir_fd=descriptor)
            else:
                os.unlink(path.name, dir_fd=descriptor)
        finally:
            os.close(descriptor)

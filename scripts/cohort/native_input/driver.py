"""Private fixed bootstrap, reached only through the owning native facade."""
from pathlib import Path
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from native_input.runner import run_native

if __name__ == '__main__':
    if len(sys.argv) != 1:
        raise ValueError('Native bootstrap accepts no caller selectors')
    raise SystemExit(run_native(Path(__file__).resolve().parents[3]))

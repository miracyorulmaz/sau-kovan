"""Load only documented local Kovan settings; process environment takes precedence."""
import os
from pathlib import Path

ALLOWED_KEYS = {"KOVAN_DATA_DIR", "KOVAN_COOKIE_SECURE", "KOVAN_ALLOWED_ORIGINS"}


def load_local_environment(root: Path):
    path = root / ".env"
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip()
        if key not in ALLOWED_KEYS:
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(key, value)

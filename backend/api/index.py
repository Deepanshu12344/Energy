"""Vercel Serverless Function entrypoint.

Vercel standard routing executes files in `api/` via `@vercel/python`.
"""

import sys
import types
from pathlib import Path

# Resolve import path so that both 'from backend.app...' and 'from app...' work
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [backend_dir]
    sys.modules["backend"] = backend_pkg

from backend.app.main import app  # noqa: E402

__all__ = ["app"]

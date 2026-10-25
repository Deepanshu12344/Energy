"""Vercel and Docker root entrypoint for the FastAPI application.

Resolves package module resolution so that `from backend.app...` imports continue
to resolve seamlessly even when `backend/` is the container/serverless project root.
"""

import sys
import types
from pathlib import Path

# Resolve import path so that both 'from backend.app...' and 'from app...' work
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [backend_dir]
    sys.modules["backend"] = backend_pkg

from backend.app.main import app  # noqa: E402

__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

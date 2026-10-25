"""FastAPI routers package."""

from .distribution import router as distribution_router
from .forecast import router as forecast_router
from .health import router as health_router
from .horizon import router as horizon_router
from .meta import router as meta_router
from .metrics import router as metrics_router

__all__ = [
    "health_router",
    "meta_router",
    "forecast_router",
    "metrics_router",
    "distribution_router",
    "horizon_router",
]

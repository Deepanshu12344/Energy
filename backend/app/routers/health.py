"""Health check endpoint router."""

from datetime import datetime, timezone
from fastapi import APIRouter
from backend.app.data.database import check_connection
from backend.app.models.responses import HealthResponse

router = APIRouter(prefix="/api", tags=["System"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Check service health and database connectivity."""
    db_ok = check_connection()
    status = "ok" if db_ok else "degraded"
    return HealthResponse(
        status=status,
        database_connected=db_ok,
        timestamp=datetime.now(timezone.utc),
    )

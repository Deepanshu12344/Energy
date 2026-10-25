"""PostgreSQL connection pool management with Supabase pooler support."""

from contextlib import contextmanager
import logging
from typing import Generator, Optional
import psycopg
from psycopg_pool import ConnectionPool
from backend.app.config import settings

logger = logging.getLogger("database")

_pool: Optional[ConnectionPool] = None


def init_pool() -> ConnectionPool:
    """Initialize and open the database connection pool."""
    global _pool
    if _pool is not None and not _pool.closed:
        return _pool

    if not settings.DATABASE_URL:
        logger.warning("DATABASE_URL is not set; connection pool cannot be initialized.")
        raise ValueError("DATABASE_URL must be set to initialize database connection pool.")

    logger.info("Initializing psycopg ConnectionPool (min_size=0, max_size=2, prepare_threshold=None)...")
    _pool = ConnectionPool(
        conninfo=settings.DATABASE_URL,
        min_size=0,
        max_size=2,
        timeout=10.0,
        kwargs={"prepare_threshold": None, "autocommit": False},
        open=True,
    )
    return _pool


def close_pool() -> None:
    """Close the connection pool on application shutdown."""
    global _pool
    if _pool is not None and not _pool.closed:
        logger.info("Closing database connection pool...")
        _pool.close()
        _pool = None


def get_pool() -> ConnectionPool:
    """Retrieve active connection pool, initializing if necessary."""
    global _pool
    if _pool is None or _pool.closed:
        _pool = init_pool()
    return _pool


@contextmanager
def get_db_connection() -> Generator[psycopg.Connection, None, None]:
    """Context manager providing a checked-out connection from the pool."""
    pool = get_pool()
    with pool.connection() as conn:
        try:
            yield conn
        except Exception:
            conn.rollback()
            raise


def check_connection() -> bool:
    """Check database liveness by running a lightweight query."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                res = cur.fetchone()
                return res is not None and res[0] == 1
    except Exception as exc:
        logger.error("Database health check failed: %s", exc)
        return False

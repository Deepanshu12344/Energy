"""FastAPI application initialization, routing, lifespan, and error handling."""

from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, Response
from backend.app.config import settings
from backend.app.data.database import close_pool, init_pool
from backend.app.models.responses import ErrorResponse
from backend.app.routers import (
    distribution_router,
    forecast_router,
    health_router,
    horizon_router,
    meta_router,
    metrics_router,
)

logger = logging.getLogger("api")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Handle database connection pool lifecycle (lazy initialization, graceful shutdown)."""
    logger.info("Starting up FastAPI application...")
    yield
    logger.info("Shutting down FastAPI application...")
    close_pool()


app = FastAPI(
    title="Wind Generation Forecast Monitoring API",
    description=(
        "API for monitoring and evaluating UK National Grid Elexon wind generation "
        "forecasts (WINDFOR) against actuals (FUELHH) for delivery days in January 2026."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
# Allow explicit origins from settings, all *.vercel.app preview & production domains and local origins via regex,
# and disable allow_credentials because this public analytics API uses no auth cookies or sessions.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_origin_regex=r"^(https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1)(:\d+)?)$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(health_router)
app.include_router(meta_router)
app.include_router(forecast_router)
app.include_router(metrics_router)
app.include_router(distribution_router)
app.include_router(horizon_router)


@app.get("/", include_in_schema=False)
def root_redirect():
    """Redirect root to interactive API documentation."""
    return RedirectResponse(url="/docs")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Handle browser favicon request with 204 No Content."""
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Format Pydantic request validation errors into standard ErrorResponse."""
    error_details = []
    for err in exc.errors():
        field_path = " -> ".join(str(loc) for loc in err.get("loc", []))
        msg = err.get("msg", "")
        error_details.append(f"{field_path}: {msg}")
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=ErrorResponse(
            error="VALIDATION_ERROR",
            detail="; ".join(error_details),
            status_code=status.HTTP_400_BAD_REQUEST,
        ).model_dump(),
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """Handle ValueErrors as 400 Bad Request."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=ErrorResponse(
            error="VALIDATION_ERROR",
            detail=str(exc),
            status_code=status.HTTP_400_BAD_REQUEST,
        ).model_dump(),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Format HTTPExceptions into standard ErrorResponse."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error="HTTP_ERROR",
            detail=str(exc.detail),
            status_code=exc.status_code,
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Format unhandled server exceptions into 500 ErrorResponse."""
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="INTERNAL_SERVER_ERROR",
            detail="An internal server error occurred.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        ).model_dump(),
    )

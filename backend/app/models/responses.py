"""Pydantic schemas for API response payloads."""

from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


SlotStatus = Literal["forecast_selected", "not_applicable", "missing"]


class ComparisonItem(BaseModel):
    """Single time slot comparison between actual and selected forecast."""

    start_time: datetime = Field(description="UTC start timestamp of interval")
    actual_mw: Optional[float] = Field(default=None, description="Actual generation in MW (None if missing)")
    forecast_mw: Optional[float] = Field(default=None, description="Selected forecast generation in MW (None if missing or not applicable)")
    publish_time: Optional[datetime] = Field(default=None, description="Publication timestamp of selected forecast")
    lead_time_hours: Optional[float] = Field(default=None, description="Forecast lead time in hours (start_time - publish_time)")
    error_mw: Optional[float] = Field(default=None, description="Forecast error in MW (forecast_mw - actual_mw)")
    abs_error_mw: Optional[float] = Field(default=None, description="Absolute error in MW (|forecast_mw - actual_mw|)")
    error_pct: Optional[float] = Field(default=None, description="Percentage error relative to actual (|error| / actual * 100)")
    status: SlotStatus = Field(
        description="Slot status: 'forecast_selected' (hourly forecast found), "
                    "'not_applicable' (:30 slot, WINDFOR is hourly), or 'missing' (hourly slot with no forecast before cutoff)"
    )
    is_actual_missing: bool = Field(default=False, description="True if actual generation outturn was missing")


class ForecastComparisonResponse(BaseModel):
    """Payload for GET /api/forecast."""

    delivery_date: date = Field(description="Target delivery date (YYYY-MM-DD)")
    cutoff_time: str = Field(description="D-1 decision cutoff time (HH:MM Europe/London)")
    cutoff_timestamp_utc: datetime = Field(description="Exact UTC cutoff timestamp used for selection")
    total_slots: int = Field(description="Total half-hour slots in delivery day (48)")
    hourly_slots: int = Field(default=24, description="Total hourly candidate slots in delivery day (24)")
    matched_slots: int = Field(description="Number of hourly slots with status 'forecast_selected' and actual present")
    missing_slots: int = Field(description="Number of hourly slots with status 'missing' (no forecast at/before cutoff)")
    not_applicable_slots: int = Field(default=24, description="Number of :30 slots with status 'not_applicable'")
    data: List[ComparisonItem] = Field(description="Ordered list of 48 half-hour comparison items for the day")


class AccuracyMetrics(BaseModel):
    """Summary forecast accuracy metrics evaluated on matched hourly timestamps."""

    mae: Optional[float] = Field(default=None, description="Mean Absolute Error in MW")
    rmse: Optional[float] = Field(default=None, description="Root Mean Squared Error in MW")
    bias: Optional[float] = Field(default=None, description="Mean Error in MW (forecast - actual; positive means over-forecast)")
    mape: Optional[float] = Field(default=None, description="Mean Absolute Percentage Error (%) guarded against near-zero actuals")
    mape_excluded_count: int = Field(default=0, description="Count of observations excluded from MAPE because actual < 10 MW")
    p50_abs_error: Optional[float] = Field(default=None, description="50th percentile (median) absolute error in MW (linear interpolation)")
    p90_abs_error: Optional[float] = Field(default=None, description="90th percentile absolute error in MW (linear interpolation)")
    p95_abs_error: Optional[float] = Field(default=None, description="95th percentile absolute error in MW (linear interpolation)")
    buffer_recommendation_mw_p90: Optional[float] = Field(default=None, description="Recommended operating reserve buffer in MW (P90 absolute error)")
    total_slots: int = Field(description="Total hourly slots in date range (24 per day)")
    evaluated_slots: int = Field(description="Number of paired hourly slots used to calculate metrics")
    missing_slots: int = Field(description="Hourly slots excluded due to missing forecast or actual")


class MetricsResponse(BaseModel):
    """Payload for GET /api/metrics."""

    start_date: date = Field(description="Start date of evaluation range")
    end_date: date = Field(description="End date of evaluation range")
    cutoff_time: str = Field(description="Configured decision cutoff time")
    metrics: AccuracyMetrics = Field(description="Calculated accuracy metrics")


class HourlyErrorItem(BaseModel):
    """Accuracy metrics aggregated by delivery hour of day (0 to 23)."""

    hour: int = Field(ge=0, le=23, description="Hour of the delivery day (0 to 23)")
    count: int = Field(description="Number of paired forecast-actual observations in this hour")
    mae: Optional[float] = Field(default=None, description="Mean Absolute Error in MW")
    rmse: Optional[float] = Field(default=None, description="Root Mean Squared Error in MW")
    bias: Optional[float] = Field(default=None, description="Mean error in MW")


class ErrorByHourResponse(BaseModel):
    """Payload for GET /api/error-by-hour."""

    start_date: date = Field(description="Start date of evaluation range")
    end_date: date = Field(description="End date of evaluation range")
    cutoff_time: str = Field(description="Configured decision cutoff time")
    hourly_errors: List[HourlyErrorItem] = Field(description="List of accuracy metrics for each hour 0..23")


class HorizonBucket(BaseModel):
    """Accuracy metrics aggregated by forecast lead time horizon bucket."""

    horizon_bucket: str = Field(description="Lead time range (e.g. '<12h', '12-18h', '18-24h', '24-36h', '36-48h', '>48h', 'published_after_target')")
    count: int = Field(description="Number of forecasts in this bucket")
    mae: Optional[float] = Field(default=None, description="Mean Absolute Error in MW")
    rmse: Optional[float] = Field(default=None, description="Root Mean Squared Error in MW")
    bias: Optional[float] = Field(default=None, description="Mean error in MW")


class HorizonAnalysisResponse(BaseModel):
    """Payload for GET /api/horizon-analysis."""

    start_date: date = Field(description="Start date of evaluation range")
    end_date: date = Field(description="End date of evaluation range")
    main_buckets: List[HorizonBucket] = Field(description="Forward-looking horizon buckets (positive lead times)")
    after_target_bucket: Optional[HorizonBucket] = Field(default=None, description="Forecasts published after target delivery (negative lead times)")
    buckets: List[HorizonBucket] = Field(description="All forward-looking buckets")


class ErrorDistributionBin(BaseModel):
    """Histogram bin representing a range of forecast errors in MW."""

    bin_min: float = Field(description="Lower bound of error bin in MW (inclusive)")
    bin_max: float = Field(description="Upper bound of error bin in MW (inclusive/exclusive)")
    bin_label: str = Field(description="Human-readable label for bin interval, e.g. '+1000 to +2000 MW'")
    count: int = Field(description="Frequency count of hourly observations in this bin")


class ErrorDistributionResponse(BaseModel):
    """Payload for GET /api/error-distribution."""

    start_date: date = Field(description="Start date of evaluation range")
    end_date: date = Field(description="End date of evaluation range")
    cutoff_time: str = Field(description="Configured decision cutoff time")
    total_samples: int = Field(description="Total evaluated hourly forecast errors")
    min_error_mw: Optional[float] = Field(default=None, description="Minimum error in MW across range")
    max_error_mw: Optional[float] = Field(default=None, description="Maximum error in MW across range")
    over_forecast_count: int = Field(default=0, description="Count of evaluated hours where forecast > actual")
    over_forecast_share: Optional[float] = Field(default=None, description="Proportion of evaluated hours where forecast > actual (0.0 to 1.0)")
    bins: List[ErrorDistributionBin] = Field(description="Histogram bins computed dynamically between min and max error")


class MetaResponse(BaseModel):
    """Payload for GET /api/meta."""

    available_start_date: str = Field(description="Earliest available delivery date")
    available_end_date: str = Field(description="Latest available delivery date")
    default_cutoff_time: str = Field(description="Default decision cutoff time (HH:MM)")
    actual_rows_count: int = Field(description="Total actuals records in database")
    forecast_rows_count: int = Field(description="Total forecast records in database")
    timezone: str = Field(default="Europe/London", description="Business operational timezone")
    resolution_notes: Dict[str, Any] = Field(description="Documentation of resolution alignment and matching rules")


class HealthResponse(BaseModel):
    """Payload for GET /api/health."""

    status: str = Field(default="ok", description="Service health status ('ok' or 'degraded')")
    database_connected: bool = Field(description="Whether the Supabase PostgreSQL connection succeeds")
    timestamp: datetime = Field(description="UTC timestamp of the health check")


class ErrorResponse(BaseModel):
    """Consistent error payload across all endpoints."""

    error: str = Field(description="Short error code or description")
    detail: Optional[str] = Field(default=None, description="Detailed explanatory error message")
    status_code: int = Field(description="HTTP status code")

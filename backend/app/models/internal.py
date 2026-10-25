"""Pydantic schemas for internal, cleaned database representation of actuals and forecasts."""

from datetime import date, datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class ActualRecord(BaseModel):
    """Cleaned wind actuals record corresponding to the `wind_actuals` table."""

    start_time: datetime = Field(description="UTC start timestamp of 30-minute settlement period")
    generation_mw: float = Field(ge=0.0, description="Average generation in MW (non-negative)")
    settlement_date: Optional[date] = Field(default=None, description="Settlement date")
    settlement_period: Optional[int] = Field(default=None, ge=1, le=50, description="Settlement period (1-50)")
    created_at: Optional[datetime] = Field(default=None, description="Ingestion timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")

    @field_validator("start_time", "created_at", "updated_at")
    @classmethod
    def ensure_utc(cls, v: Optional[datetime]) -> Optional[datetime]:
        """Ensure datetimes are timezone-aware and normalized to UTC."""
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)


class ForecastRecord(BaseModel):
    """Cleaned wind forecast record corresponding to the `wind_forecasts` table."""

    start_time: datetime = Field(description="UTC target start timestamp forecasted")
    publish_time: datetime = Field(description="UTC publication timestamp")
    generation_mw: float = Field(ge=0.0, description="Forecasted generation in MW (non-negative)")
    created_at: Optional[datetime] = Field(default=None, description="Ingestion timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")

    @property
    def lead_time_hours(self) -> float:
        """Forecast lead time in hours (start_time - publish_time)."""
        return (self.start_time - self.publish_time).total_seconds() / 3600.0

    @field_validator("start_time", "publish_time", "created_at", "updated_at")
    @classmethod
    def ensure_utc(cls, v: Optional[datetime]) -> Optional[datetime]:
        """Ensure datetimes are timezone-aware and normalized to UTC."""
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

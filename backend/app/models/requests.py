"""Pydantic schemas for API query parameters and request validation."""

import datetime as dt
import re
from pydantic import BaseModel, Field, field_validator, model_validator


CUTOFF_TIME_REGEX = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
MIN_VALID_DATE = dt.date(2026, 1, 1)
MAX_VALID_DATE = dt.date(2026, 1, 31)


class ForecastQueryParams(BaseModel):
    """Validation for GET /api/forecast query parameters."""

    date: dt.date = Field(description="Target delivery date in January 2026 (YYYY-MM-DD)")
    cutoff: str = Field(default="12:00", description="D-1 decision cutoff time in Europe/London (HH:MM)")

    @field_validator("date")
    @classmethod
    def validate_january_2026(cls, v: dt.date) -> dt.date:
        """Delivery date must fall within January 2026."""
        if v < MIN_VALID_DATE or v > MAX_VALID_DATE:
            raise ValueError(f"Date {v} is out of scope. Only January 2026 dates (2026-01-01 to 2026-01-31) are supported.")
        return v

    @field_validator("cutoff")
    @classmethod
    def validate_cutoff_format(cls, v: str) -> str:
        """Cutoff time must be valid 24-hour HH:MM format."""
        if not CUTOFF_TIME_REGEX.match(v):
            raise ValueError(f"Invalid cutoff format '{v}'. Expected 24-hour 'HH:MM' (e.g. '12:00').")
        return v


class MetricsQueryParams(BaseModel):
    """Validation for GET /api/metrics query parameters."""

    start: dt.date = Field(description="Start date in January 2026 (YYYY-MM-DD)")
    end: dt.date = Field(description="End date in January 2026 (YYYY-MM-DD)")
    cutoff: str = Field(default="12:00", description="D-1 decision cutoff time in Europe/London (HH:MM)")

    @field_validator("start", "end")
    @classmethod
    def validate_date_range_bounds(cls, v: dt.date) -> dt.date:
        """Dates must fall within January 2026."""
        if v < MIN_VALID_DATE or v > MAX_VALID_DATE:
            raise ValueError(f"Date {v} is out of scope. Only January 2026 dates (2026-01-01 to 2026-01-31) are supported.")
        return v

    @field_validator("cutoff")
    @classmethod
    def validate_cutoff_format(cls, v: str) -> str:
        """Cutoff time must be valid 24-hour HH:MM format."""
        if not CUTOFF_TIME_REGEX.match(v):
            raise ValueError(f"Invalid cutoff format '{v}'. Expected 24-hour 'HH:MM' (e.g. '12:00').")
        return v

    @model_validator(mode="after")
    def validate_start_before_end(self) -> "MetricsQueryParams":
        """Start date must be less than or equal to end date."""
        if self.start > self.end:
            raise ValueError(f"start date ({self.start}) must be before or equal to end date ({self.end})")
        return self


class HorizonAnalysisQueryParams(BaseModel):
    """Validation for GET /api/horizon-analysis query parameters."""

    start: dt.date = Field(description="Start date in January 2026 (YYYY-MM-DD)")
    end: dt.date = Field(description="End date in January 2026 (YYYY-MM-DD)")

    @field_validator("start", "end")
    @classmethod
    def validate_date_range_bounds(cls, v: dt.date) -> dt.date:
        """Dates must fall within January 2026."""
        if v < MIN_VALID_DATE or v > MAX_VALID_DATE:
            raise ValueError(f"Date {v} is out of scope. Only January 2026 dates (2026-01-01 to 2026-01-31) are supported.")
        return v

    @model_validator(mode="after")
    def validate_start_before_end(self) -> "HorizonAnalysisQueryParams":
        """Start date must be less than or equal to end date."""
        if self.start > self.end:
            raise ValueError(f"start date ({self.start}) must be before or equal to end date ({self.end})")
        return self

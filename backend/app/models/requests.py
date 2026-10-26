"""Pydantic schemas for API query parameters and request validation."""

import datetime as dt
import re
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


CUTOFF_TIME_REGEX = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
MIN_VALID_DATE = dt.date(2026, 1, 2)
MAX_VALID_DATE = dt.date(2026, 2, 1)


class ForecastQueryParams(BaseModel):
    """Validation for GET /api/forecast query parameters (supports date and delivery_date)."""

    date: Optional[dt.date] = Field(default=None, description="Target delivery date for January decisions (2026-01-02 to 2026-02-01)")
    delivery_date: Optional[dt.date] = Field(default=None, description="Alias for date parameter")
    cutoff: str = Field(default="12:00", description="D-1 decision cutoff time in Europe/London (HH:MM)")
    cutoff_time: Optional[str] = Field(default=None, description="Alias for cutoff parameter")

    @model_validator(mode="before")
    @classmethod
    def resolve_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("date") and data.get("delivery_date"):
                data["date"] = data["delivery_date"]
            if not data.get("cutoff") and data.get("cutoff_time"):
                data["cutoff"] = data["cutoff_time"]
            if not data.get("cutoff"):
                data["cutoff"] = "12:00"
        return data

    @model_validator(mode="after")
    def validate_fields(self) -> "ForecastQueryParams":
        if self.date is None:
            raise ValueError("Field required: date (or delivery_date)")
        if self.date < MIN_VALID_DATE or self.date > MAX_VALID_DATE:
            raise ValueError(f"Date {self.date} is out of scope. Only delivery dates for January 2026 decisions (2026-01-02 to 2026-02-01) are supported.")
        if not CUTOFF_TIME_REGEX.match(self.cutoff):
            raise ValueError(f"Invalid cutoff format '{self.cutoff}'. Expected 24-hour 'HH:MM' (e.g. '12:00').")
        return self


class MetricsQueryParams(BaseModel):
    """Validation for GET /api/metrics query parameters (supports start/start_date and end/end_date)."""

    start: Optional[dt.date] = Field(default=None, description="Start date for January decisions (2026-01-02 to 2026-02-01)")
    start_date: Optional[dt.date] = Field(default=None, description="Alias for start parameter")
    end: Optional[dt.date] = Field(default=None, description="End date for January decisions (2026-01-02 to 2026-02-01)")
    end_date: Optional[dt.date] = Field(default=None, description="Alias for end parameter")
    cutoff: str = Field(default="12:00", description="D-1 decision cutoff time in Europe/London (HH:MM)")
    cutoff_time: Optional[str] = Field(default=None, description="Alias for cutoff parameter")

    @model_validator(mode="before")
    @classmethod
    def resolve_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("start") and data.get("start_date"):
                data["start"] = data["start_date"]
            if not data.get("end") and data.get("end_date"):
                data["end"] = data["end_date"]
            if not data.get("cutoff") and data.get("cutoff_time"):
                data["cutoff"] = data["cutoff_time"]
            if not data.get("cutoff"):
                data["cutoff"] = "12:00"
        return data

    @model_validator(mode="after")
    def validate_fields(self) -> "MetricsQueryParams":
        if self.start is None:
            raise ValueError("Field required: start (or start_date)")
        if self.end is None:
            raise ValueError("Field required: end (or end_date)")
        if self.start < MIN_VALID_DATE or self.start > MAX_VALID_DATE:
            raise ValueError(f"Start date {self.start} is out of scope. Only delivery dates for January 2026 decisions (2026-01-02 to 2026-02-01) are supported.")
        if self.end < MIN_VALID_DATE or self.end > MAX_VALID_DATE:
            raise ValueError(f"End date {self.end} is out of scope. Only delivery dates for January 2026 decisions (2026-01-02 to 2026-02-01) are supported.")
        if self.start > self.end:
            raise ValueError(f"start date ({self.start}) must be before or equal to end date ({self.end})")
        if not CUTOFF_TIME_REGEX.match(self.cutoff):
            raise ValueError(f"Invalid cutoff format '{self.cutoff}'. Expected 24-hour 'HH:MM' (e.g. '12:00').")
        return self


class HorizonAnalysisQueryParams(BaseModel):
    """Validation for GET /api/horizon-analysis query parameters."""

    start: Optional[dt.date] = Field(default=None, description="Start date for January decisions (2026-01-02 to 2026-02-01)")
    start_date: Optional[dt.date] = Field(default=None, description="Alias for start parameter")
    end: Optional[dt.date] = Field(default=None, description="End date for January decisions (2026-01-02 to 2026-02-01)")
    end_date: Optional[dt.date] = Field(default=None, description="Alias for end parameter")

    @model_validator(mode="before")
    @classmethod
    def resolve_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("start") and data.get("start_date"):
                data["start"] = data["start_date"]
            if not data.get("end") and data.get("end_date"):
                data["end"] = data["end_date"]
        return data

    @model_validator(mode="after")
    def validate_fields(self) -> "HorizonAnalysisQueryParams":
        if self.start is None:
            raise ValueError("Field required: start (or start_date)")
        if self.end is None:
            raise ValueError("Field required: end (or end_date)")
        if self.start < MIN_VALID_DATE or self.start > MAX_VALID_DATE:
            raise ValueError(f"Start date {self.start} is out of scope. Only delivery dates for January 2026 decisions (2026-01-02 to 2026-02-01) are supported.")
        if self.end < MIN_VALID_DATE or self.end > MAX_VALID_DATE:
            raise ValueError(f"End date {self.end} is out of scope. Only delivery dates for January 2026 decisions (2026-01-02 to 2026-02-01) are supported.")
        if self.start > self.end:
            raise ValueError(f"start date ({self.start}) must be before or equal to end date ({self.end})")
        return self

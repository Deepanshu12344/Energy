"""Pydantic schemas representing raw records received from Elexon BMRS API streams."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class RawFuelHHRecord(BaseModel):
    """Raw half-hourly generation record from Elexon FUELHH stream endpoint."""

    dataset: str = Field(description="Name of dataset, expects 'FUELHH'")
    publishTime: datetime = Field(description="ISO 8601 UTC publish timestamp")
    startTime: datetime = Field(description="ISO 8601 UTC half-hour start timestamp")
    settlementDate: Optional[str] = Field(default=None, description="GB settlement date string (YYYY-MM-DD)")
    settlementPeriod: Optional[int] = Field(default=None, description="Settlement period number (1 to 48/50)")
    fuelType: str = Field(description="Fuel type, e.g. 'WIND'")
    generation: float = Field(description="Actual generation outturn in MW")

    @field_validator("publishTime", "startTime")
    @classmethod
    def ensure_timezone_aware(cls, v: datetime) -> datetime:
        """Ensure datetimes are timezone-aware and normalized."""
        if v.tzinfo is None:
            raise ValueError("Datetime must be timezone-aware")
        return v


class RawWindforRecord(BaseModel):
    """Raw wind generation forecast record from Elexon WINDFOR stream endpoint."""

    dataset: str = Field(description="Name of dataset, expects 'WINDFOR'")
    publishTime: datetime = Field(description="ISO 8601 UTC publication timestamp")
    startTime: datetime = Field(description="ISO 8601 UTC target forecasted start timestamp")
    generation: float = Field(description="Forecasted generation in MW")

    @field_validator("publishTime", "startTime")
    @classmethod
    def ensure_timezone_aware(cls, v: datetime) -> datetime:
        """Ensure datetimes are timezone-aware and normalized."""
        if v.tzinfo is None:
            raise ValueError("Datetime must be timezone-aware")
        return v

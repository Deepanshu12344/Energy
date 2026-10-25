"""Models package initialization exporting Elexon, internal, request, and response schemas."""

from .elexon import RawFuelHHRecord, RawWindforRecord
from .internal import ActualRecord, ForecastRecord
from .requests import ForecastQueryParams, HorizonAnalysisQueryParams, MetricsQueryParams
from .responses import (
    AccuracyMetrics,
    ComparisonItem,
    ErrorByHourResponse,
    ErrorDistributionBin,
    ErrorDistributionResponse,
    ErrorResponse,
    ForecastComparisonResponse,
    HealthResponse,
    HorizonAnalysisResponse,
    HorizonBucket,
    HourlyErrorItem,
    MetaResponse,
    MetricsResponse,
    SlotStatus,
)

__all__ = [
    "RawFuelHHRecord",
    "RawWindforRecord",
    "ActualRecord",
    "ForecastRecord",
    "ForecastQueryParams",
    "MetricsQueryParams",
    "HorizonAnalysisQueryParams",
    "ComparisonItem",
    "SlotStatus",
    "ForecastComparisonResponse",
    "AccuracyMetrics",
    "MetricsResponse",
    "HourlyErrorItem",
    "ErrorByHourResponse",
    "ErrorDistributionBin",
    "ErrorDistributionResponse",
    "HorizonBucket",
    "HorizonAnalysisResponse",
    "MetaResponse",
    "HealthResponse",
    "ErrorResponse",
]

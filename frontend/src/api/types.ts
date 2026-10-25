/**
 * TypeScript API type definitions mirroring FastAPI backend response models.
 */

export type SlotStatus = 'forecast_selected' | 'not_applicable' | 'missing';

export interface ComparisonItem {
  start_time: string; // ISO 8601 UTC string
  actual_mw: number | null;
  forecast_mw: number | null;
  publish_time: string | null;
  lead_time_hours: number | null;
  error_mw: number | null;
  abs_error_mw: number | null;
  error_pct: number | null;
  status: SlotStatus;
  is_actual_missing: boolean;
}

export interface ForecastComparisonResponse {
  delivery_date: string;
  cutoff_time: string;
  cutoff_timestamp_utc: string;
  total_slots: number;
  hourly_slots: number;
  matched_slots: number;
  missing_slots: number;
  not_applicable_slots: number;
  data: ComparisonItem[];
}

export interface AccuracyMetrics {
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  mape: number | null;
  mape_excluded_count: number;
  p50_abs_error: number | null;
  p90_abs_error: number | null;
  p95_abs_error: number | null;
  buffer_recommendation_mw_p90: number | null;
  total_slots: number;
  evaluated_slots: number;
  missing_slots: number;
}

export interface MetricsResponse {
  start_date: string;
  end_date: string;
  cutoff_time: string;
  metrics: AccuracyMetrics;
}

export interface HourlyErrorItem {
  hour: number;
  count: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
}

export interface ErrorByHourResponse {
  start_date: string;
  end_date: string;
  cutoff_time: string;
  hourly_errors: HourlyErrorItem[];
}

export interface HorizonBucket {
  horizon_bucket: string;
  count: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
}

export interface HorizonAnalysisResponse {
  start_date: string;
  end_date: string;
  main_buckets: HorizonBucket[];
  after_target_bucket: HorizonBucket | null;
  buckets: HorizonBucket[];
}

export interface ErrorDistributionBin {
  bin_min: number;
  bin_max: number;
  bin_label: string;
  count: number;
}

export interface ErrorDistributionResponse {
  start_date: string;
  end_date: string;
  cutoff_time: string;
  total_samples: number;
  min_error_mw: number | null;
  max_error_mw: number | null;
  over_forecast_count: number;
  over_forecast_share: number | null;
  bins: ErrorDistributionBin[];
}

export interface MetaResponse {
  available_start_date: string;
  available_end_date: string;
  default_cutoff_time: string;
  actual_rows_count: number;
  forecast_rows_count: number;
  timezone: string;
  resolution_notes: {
    windfor_resolution: string;
    fuelhh_resolution: string;
    evaluation_rule: string;
    matching_strategy: string;
  };
}

export interface HealthResponse {
  status: string;
  database_connected: boolean;
  timestamp: string;
}

export interface ApiErrorDetail {
  error: string;
  detail?: string;
  status_code: number;
}

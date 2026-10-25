/**
 * Pure API client for communicating with the FastAPI backend.
 * All base URLs and network calls are centralized here.
 */

import type {
  ApiErrorDetail,
  ErrorByHourResponse,
  ErrorDistributionResponse,
  ForecastComparisonResponse,
  HealthResponse,
  HorizonAnalysisResponse,
  MetaResponse,
  MetricsResponse,
} from './types';

const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:8000/api';

export class ApiError extends Error {
  statusCode: number;
  errorDetail: string;

  constructor(status: number, message: string, detail?: string) {
    super(detail ? `${message}: ${detail}` : message);
    this.name = 'ApiError';
    this.statusCode = status;
    this.errorDetail = detail || message;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorJson: ApiErrorDetail | null = null;
    try {
      errorJson = await response.json();
    } catch {
      // response was not JSON
    }

    const message = errorJson?.error || `HTTP ${response.status} ${response.statusText}`;
    const detail = errorJson?.detail || '';
    throw new ApiError(response.status, message, detail);
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  getBaseUrl(): string {
    return BASE_URL;
  },

  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${BASE_URL}/health`);
    return handleResponse<HealthResponse>(res);
  },

  async getMeta(): Promise<MetaResponse> {
    const res = await fetch(`${BASE_URL}/meta`);
    return handleResponse<MetaResponse>(res);
  },

  async getForecast(deliveryDate: string, cutoffTime?: string): Promise<ForecastComparisonResponse> {
    const params = new URLSearchParams({ delivery_date: deliveryDate });
    if (cutoffTime) {
      params.append('cutoff_time', cutoffTime);
    }
    const res = await fetch(`${BASE_URL}/forecast?${params.toString()}`);
    return handleResponse<ForecastComparisonResponse>(res);
  },

  async getMetrics(startDate: string, endDate: string, cutoffTime?: string): Promise<MetricsResponse> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    if (cutoffTime) {
      params.append('cutoff_time', cutoffTime);
    }
    const res = await fetch(`${BASE_URL}/metrics?${params.toString()}`);
    return handleResponse<MetricsResponse>(res);
  },

  async getErrorByHour(startDate: string, endDate: string, cutoffTime?: string): Promise<ErrorByHourResponse> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    if (cutoffTime) {
      params.append('cutoff_time', cutoffTime);
    }
    const res = await fetch(`${BASE_URL}/error-by-hour?${params.toString()}`);
    return handleResponse<ErrorByHourResponse>(res);
  },

  async getHorizonAnalysis(startDate: string, endDate: string): Promise<HorizonAnalysisResponse> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    const res = await fetch(`${BASE_URL}/horizon-analysis?${params.toString()}`);
    return handleResponse<HorizonAnalysisResponse>(res);
  },

  async getErrorDistribution(
    startDate: string,
    endDate: string,
    cutoffTime?: string,
    numBins: number = 10
  ): Promise<ErrorDistributionResponse> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      num_bins: numBins.toString(),
    });
    if (cutoffTime) {
      params.append('cutoff_time', cutoffTime);
    }
    const res = await fetch(`${BASE_URL}/error-distribution?${params.toString()}`);
    return handleResponse<ErrorDistributionResponse>(res);
  },
};

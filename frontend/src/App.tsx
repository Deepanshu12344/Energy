import React, { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from './api/client';
import type {
  HealthResponse,
  MetaResponse,
  ForecastComparisonResponse,
  MetricsResponse,
  ErrorByHourResponse,
  HorizonAnalysisResponse,
  ErrorDistributionResponse,
} from './api/types';
import { Header } from './components/Header';
import { Controls, type RangeMode } from './components/Controls';
import { KPICards } from './components/KPICards';
import { DecisionSupportCard } from './components/DecisionSupportCard';
import { MainForecastChart } from './components/MainForecastChart';
import { ErrorHistogramChart } from './components/ErrorHistogramChart';
import { HourlyErrorChart } from './components/HourlyErrorChart';
import { HorizonChart } from './components/HorizonChart';
import { AssumptionsPanel } from './components/AssumptionsPanel';
import { ErrorAlert } from './components/ErrorAlert';

export const App: React.FC = () => {
  // Navigation & Parameter States
  const [rangeMode, setRangeMode] = useState<RangeMode>('single');
  const [singleDate, setSingleDate] = useState<string>('2026-01-15');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-01-31');
  const [cutoffTime, setCutoffTime] = useState<string>('12:00');

  // API Data States
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [comparison, setComparison] = useState<ForecastComparisonResponse | null>(null);
  const [metricsResponse, setMetricsResponse] = useState<MetricsResponse | null>(null);
  const [hourlyError, setHourlyError] = useState<ErrorByHourResponse | null>(null);
  const [horizonAnalysis, setHorizonAnalysis] = useState<HorizonAnalysisResponse | null>(null);
  const [distribution, setDistribution] = useState<ErrorDistributionResponse | null>(null);

  // Status & Loading States
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // Initial load: Fetch health and metadata
  useEffect(() => {
    let isMounted = true;
    const fetchInitialMeta = async () => {
      try {
        setLoadingHealth(true);
        const [h, m] = await Promise.all([apiClient.getHealth(), apiClient.getMeta()]);
        if (isMounted) {
          setHealth(h);
          setMeta(m);
        }
      } catch {
        if (isMounted) {
          setHealth({ status: 'degraded', database_connected: false, timestamp: new Date().toISOString() });
        }
      } finally {
        if (isMounted) setLoadingHealth(false);
      }
    };

    fetchInitialMeta();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute effective evaluation date range based on rangeMode
  const getEffectiveRange = useCallback((): { start: string; end: string; label: string } => {
    if (rangeMode === 'single') {
      return { start: singleDate, end: singleDate, label: `Delivery Day: ${singleDate}` };
    }
    if (rangeMode === 'full') {
      return { start: '2026-01-01', end: '2026-01-31', label: 'Full Month: January 2026' };
    }
    return { start: startDate, end: endDate, label: `Custom Range: ${startDate} to ${endDate}` };
  }, [rangeMode, singleDate, startDate, endDate]);

  // Main data loader function
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorDetail(null);

    const { start, end } = getEffectiveRange();

    try {
      const [
        forecastRes,
        metricsRes,
        hourlyRes,
        horizonRes,
        distributionRes,
      ] = await Promise.all([
        apiClient.getForecast(singleDate, cutoffTime),
        apiClient.getMetrics(start, end, cutoffTime),
        apiClient.getErrorByHour(start, end, cutoffTime),
        apiClient.getHorizonAnalysis(start, end),
        apiClient.getErrorDistribution(start, end, cutoffTime),
      ]);

      setComparison(forecastRes);
      setMetricsResponse(metricsRes);
      setHourlyError(hourlyRes);
      setHorizonAnalysis(horizonRes);
      setDistribution(distributionRes);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorDetail(err.errorDetail);
      } else if (err instanceof Error) {
        setError('Failed to load dashboard data');
        setErrorDetail(err.message);
      } else {
        setError('Failed to load dashboard data');
        setErrorDetail('Check backend server connection at ' + apiClient.getBaseUrl());
      }
    } finally {
      setIsLoading(false);
    }
  }, [getEffectiveRange, singleDate, cutoffTime]);

  // Trigger load when parameters change
  useEffect(() => {
    queueMicrotask(() => {
      void loadDashboardData();
    });
  }, [loadDashboardData]);

  const { label: rangeLabel } = getEffectiveRange();

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <Header
        health={health}
        loadingHealth={loadingHealth}
        onRefresh={loadDashboardData}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-5">
        {/* Error Alert */}
        {error && (
          <ErrorAlert
            error={error}
            detail={errorDetail}
            onRetry={loadDashboardData}
          />
        )}

        {/* Global Controls & Filters */}
        <Controls
          rangeMode={rangeMode}
          onRangeModeChange={setRangeMode}
          singleDate={singleDate}
          onSingleDateChange={setSingleDate}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          cutoffTime={cutoffTime}
          onCutoffTimeChange={setCutoffTime}
          isLoading={isLoading}
        />

        {/* Executive Decision Support Summary Card */}
        <DecisionSupportCard
          metrics={metricsResponse?.metrics ?? null}
          distribution={distribution}
          cutoffTime={cutoffTime}
          rangeLabel={rangeLabel}
          isLoading={isLoading}
        />

        {/* Summary Accuracy KPI Cards */}
        <KPICards
          metrics={metricsResponse?.metrics ?? null}
          isLoading={isLoading}
        />

        {/* Main Forecast vs Actual Chart */}
        <MainForecastChart
          comparisonData={comparison}
          cutoffTime={cutoffTime}
          deliveryDate={singleDate}
          isLoading={isLoading}
        />

        {/* Secondary Analytical Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Error Distribution Histogram */}
          <ErrorHistogramChart
            distribution={distribution}
            isLoading={isLoading}
          />

          {/* Diurnal Error by Hour of Day */}
          <HourlyErrorChart
            hourlyData={hourlyError}
            isLoading={isLoading}
          />
        </div>

        {/* Lead Time Horizon Analysis */}
        <HorizonChart
          horizonData={horizonAnalysis}
          isLoading={isLoading}
        />

        {/* Methodology & Assumptions Collapsible Drawer */}
        <AssumptionsPanel
          meta={meta}
          cutoffTime={cutoffTime}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            GB Wind Forecast Benchmark &copy; 2026 | Elexon BMRS Data Streams: <code className="text-slate-300">WINDFOR</code> &amp; <code className="text-slate-300">FUELHH</code>
          </span>
          <span className="text-[11px] text-slate-400">
            Backend API: <code className="text-slate-300">{apiClient.getBaseUrl()}</code>
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;

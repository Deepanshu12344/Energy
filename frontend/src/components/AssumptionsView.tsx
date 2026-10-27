import React, { useState, useEffect } from 'react';
import { Database, Clock, Scale, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { apiClient } from '../api/client';
import type { MetricsResponse, ErrorDistributionResponse } from '../api/types';

export const AssumptionsView: React.FC = () => {
  const { meta } = useDashboard();

  // BUG 1: Key Finding card must always summarise the full range (2026-01-02 to 2026-02-01)
  // at the default cutoff from /api/meta, completely isolated from dashboard filter state.
  const [keyFindingMetrics, setKeyFindingMetrics] = useState<MetricsResponse | null>(null);
  const [keyFindingDist, setKeyFindingDist] = useState<ErrorDistributionResponse | null>(null);

  const defaultCutoff = meta?.default_cutoff_time ?? '12:00';

  useEffect(() => {
    let active = true;
    const fetchKeyFindingData = async () => {
      try {
        const [mRes, dRes] = await Promise.all([
          apiClient.getMetrics('2026-01-02', '2026-02-01', defaultCutoff),
          apiClient.getErrorDistribution('2026-01-02', '2026-02-01', defaultCutoff, 10),
        ]);
        if (active) {
          setKeyFindingMetrics(mRes);
          setKeyFindingDist(dRes);
        }
      } catch (err) {
        console.error('Failed to load key finding benchmark data:', err);
      }
    };

    void fetchKeyFindingData();
    return () => {
      active = false;
    };
  }, [defaultCutoff]);

  const m = keyFindingMetrics?.metrics;
  const dist = keyFindingDist;

  const overSharePct =
    dist?.over_forecast_share !== undefined && dist?.over_forecast_share !== null
      ? `${(dist.over_forecast_share * 100).toFixed(1)}%`
      : null;

  const biasFormatted =
    m?.bias !== undefined && m?.bias !== null
      ? `${m.bias > 0 ? '+' : ''}${m.bias.toLocaleString()} MW`
      : null;

  const p90Formatted =
    m?.p90_abs_error !== undefined && m?.p90_abs_error !== null
      ? `${m.p90_abs_error.toLocaleString()} MW`
      : null;

  return (
    <div className="max-w-[1400px] mx-auto py-6 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Assumptions & Methodology
        </h1>
        <p className="text-xs text-slate-500 dark:text-[#A3A3A3] mt-1">
          Technical specifications, domain constraints, and evaluation methodology for UK Elexon BMRS wind generation data.
        </p>
      </div>

      {/* Dynamic Key Finding Card */}
      <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-white dark:from-[#141414] dark:via-[#1A1A1A] dark:to-[#141414] p-5 rounded-xl border border-blue-200/80 dark:border-[#2A2A2A] shadow-sm">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B8FE3]">
            Key Analytical Finding (January 2026)
          </span>
          <p className="text-sm font-medium text-slate-800 dark:text-white leading-relaxed">
            Across all January decisions (delivery 2 Jan to 1 Feb) at the {defaultCutoff} Europe/London cutoff, Elexon WINDFOR forecasts were systematically higher than actual generation across{' '}
            <strong className="text-slate-900 dark:text-white">
              {overSharePct ? `${overSharePct} of evaluated hours` : 'evaluating...'}
            </strong>
            , with an average mean bias of{' '}
            <strong className="text-[#0B8FE3] font-semibold">
              {biasFormatted ?? 'calculating...'}
            </strong>{' '}
            and a P90 buffer threshold of{' '}
            <strong className="text-slate-900 dark:text-white">
              {p90Formatted ?? 'calculating...'}
            </strong>
            .
          </p>
          <p className="text-xs text-slate-500 dark:text-[#A3A3A3] pt-0.5">
            Decisions made in January 2026 are for delivery on 2 Jan through 1 Feb (D-1 decision window).
          </p>
        </div>
      </div>

      {/* Grid of Specification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Data Sources */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-slate-200/80 dark:border-[#2A2A2A] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-[#0B8FE3]">
            <Database className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Elexon BMRS Datasets</h3>
          </div>
          <ul className="text-xs text-slate-600 dark:text-[#A3A3A3] space-y-2 leading-relaxed">
            <li>
              <strong>FUELHH (Actuals):</strong> Filtered exclusively for <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1F1F1F] font-mono text-[11px]">fuelType = WIND</code> at 30-minute settlement granularity.
            </li>
            <li>
              <strong>WINDFOR (Forecasts):</strong> National day-ahead wind generation forecasts published via Elexon BMRS at hourly target resolution.
            </li>
            <li>
              <strong>Pre-January Ingestion:</strong> December 2025 margin loaded to capture forecasts for early-January target hours.
            </li>
          </ul>
        </div>

        {/* Card 2: Decision Cutoff */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-slate-200/80 dark:border-[#2A2A2A] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-[#0B8FE3]">
            <Clock className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. D-1 Decision Gate Closure</h3>
          </div>
          <ul className="text-xs text-slate-600 dark:text-[#A3A3A3] space-y-2 leading-relaxed">
            <li>
              <strong>Default Cutoff:</strong> Set to <strong>12:00 Europe/London</strong> on Day D-1 (industry benchmark; commercial GB day-ahead auctions close at 09:20 EPEX / 09:50 N2EX).
            </li>
            <li>
              <strong>Selection Criteria:</strong> For each settlement slot, selects the single forecast with greatest <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1F1F1F] font-mono text-[11px]">publish_time &le; cutoff</code>.
            </li>
            <li>
              <strong>Post-Cutoff Exclusion:</strong> Any forecasts published after the cutoff are discarded to prevent data leakage.
            </li>
          </ul>
        </div>

        {/* Card 3: Resolution & Timestamps */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-slate-200/80 dark:border-[#2A2A2A] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-[#0B8FE3]">
            <Scale className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Resolution & Matching</h3>
          </div>
          <ul className="text-xs text-slate-600 dark:text-[#A3A3A3] space-y-2 leading-relaxed">
            <li>
              <strong>Strict Timestamp Match:</strong> Evaluations are conducted strictly at matching <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1F1F1F] font-mono text-[11px]">:00</code> timestamps (24 slots/day).
            </li>
            <li>
              <strong>Half-Hour Slots:</strong> Intermediate <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1F1F1F] font-mono text-[11px]">:30</code> slots are preserved in the chart response with <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-[#1F1F1F] font-mono text-[10px]">null</code> forecast and marked <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-[#1F1F1F] font-mono text-[10px]">not_applicable</code> without artificial forward-filling.
            </li>
            <li>
              <strong>UTC Standardization:</strong> All database timestamps and chart axes are stored and rendered in <strong>UTC</strong>.
            </li>
          </ul>
        </div>

        {/* Card 4: Metrics Guard */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-slate-200/80 dark:border-[#2A2A2A] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-[#0B8FE3]">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">4. Zero-Division MAPE Guard</h3>
          </div>
          <ul className="text-xs text-slate-600 dark:text-[#A3A3A3] space-y-2 leading-relaxed">
            <li>
              <strong>Low-Actual Exclusion Threshold:</strong> Actual generation outturns below <strong>10.0 MW</strong> are excluded from the MAPE denominator to prevent division-by-zero distortion.
            </li>
            <li>
              <strong>Full Coverage in MAE/RMSE:</strong> All evaluated hours remain included in MAE, RMSE, Bias, and percentiles.
            </li>
            <li>
              <strong>Interpolation:</strong> Percentiles (P50, P90, P95) use standard linear interpolation (<code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1F1F1F] font-mono text-[11px]">method="linear"</code>).
            </li>
          </ul>
        </div>

        {/* Card 5: Database Row Counts */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-slate-200/80 dark:border-[#2A2A2A] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-[#0B8FE3]">
            <CheckCircle2 className="w-5 h-5 text-[#0B8FE3]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">5. Database Row Counts</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#1A1A1A]">
              <span className="text-slate-500 dark:text-[#A3A3A3]">Actual Outturns (FUELHH):</span>
              <strong className="text-slate-900 dark:text-white font-mono">
                {meta?.actual_rows_count ? `${meta.actual_rows_count.toLocaleString()} rows` : '1,536 rows'}
              </strong>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#1A1A1A]">
              <span className="text-slate-500 dark:text-[#A3A3A3]">Forecasts (WINDFOR):</span>
              <strong className="text-slate-900 dark:text-white font-mono">
                {meta?.forecast_rows_count ? `${meta.forecast_rows_count.toLocaleString()} rows` : '18,664 rows'}
              </strong>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#1A1A1A]">
              <span className="text-slate-500 dark:text-[#A3A3A3]">Scope Window:</span>
              <strong className="text-slate-900 dark:text-white font-mono">
                {meta ? `${meta.available_start_date} to ${meta.available_end_date}` : '2026-01-02 to 2026-02-01'}
              </strong>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#1A1A1A]">
              <span className="text-slate-500 dark:text-[#A3A3A3]">Matching Strategy:</span>
              <strong className="text-[#0B8FE3] dark:text-[#86C5EE] font-mono">exact_timestamp_match</strong>
            </div>
          </div>
        </div>

        {/* Card 6: Negative Lead Time Policy */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-slate-200/80 dark:border-[#2A2A2A] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-[#0B8FE3]">
            <AlertCircle className="w-5 h-5 text-[#0B8FE3]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">6. Negative Lead Times</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-[#A3A3A3] leading-relaxed">
            Forecasts published after the target time are excluded from the forward-looking lead-time buckets.
          </p>
          <div className="p-2.5 rounded-lg bg-blue-50/80 dark:bg-[#1F1F1F] text-[11px] text-slate-700 dark:text-[#A3A3A3] border border-blue-100 dark:border-[#2A2A2A]">
            Forecasts published after the target time are excluded from the forward-looking lead-time buckets and shown separately.
          </div>
        </div>
      </div>
    </div>
  );
};

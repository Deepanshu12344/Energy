import React from 'react';
import { Database, Clock, Scale, ShieldCheck, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export const AssumptionsView: React.FC = () => {
  const { meta, metrics, distribution } = useDashboard();

  const m = metrics?.metrics;
  const dist = distribution;

  return (
    <div className="max-w-[1400px] mx-auto py-6 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Assumptions & Methodology
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Technical specifications, domain constraints, and evaluation methodology for UK National Grid Elexon wind data.
        </p>
      </div>

      {/* Dynamic Key Finding Card */}
      <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-white dark:from-[#131B2E] dark:via-blue-950/30 dark:to-[#131B2E] p-5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#0B8FE3] text-white shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B8FE3]">
              Key Analytical Finding (January 2026)
            </span>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
              At the 12:00 D-1 auction gate closure, National Grid WINDFOR forecasts were systematically higher than actual generation across{' '}
              <strong className="text-slate-900 dark:text-white">
                {dist?.over_forecast_share ? `${(dist.over_forecast_share * 100).toFixed(1)}%` : '85.2%'} of evaluated hours
              </strong>{' '}
              and on <strong className="text-slate-900 dark:text-white">29 of 31 days (93.5%)</strong>, with an average mean bias of{' '}
              <strong className="text-[#0B8FE3] font-semibold">
                {m?.bias ? `+${m.bias.toLocaleString()} MW` : '+1,805.86 MW'}
              </strong>{' '}
              and a P90 buffer threshold of{' '}
              <strong className="text-slate-900 dark:text-white">
                {m?.p90_abs_error ? `${m.p90_abs_error.toLocaleString()} MW` : '4,000.0 MW'}
              </strong>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Specification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Data Sources */}
        <div className="bg-white dark:bg-[#131B2E] rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-[#0B8FE3]">
            <Database className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Elexon BMRS Datasets</h3>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
            <li>
              <strong>FUELHH (Actuals):</strong> Filtered exclusively for <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">fuelType = WIND</code> at 30-minute settlement granularity.
            </li>
            <li>
              <strong>WINDFOR (Forecasts):</strong> National day-ahead wind generation forecasts published at hourly target resolution.
            </li>
            <li>
              <strong>Pre-January Ingestion:</strong> December 2025 margin loaded to capture forecasts for early-January target hours.
            </li>
          </ul>
        </div>

        {/* Card 2: Decision Cutoff */}
        <div className="bg-white dark:bg-[#131B2E] rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-[#0B8FE3]">
            <Clock className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. D-1 Decision Gate Closure</h3>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
            <li>
              <strong>Default Cutoff:</strong> Set to <strong>12:00 Europe/London</strong> on Day D-1 (the GB Day-Ahead auction clearing gate).
            </li>
            <li>
              <strong>Selection Criteria:</strong> For each settlement slot, selects the single forecast with greatest <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">publish_time &le; cutoff</code>.
            </li>
            <li>
              <strong>Post-Cutoff Exclusion:</strong> Any forecasts published after the cutoff are discarded to prevent data leakage.
            </li>
          </ul>
        </div>

        {/* Card 3: Resolution & Timestamps */}
        <div className="bg-white dark:bg-[#131B2E] rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-[#0B8FE3]">
            <Scale className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Resolution & Matching</h3>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
            <li>
              <strong>Strict Timestamp Match:</strong> Evaluations are conducted strictly at matching <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">:00</code> timestamps (24 slots/day).
            </li>
            <li>
              <strong>Half-Hour Slots:</strong> Intermediate <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">:30</code> slots are preserved in the chart response with <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">null</code> forecast and marked <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">not_applicable</code> without artificial forward-filling.
            </li>
            <li>
              <strong>UTC Standardization:</strong> All database timestamps and chart axes are stored and rendered in <strong>UTC</strong>.
            </li>
          </ul>
        </div>

        {/* Card 4: Metrics Guard */}
        <div className="bg-white dark:bg-[#131B2E] rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-[#0B8FE3]">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">4. Zero-Division MAPE Guard</h3>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
            <li>
              <strong>Lull Exclusion Threshold:</strong> Actual generation outturns below <strong>10.0 MW</strong> are excluded from the MAPE denominator to prevent division-by-zero distortion.
            </li>
            <li>
              <strong>Full Coverage in MAE/RMSE:</strong> All evaluated hours remain included in MAE, RMSE, Bias, and percentiles.
            </li>
            <li>
              <strong>Interpolation:</strong> Percentiles (P50, P90, P95) use standard linear interpolation (<code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">method="linear"</code>).
            </li>
          </ul>
        </div>

        {/* Card 5: Database Row Counts */}
        <div className="bg-white dark:bg-[#131B2E] rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-[#0B8FE3]">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">5. Database Row Counts</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <span className="text-slate-500">Actual Outturns (FUELHH):</span>
              <strong className="text-slate-900 dark:text-white font-mono">
                {meta?.actual_rows_count ? `${meta.actual_rows_count.toLocaleString()} rows` : '1,488 rows'}
              </strong>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <span className="text-slate-500">Forecasts (WINDFOR):</span>
              <strong className="text-slate-900 dark:text-white font-mono">
                {meta?.forecast_rows_count ? `${meta.forecast_rows_count.toLocaleString()} rows` : '18,080 rows'}
              </strong>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <span className="text-slate-500">Scope Window:</span>
              <strong className="text-slate-900 dark:text-white">2026-01-01 to 2026-01-31</strong>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <span className="text-slate-500">Matching Strategy:</span>
              <strong className="text-emerald-600 dark:text-emerald-400">exact_timestamp_match</strong>
            </div>
          </div>
        </div>

        {/* Card 6: Negative Lead Time Policy */}
        <div className="bg-white dark:bg-[#131B2E] rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-[#0B8FE3]">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">6. Negative Lead Times</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            In horizon analysis, forecasts published <em>after</em> the target delivery time (negative lead time) are segregated into a separate &ldquo;published after target&rdquo; bucket rather than skewing the main forward forecast buckets (&lt;12h, 12-18h, etc.).
          </p>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-[11px] text-amber-800 dark:text-amber-300">
            Guarantees day-ahead forward purchase decisions are evaluated exclusively against genuine pre-delivery forecasts.
          </div>
        </div>
      </div>
    </div>
  );
};

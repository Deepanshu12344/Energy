import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

interface MetricTileProps {
  label: string;
  value: string;
  unit?: string;
  tooltip: string;
  subtext?: string;
  badge?: {
    text: string;
    variant: 'blue' | 'amber' | 'slate';
  };
}

const MetricTile: React.FC<MetricTileProps> = ({ label, value, unit, tooltip, subtext, badge }) => (
  <div className="bg-slate-50/80 dark:bg-slate-900/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 flex flex-col justify-between group relative">
    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
      <span className="font-medium">{label}</span>
      <div className="relative group/help">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer" />
        <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/help:block w-48 p-2 bg-slate-900 text-white dark:bg-slate-800 text-[11px] rounded-lg shadow-lg z-50 pointer-events-none">
          {tooltip}
        </div>
      </div>
    </div>

    <div className="flex items-baseline gap-1 my-0.5">
      <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        {value}
      </span>
      {unit && <span className="text-xs font-semibold text-slate-500">{unit}</span>}
    </div>

    <div className="flex items-center justify-between mt-1 text-[11px]">
      {subtext && <span className="text-slate-400 dark:text-slate-500 truncate">{subtext}</span>}
      {badge && (
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            badge.variant === 'amber'
              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
              : badge.variant === 'blue'
              ? 'bg-blue-50 text-[#0B8FE3] dark:bg-blue-950/40 dark:text-blue-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {badge.text}
        </span>
      )}
    </div>
  </div>
);

export const MetricsPanel: React.FC = () => {
  const { metrics, effectiveRange } = useDashboard();
  const m = metrics?.metrics;

  if (!m) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
        No metrics available for {effectiveRange.label}
      </div>
    );
  }

  const biasSign = m.bias !== null ? (m.bias > 0 ? `+${m.bias.toLocaleString()}` : m.bias.toLocaleString()) : 'N/A';
  const biasLabel = m.bias !== null ? (m.bias > 0 ? 'Over-forecasting' : m.bias < 0 ? 'Under-forecasting' : 'Unbiased') : 'N/A';

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="grid grid-cols-2 gap-2.5 flex-1">
        {/* MAE */}
        <MetricTile
          label="MAE"
          value={m.mae !== null ? m.mae.toLocaleString() : 'N/A'}
          unit="MW"
          tooltip="Mean Absolute Error: average magnitude of hourly errors regardless of direction."
          subtext="Typical deviation"
        />

        {/* RMSE */}
        <MetricTile
          label="RMSE"
          value={m.rmse !== null ? m.rmse.toLocaleString() : 'N/A'}
          unit="MW"
          tooltip="Root Mean Squared Error: penalizes large forecast misses more severely than MAE."
          subtext="Volumetric spread"
        />

        {/* Bias */}
        <MetricTile
          label="Mean Bias"
          value={biasSign}
          unit="MW"
          tooltip="Average error (Forecast - Actual). Positive means forecasts persistently exceed actual generation."
          badge={{
            text: biasLabel,
            variant: m.bias !== null && m.bias > 0 ? 'amber' : 'blue',
          }}
        />

        {/* MAPE */}
        <MetricTile
          label="MAPE"
          value={m.mape !== null ? `${m.mape}%` : 'N/A'}
          tooltip="Mean Absolute Percentage Error. Outturns under 10 MW are excluded to guard against division-by-zero spikes."
          subtext={m.mape_excluded_count > 0 ? `${m.mape_excluded_count} lull hours excluded` : 'Zero lull exclusions'}
        />

        {/* P95 Error */}
        <MetricTile
          label="P95 Abs Error"
          value={m.p95_abs_error !== null ? m.p95_abs_error.toLocaleString() : 'N/A'}
          unit="MW"
          tooltip="95th percentile absolute error: 95% of evaluated hourly misses were below this number."
          subtext="Tail risk barrier"
        />

        {/* Coverage */}
        <MetricTile
          label="Evaluated Slots"
          value={`${m.evaluated_slots}`}
          unit={`/ ${m.total_slots}`}
          tooltip="Evaluated hourly settlement slots where both actuals and cutoff-compliant forecasts were matched."
          badge={{
            text: m.missing_slots === 0 ? '100% Coverage' : `${m.missing_slots} Missing`,
            variant: m.missing_slots === 0 ? 'blue' : 'amber',
          }}
        />
      </div>
    </div>
  );
};

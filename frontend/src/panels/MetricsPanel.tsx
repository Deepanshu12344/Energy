import React, { memo } from 'react';
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
    variant?: 'blue' | 'slate';
  };
  isPreview?: boolean;
}

const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  tooltip,
  subtext,
  badge,
  isPreview = false,
}) => (
  <div className={`bg-slate-50/80 dark:bg-[#1A1A1A] rounded-xl border border-slate-100 dark:border-[#2A2A2A] flex flex-col justify-between group relative ${
    isPreview ? 'p-2 sm:p-2.5' : 'p-3'
  }`}>
    <div className={`flex items-center justify-between text-slate-500 dark:text-[#A3A3A3] ${
      isPreview ? 'text-[11px] mb-0.5' : 'text-xs mb-1'
    }`}>
      <span className="font-medium truncate">{label}</span>
      {!isPreview && (
        <div className="relative group/help">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer" />
          <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/help:block w-48 p-2 bg-slate-900 text-white dark:bg-[#1F1F1F] dark:border dark:border-[#2A2A2A] text-[11px] rounded-lg shadow-lg z-50 pointer-events-none">
            {tooltip}
          </div>
        </div>
      )}
    </div>

    <div className={`flex items-baseline gap-1 ${isPreview ? 'my-0' : 'my-0.5'}`}>
      <span className={`font-bold tracking-tight text-slate-900 dark:text-white ${
        isPreview ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
      }`}>
        {value}
      </span>
      {unit && (
        <span className={`font-semibold text-slate-500 dark:text-[#A3A3A3] ${
          isPreview ? 'text-[11px]' : 'text-xs'
        }`}>
          {unit}
        </span>
      )}
    </div>

    <div className="flex items-center justify-between mt-0.5 text-[10px] sm:text-[11px]">
      {subtext && <span className="text-slate-400 dark:text-[#737373] truncate">{subtext}</span>}
      {badge && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#0B8FE3] dark:bg-blue-950/40 dark:text-[#86C5EE] border border-blue-100/60 dark:border-blue-900/30">
          {badge.text}
        </span>
      )}
    </div>
  </div>
);

interface MetricsPanelProps {
  isPreview?: boolean;
}

const MetricsPanelComponent: React.FC<MetricsPanelProps> = ({ isPreview = false }) => {
  const { metrics, effectiveRange } = useDashboard();
  const m = metrics?.metrics;

  if (!m) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-[#737373]">
        No metrics available for {effectiveRange.label}
      </div>
    );
  }

  const biasSign = m.bias !== null ? (m.bias > 0 ? `+${m.bias.toLocaleString()}` : m.bias.toLocaleString()) : 'N/A';
  const biasLabel = m.bias !== null ? (m.bias > 0 ? 'Over-forecast' : m.bias < 0 ? 'Under-forecast' : 'Unbiased') : 'N/A';

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="grid grid-cols-2 gap-2 flex-1">
        {/* MAE */}
        <MetricTile
          label="MAE"
          value={m.mae !== null ? m.mae.toLocaleString() : 'N/A'}
          unit="MW"
          tooltip="Mean Absolute Error: average magnitude of hourly errors regardless of direction."
          subtext="Typical deviation"
          isPreview={isPreview}
        />

        {/* RMSE */}
        <MetricTile
          label="RMSE"
          value={m.rmse !== null ? m.rmse.toLocaleString() : 'N/A'}
          unit="MW"
          tooltip="Root Mean Squared Error: penalizes large forecast misses more severely than MAE."
          subtext="Typical error size; large misses weigh more"
          isPreview={isPreview}
        />

        {/* Bias */}
        <MetricTile
          label="Mean Bias"
          value={biasSign}
          unit="MW"
          tooltip="Average error (Forecast - Actual). Positive means forecasts persistently exceed actual generation."
          badge={{
            text: biasLabel,
            variant: 'blue',
          }}
          isPreview={isPreview}
        />

        {/* MAPE */}
        <MetricTile
          label="MAPE"
          value={m.mape !== null ? `${m.mape}%` : 'N/A'}
          tooltip="Mean Absolute Percentage Error. Outturns under 10 MW are excluded to guard against division-by-zero spikes."
          subtext={`${m.mape_excluded_count} hours excluded (actual < 10 MW)`}
          isPreview={isPreview}
        />

        {/* P95 Error */}
        <MetricTile
          label="P95 Abs Error"
          value={m.p95_abs_error !== null ? m.p95_abs_error.toLocaleString() : 'N/A'}
          unit="MW"
          tooltip="95th percentile absolute error: 95% of evaluated hourly misses were below this number."
          subtext="Tail risk barrier"
          isPreview={isPreview}
        />

        {/* Coverage */}
        <MetricTile
          label="Evaluated Slots"
          value={`${m.evaluated_slots}`}
          unit={`/ ${m.total_slots}`}
          tooltip="Evaluated hourly settlement slots where both actuals and cutoff-compliant forecasts were matched."
          badge={{
            text: m.missing_slots === 0 ? '100% Coverage' : `${m.missing_slots} Missing`,
            variant: 'blue',
          }}
          isPreview={isPreview}
        />
      </div>
    </div>
  );
};

export const MetricsPanel = memo(MetricsPanelComponent);

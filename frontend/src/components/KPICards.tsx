import React from 'react';
import { Target, TrendingUp, AlertTriangle, ShieldCheck, Percent, HelpCircle } from 'lucide-react';
import type { AccuracyMetrics } from '../api/types';

interface KPICardsProps {
  metrics: AccuracyMetrics | null;
  isLoading: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse h-28"
          >
            <div className="h-4 bg-slate-800 rounded w-1/2 mb-3" />
            <div className="h-7 bg-slate-800 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-800 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const formatMW = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return 'N/A';
    return `${Math.round(val).toLocaleString()} MW`;
  };

  const formatPct = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return 'N/A';
    return `${val.toFixed(1)}%`;
  };

  const biasValue = metrics.bias ?? 0;
  const isOverForecasting = biasValue > 0;
  const coveragePercent =
    metrics.total_slots > 0
      ? ((metrics.evaluated_slots / metrics.total_slots) * 100).toFixed(0)
      : '0';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. MAE */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">MAE</span>
          <Target className="w-4 h-4 text-sky-400" />
        </div>
        <div className="text-xl font-bold text-white tracking-tight">
          {formatMW(metrics.mae)}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
          Mean Absolute Error
        </p>
      </div>

      {/* 2. RMSE */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">RMSE</span>
          <TrendingUp className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-xl font-bold text-white tracking-tight">
          {formatMW(metrics.rmse)}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Penalizes large swings
        </p>
      </div>

      {/* 3. Bias */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">Mean Bias</span>
          <AlertTriangle
            className={`w-4 h-4 ${isOverForecasting ? 'text-amber-400' : 'text-blue-400'}`}
          />
        </div>
        <div
          className={`text-xl font-bold tracking-tight ${
            isOverForecasting ? 'text-amber-400' : 'text-blue-400'
          }`}
        >
          {metrics.bias !== null && metrics.bias !== undefined
            ? `${metrics.bias > 0 ? '+' : ''}${Math.round(metrics.bias).toLocaleString()} MW`
            : 'N/A'}
        </div>
        <div className="mt-1 flex items-center">
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              isOverForecasting
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
            }`}
          >
            {isOverForecasting ? 'Over-forecast (F > A)' : 'Under-forecast (F < A)'}
          </span>
        </div>
      </div>

      {/* 4. MAPE */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">MAPE</span>
          <Percent className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xl font-bold text-white tracking-tight">
          {formatPct(metrics.mape)}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 truncate" title={`${metrics.mape_excluded_count} hours excluded where actual < 10 MW`}>
          {metrics.mape_excluded_count > 0
            ? `${metrics.mape_excluded_count} zero/low hrs cut`
            : 'Guarded (<10MW)'}
        </p>
      </div>

      {/* 5. P95 Error */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">P95 Error</span>
          <ShieldCheck className="w-4 h-4 text-rose-400" />
        </div>
        <div className="text-xl font-bold text-white tracking-tight">
          {formatMW(metrics.p95_abs_error)}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Extreme deviation tail
        </p>
      </div>

      {/* 6. Coverage */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">Coverage</span>
          <HelpCircle className="w-4 h-4 text-teal-400" />
        </div>
        <div className="text-xl font-bold text-white tracking-tight">
          {coveragePercent}%
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {metrics.evaluated_slots} of {metrics.total_slots} hrs matched
        </p>
      </div>
    </div>
  );
};

import React from 'react';
import { Compass, ShieldAlert, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { AccuracyMetrics, ErrorDistributionResponse } from '../api/types';

interface DecisionSupportCardProps {
  metrics: AccuracyMetrics | null;
  distribution: ErrorDistributionResponse | null;
  cutoffTime: string;
  rangeLabel: string;
  isLoading: boolean;
}

export const DecisionSupportCard: React.FC<DecisionSupportCardProps> = ({
  metrics,
  distribution,
  cutoffTime,
  rangeLabel,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse h-36" />
    );
  }

  if (!metrics) {
    return null;
  }

  const p90Buffer = metrics.p90_abs_error ?? metrics.buffer_recommendation_mw_p90;
  const p90Formatted = p90Buffer !== null && p90Buffer !== undefined
    ? `${Math.round(p90Buffer).toLocaleString()} MW`
    : 'N/A';

  const overForecastSharePct =
    distribution?.over_forecast_share !== null && distribution?.over_forecast_share !== undefined
      ? (distribution.over_forecast_share * 100).toFixed(1)
      : null;

  const biasMw = metrics.bias !== null && metrics.bias !== undefined ? Math.round(metrics.bias) : null;
  const isPositiveBias = biasMw !== null && biasMw > 0;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-emerald-500/30 rounded-xl p-5 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Day-Ahead Buyer Decision Support
            </h2>
            <p className="text-xs text-slate-400">
              Evaluated for <strong>{rangeLabel}</strong> with D-1 trading cutoff at{' '}
              <strong>{cutoffTime} London</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/50">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300">
            {metrics.evaluated_slots} hours evaluated
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Suggested Operating Reserve Buffer */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 flex items-start space-x-3">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-md mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-sky-400">
              Suggested Day-Ahead Buffer (P90)
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {p90Formatted}
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              In 9 of 10 hours the forecast was within <strong>{p90Formatted}</strong> of actual, so a buffer of <strong>{p90Formatted}</strong> would have covered most hours.
            </p>
          </div>
        </div>

        {/* Bias Observation */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 flex items-start space-x-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-md mt-0.5">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-amber-400">
              Directional Bias Observation
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {overForecastSharePct !== null ? `${overForecastSharePct}%` : 'N/A'}{' '}
              <span className="text-sm font-normal text-slate-400">over-forecast</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {overForecastSharePct !== null ? (
                <>
                  Forecast was higher than actual in <strong>{overForecastSharePct}% of hours</strong>
                  {biasMw !== null ? (
                    <> (average deviation: <strong>{isPositiveBias ? `+${biasMw.toLocaleString()}` : `${biasMw.toLocaleString()}`} MW</strong>)</>
                  ) : null}
                  . On delivery hours where the forecast overshoots outturn, market buyers risk being left short at gate closure if unhedged.
                </>
              ) : (
                'Calculating error distribution statistics...'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

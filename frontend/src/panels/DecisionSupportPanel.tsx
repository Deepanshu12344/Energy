import React, { memo } from 'react';
import { ShieldAlert, TrendingUp, Info } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { formatDayMonth } from '../utils/dateFormatting';

interface DecisionSupportPanelProps {
  isPreview?: boolean;
}

const DecisionSupportPanelComponent: React.FC<DecisionSupportPanelProps> = ({ isPreview = false }) => {
  const { metrics, distribution, effectiveRange, rangeMode, singleDate } = useDashboard();
  const m = metrics?.metrics;
  const dist = distribution;

  if (!m) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-[#737373]">
        No decision support data available
      </div>
    );
  }

  const p90Buffer = m.buffer_recommendation_mw_p90 ?? m.p90_abs_error ?? 4000;
  const biasVal = m.bias ?? 0;
  const overSharePct =
    dist?.over_forecast_share !== null && dist?.over_forecast_share !== undefined
      ? (dist.over_forecast_share * 100).toFixed(1)
      : null;

  const bufferPrefix =
    rangeMode === 'single'
      ? `On ${formatDayMonth(singleDate)}, in 9 of 10 hours the forecast was within`
      : `Between ${formatDayMonth(effectiveRange.start)} and ${formatDayMonth(effectiveRange.end)}, in 9 of 10 hours the forecast was within`;

  return (
    <div className="w-full h-full flex flex-col justify-between space-y-3">
      {/* 9-of-10 Hours Recommended Buffer Card */}
      <div className="bg-blue-50/70 dark:bg-[#1A1A1A] rounded-xl p-4 border border-blue-100 dark:border-[#2A2A2A]">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#0B8FE3] text-white shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B8FE3] dark:text-[#86C5EE] mb-1">
              Day-Ahead Buyer Buffer Guidance
            </h4>
            <p className="text-sm text-slate-800 dark:text-white leading-snug">
              {bufferPrefix}{' '}
              <strong className="text-slate-900 dark:text-white font-bold">
                {p90Buffer.toLocaleString()} MW
              </strong>{' '}
              of actual, so a buffer of{' '}
              <strong className="text-[#0B8FE3] dark:text-[#86C5EE] font-bold">
                {p90Buffer.toLocaleString()} MW
              </strong>{' '}
              would have covered most hours.
            </p>
          </div>
        </div>
      </div>

      {/* Systematic Bias Observation Card */}
      <div className="bg-slate-50 dark:bg-[#1A1A1A] rounded-xl p-4 border border-slate-100 dark:border-[#2A2A2A] flex-1 flex flex-col justify-center">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
            biasVal > 0
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              : 'bg-blue-100 dark:bg-blue-950/60 text-[#0B8FE3]'
          }`}>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-600 dark:text-[#A3A3A3] space-y-1">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Systematic Bias Observation</span>
            </h4>
            <p className="leading-relaxed">
              {biasVal > 0 ? (
                <>
                  Average error was observed at{' '}
                  <strong className="text-amber-600 dark:text-amber-400 font-semibold">
                    +{biasVal.toLocaleString()} MW
                  </strong>
                  . Forecast was higher than actual in{' '}
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    {overSharePct ? `${overSharePct}%` : 'most'}
                  </strong>{' '}
                  of evaluated hours during {effectiveRange.label.toLowerCase()}.
                </>
              ) : biasVal < 0 ? (
                <>
                  Average error was observed at{' '}
                  <strong className="text-[#0B8FE3] font-semibold">
                    {biasVal.toLocaleString()} MW
                  </strong>
                  . Generation was under-forecast across the selected period.
                </>
              ) : (
                'Zero mean bias observed across the selected evaluation window.'
              )}
            </p>
          </div>
        </div>
      </div>

      {!isPreview && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-[#737373] pt-1">
          <Info className="w-3 h-3 text-slate-400 dark:text-[#737373] shrink-0" />
          <span>Based on {m.evaluated_slots} evaluated settlement slots at {metrics?.cutoff_time} cutoff.</span>
        </div>
      )}
    </div>
  );
};

export const DecisionSupportPanel = memo(DecisionSupportPanelComponent);

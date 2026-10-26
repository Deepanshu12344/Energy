import React, { memo, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';

interface OverUnderPiePanelProps {
  isPreview?: boolean;
}

const OverUnderPiePanelComponent: React.FC<OverUnderPiePanelProps> = ({ isPreview = false }) => {
  const { distribution } = useDashboard();

  const stats = useMemo(() => {
    if (!distribution) return null;
    const overShare = distribution.over_forecast_share ?? 0;
    const total = distribution.total_samples ?? 0;
    const overCount = distribution.over_forecast_count ?? Math.round(total * overShare);
    const underCount = Math.max(0, total - overCount);
    const underShare = total > 0 ? underCount / total : 0;
    const overPct = Number((overShare * 100).toFixed(1));
    const underPct = Number((underShare * 100).toFixed(1));

    return {
      total,
      overCount,
      underCount,
      overPct,
      underPct,
    };
  }, [distribution]);

  if (!distribution || !stats || stats.total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-[#737373]">
        No forecast evaluation data available
      </div>
    );
  }

  const { overCount, underCount, overPct, underPct } = stats;
  const isOverSmall = overPct < 8;
  const isUnderSmall = underPct < 8;

  return (
    <div className="w-full h-full flex flex-col justify-between p-1">
      {/* Top: Large Headline with Amber Chip */}
      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {overPct}%{' '}
            <span className="text-sm font-semibold text-slate-600 dark:text-[#A3A3A3]">
              of hours over-forecast
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#0B8FE3] dark:text-[#86C5EE] border border-blue-200/80 dark:border-blue-800/50 uppercase tracking-wider">
            Over-forecast
          </span>
        </div>
        {!isPreview && (
          <p className="text-xs text-slate-500 dark:text-[#737373]">
            Outturn generation was below the day-ahead selected forecast in {overCount.toLocaleString()} of {stats.total.toLocaleString()} hours.
          </p>
        )}
      </div>

      {/* Middle: Single Horizontal Split Bar (Two Blue Tones) */}
      <div className="my-auto py-2">
        <div className="relative w-full h-10 sm:h-12 bg-slate-100 dark:bg-[#1A1A1A] rounded-xl overflow-hidden flex border border-slate-200/80 dark:border-[#2A2A2A] shadow-inner">
          {/* Over-forecast segment (Primary Blue #0B8FE3) */}
          <div
            style={{ width: `${Math.max(overPct, 1)}%` }}
            className="h-full bg-[#0B8FE3] hover:bg-[#097ec9] transition-all flex items-center justify-center px-2 text-white overflow-hidden group relative"
            title={`Over-forecast: ${overPct}% (${overCount} hrs)`}
          >
            {!isOverSmall ? (
              <div className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap drop-shadow-sm">
                <span>{overPct}%</span>
                <span className="text-[10px] font-medium opacity-90 hidden sm:inline">
                  ({overCount.toLocaleString()}h)
                </span>
              </div>
            ) : null}
          </div>

          {/* Under-forecast segment (Secondary Lighter Blue #86C5EE) */}
          <div
            style={{ width: `${Math.max(underPct, 1)}%` }}
            className="h-full bg-[#86C5EE] hover:bg-[#74b6df] transition-all flex items-center justify-center px-2 text-slate-900 overflow-hidden group relative"
            title={`Under-forecast: ${underPct}% (${underCount} hrs)`}
          >
            {!isUnderSmall ? (
              <div className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap drop-shadow-sm text-slate-900">
                <span>{underPct}%</span>
                <span className="text-[10px] font-medium opacity-90 hidden sm:inline text-slate-800">
                  ({underCount.toLocaleString()}h)
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Small segment external label fallback */}
        {(isOverSmall || isUnderSmall) && (
          <div className="flex justify-between text-[11px] text-slate-500 dark:text-[#A3A3A3] mt-1.5 px-1 font-medium">
            {isOverSmall && (
              <span className="text-[#0B8FE3] dark:text-[#86C5EE] font-semibold">
                Over: {overPct}% ({overCount}h)
              </span>
            )}
            {isUnderSmall && (
              <span className="text-[#0B8FE3] dark:text-[#86C5EE] font-semibold ml-auto">
                Under: {underPct}% ({underCount}h)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom: Clean Legend with Swatches, Counts, and Percentages */}
      <div className="pt-2 border-t border-slate-100 dark:border-[#2A2A2A] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {/* Over-forecast Legend Item */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 rounded-sm bg-[#0B8FE3] shrink-0" />
            <span className="font-medium text-slate-700 dark:text-[#D4D4D4] truncate">
              Over-forecast <span className="text-[11px] text-slate-400 dark:text-[#737373]">(actual &lt; forecast)</span>
            </span>
          </div>
          <div className="text-right shrink-0 ml-2">
            <span className="font-bold text-slate-900 dark:text-white">{overPct}%</span>
            <span className="text-[11px] text-slate-400 dark:text-[#737373] ml-1">({overCount}h)</span>
          </div>
        </div>

        {/* Under-forecast Legend Item */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 rounded-sm bg-[#86C5EE] shrink-0" />
            <span className="font-medium text-slate-700 dark:text-[#D4D4D4] truncate">
              Under-forecast <span className="text-[11px] text-slate-400 dark:text-[#737373]">(actual &ge; forecast)</span>
            </span>
          </div>
          <div className="text-right shrink-0 ml-2">
            <span className="font-bold text-slate-900 dark:text-white">{underPct}%</span>
            <span className="text-[11px] text-slate-400 dark:text-[#737373] ml-1">({underCount}h)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const OverUnderPiePanel = memo(OverUnderPiePanelComponent);

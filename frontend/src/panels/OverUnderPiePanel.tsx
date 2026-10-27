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
    const overPct = Number((overShare * 100).toFixed(1));
    const underPct = total > 0 ? Number(((underCount / total) * 100).toFixed(1)) : 0;

    return {
      total,
      overCount,
      underCount,
      overPct,
      underPct,
    };
  }, [distribution]);

  if (!distribution || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-[#737373]">
        No distribution data available
      </div>
    );
  }

  const { total, overCount, underCount, overPct, underPct } = stats;

  const isOverSmall = overPct > 0 && overPct < 8;
  const isUnderSmall = underPct > 0 && underPct < 8;

  return (
    <div className="w-full h-full flex flex-col justify-between p-1">
      {/* Top: Large Headline */}
      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {overPct}%{' '}
            <span className="text-sm font-semibold text-slate-600 dark:text-[#A3A3A3]">
              of hours over-forecast
            </span>
          </div>
        </div>
        {!isPreview && (
          <p className="text-xs text-slate-500 dark:text-[#737373]">
            Outturn generation was below the day-ahead selected forecast in {overCount.toLocaleString()} of {total.toLocaleString()} hours.
          </p>
        )}
      </div>

      {/* Middle: Horizontal Split Bar */}
      <div className="my-auto py-2">
        <div className="relative w-full h-10 sm:h-12 bg-slate-100 dark:bg-[#1A1A1A] rounded-xl overflow-hidden flex border border-slate-200/80 dark:border-[#2A2A2A] shadow-inner">
          {/* Over-forecast segment */}
          {overPct > 0 && (
            <div
              style={{ width: `${overPct}%` }}
              className="h-full bg-[#0B8FE3] hover:brightness-105 transition-all flex items-center justify-center px-2 text-white overflow-hidden group relative"
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
          )}

          {/* Under-forecast segment */}
          {underPct > 0 && (
            <div
              style={{ width: `${underPct}%` }}
              className="h-full bg-[#86C5EE] hover:brightness-105 transition-all flex items-center justify-center px-2 text-slate-900 overflow-hidden group relative"
              title={`Under-forecast: ${underPct}% (${underCount} hrs)`}
            >
              {!isUnderSmall ? (
                <div className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap drop-shadow-sm">
                  <span>{underPct}%</span>
                  <span className="text-[10px] font-medium opacity-90 hidden sm:inline">
                    ({underCount.toLocaleString()}h)
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Small segment & 0% outside labels */}
        {(isOverSmall || isUnderSmall || overPct === 0 || underPct === 0) && (
          <div className="flex justify-between text-[11px] text-slate-500 dark:text-[#A3A3A3] mt-1.5 px-1 font-medium">
            {(isOverSmall || overPct === 0) && (
              <span className="text-[#0B8FE3] font-semibold">
                Over: {overPct}% ({overCount}h)
              </span>
            )}
            {(isUnderSmall || underPct === 0) && (
              <span className="text-[#0B8FE3] dark:text-[#86C5EE] font-semibold ml-auto">
                Under: {underPct}% ({underCount}h)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom: Clean Legend with Swatches, Counts, and Percentages */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-[#2A2A2A] text-xs font-medium text-slate-600 dark:text-[#A3A3A3]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#0B8FE3] shrink-0" />
          <span>
            Over-forecast: <strong className="text-slate-900 dark:text-white">{overPct}%</strong> ({overCount.toLocaleString()}h)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#86C5EE] shrink-0" />
          <span>
            Under-forecast: <strong className="text-slate-900 dark:text-white">{underPct}%</strong> ({underCount.toLocaleString()}h)
          </span>
        </div>
      </div>
    </div>
  );
};

export const OverUnderPiePanel = memo(OverUnderPiePanelComponent);

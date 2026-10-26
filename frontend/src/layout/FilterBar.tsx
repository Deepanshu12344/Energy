import React, { useMemo, memo } from 'react';
import { Calendar, Clock, Info } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

const FilterBarComponent: React.FC = () => {
  const {
    singleDate,
    setSingleDate,
    cutoffTime,
    setCutoffTime,
    rangeMode,
    setRangeMode,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    forecast,
  } = useDashboard();

  // Compute D-1 date for cutoff banner display
  const dMinus1String = useMemo(() => {
    try {
      const d = new Date(`${singleDate}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      return d.toISOString().slice(0, 10);
    } catch {
      return '2026-01-14';
    }
  }, [singleDate]);

  // Cutoff UTC text (in Jan, London is UTC+0; or use forecast API cutoff if present)
  const cutoffUtcTime = forecast?.cutoff_time || cutoffTime;
  const cutoffBannerText = `Forecast as of ${dMinus1String} ${cutoffTime} Europe/London (${cutoffUtcTime} UTC)`;

  return (
    <div className="w-full bg-white dark:bg-[#141414] rounded-xl border border-slate-200/80 dark:border-[#2A2A2A] p-4 shadow-sm mb-6 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Controls Grid */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Range Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1A1A1A] p-1 rounded-lg border border-slate-200/60 dark:border-[#2A2A2A]">
            <button
              type="button"
              onClick={() => setRangeMode('single')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                rangeMode === 'single'
                  ? 'bg-white dark:bg-[#0B8FE3] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-[#A3A3A3] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Single Day
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('full')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                rangeMode === 'full'
                  ? 'bg-white dark:bg-[#0B8FE3] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-[#A3A3A3] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Full Jan 2026
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                rangeMode === 'custom'
                  ? 'bg-white dark:bg-[#0B8FE3] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-[#A3A3A3] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Delivery Date Picker (for single day & chart focus) */}
          <div className="flex items-center gap-2">
            <label htmlFor="delivery-date-input" className="text-xs font-medium text-slate-500 dark:text-[#A3A3A3] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-[#737373]" />
              <span>{rangeMode === 'single' ? 'Delivery Day' : 'Focus Day'}:</span>
            </label>
            <input
              id="delivery-date-input"
              type="date"
              min="2026-01-01"
              max="2026-01-31"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="bg-slate-50 dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#2A2A2A] text-slate-800 dark:text-white text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-[#0B8FE3]"
            />
          </div>

          {/* Custom Range Inputs */}
          {rangeMode === 'custom' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-[#737373]">From:</span>
              <input
                type="date"
                min="2026-01-01"
                max={endDate}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#2A2A2A] text-slate-800 dark:text-white text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-[#0B8FE3]"
              />
              <span className="text-xs text-slate-400 dark:text-[#737373]">To:</span>
              <input
                type="date"
                min={startDate}
                max="2026-01-31"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#2A2A2A] text-slate-800 dark:text-white text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-[#0B8FE3]"
              />
            </div>
          )}

          {/* Cutoff Time Input */}
          <div className="flex items-center gap-2">
            <label htmlFor="cutoff-time-input" className="text-xs font-medium text-slate-500 dark:text-[#A3A3A3] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-[#737373]" />
              <span>D-1 Gate:</span>
            </label>
            <input
              id="cutoff-time-input"
              type="text"
              placeholder="12:00"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              pattern="^([01]\d|2[0-3]):[0-5]\d$"
              title="24-hour format HH:MM (e.g. 12:00)"
              className="w-16 bg-slate-50 dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#2A2A2A] text-slate-800 dark:text-white text-xs rounded-lg px-2.5 py-1.5 font-medium text-center focus:outline-none focus:ring-1 focus:ring-[#0B8FE3]"
            />
          </div>
        </div>

        {/* Dynamic Cutoff Banner Text */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/70 dark:bg-[#1A1A1A] border border-blue-100 dark:border-[#2A2A2A] text-xs text-blue-800 dark:text-[#86C5EE]">
          <Info className="w-3.5 h-3.5 shrink-0 text-[#0B8FE3]" />
          <span className="font-medium truncate">{cutoffBannerText}</span>
        </div>
      </div>
    </div>
  );
};

export const FilterBar = memo(FilterBarComponent);

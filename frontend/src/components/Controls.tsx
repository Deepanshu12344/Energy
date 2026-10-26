import React from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

export type RangeMode = 'single' | 'full' | 'custom';

interface ControlsProps {
  rangeMode: RangeMode;
  onRangeModeChange: (mode: RangeMode) => void;
  singleDate: string;
  onSingleDateChange: (date: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  cutoffTime: string;
  onCutoffTimeChange: (time: string) => void;
  isLoading: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  rangeMode,
  onRangeModeChange,
  singleDate,
  onSingleDateChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  cutoffTime,
  onCutoffTimeChange,
  isLoading,
}) => {
  const minDate = '2026-01-01';
  const maxDate = '2026-01-31';

  const handlePrevDay = () => {
    if (rangeMode === 'single') {
      const current = new Date(singleDate);
      current.setDate(current.getDate() - 1);
      const prev = current.toISOString().slice(0, 10);
      if (prev >= minDate) {
        onSingleDateChange(prev);
      }
    }
  };

  const handleNextDay = () => {
    if (rangeMode === 'single') {
      const current = new Date(singleDate);
      current.setDate(current.getDate() + 1);
      const next = current.toISOString().slice(0, 10);
      if (next <= maxDate) {
        onSingleDateChange(next);
      }
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg shadow-black/20">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Mode Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => onRangeModeChange('single')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              rangeMode === 'single'
                ? 'bg-[#0B8FE3] text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Delivery Day
          </button>
          <button
            type="button"
            onClick={() => onRangeModeChange('full')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              rangeMode === 'full'
                ? 'bg-[#0B8FE3] text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Full January 2026
          </button>
          <button
            type="button"
            onClick={() => onRangeModeChange('custom')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              rangeMode === 'custom'
                ? 'bg-[#0B8FE3] text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Date Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {rangeMode === 'single' && (
            <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={handlePrevDay}
                disabled={singleDate <= minDate || isLoading}
                title="Previous Day"
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2 px-2">
                <Calendar className="w-4 h-4 text-[#0B8FE3]" />
                <span className="text-xs text-slate-400">Date:</span>
                <input
                  type="date"
                  value={singleDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => onSingleDateChange(e.target.value)}
                  disabled={isLoading}
                  className="bg-transparent text-sm text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                />
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                disabled={singleDate >= maxDate || isLoading}
                title="Next Day"
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {rangeMode === 'custom' && (
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <Calendar className="w-4 h-4 text-[#0B8FE3]" />
              <div className="flex items-center space-x-1 text-xs">
                <span className="text-slate-400">From:</span>
                <input
                  type="date"
                  value={startDate}
                  min={minDate}
                  max={endDate || maxDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  disabled={isLoading}
                  className="bg-transparent text-sm text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                />
                <span className="text-slate-500 mx-1">→</span>
                <span className="text-slate-400">To:</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || minDate}
                  max={maxDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  disabled={isLoading}
                  className="bg-transparent text-sm text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                />
              </div>
            </div>
          )}

          {rangeMode === 'full' && (
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-[#0B8FE3]" />
              <span>Evaluating all 31 delivery days: <strong>2026-01-01 to 2026-01-31</strong> (744 hours)</span>
            </div>
          )}

          {/* D-1 Cutoff Time Input */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-4 h-4 text-[#0B8FE3]" />
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-400">D-1 Cutoff:</span>
              <input
                type="text"
                pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                value={cutoffTime}
                onChange={(e) => onCutoffTimeChange(e.target.value)}
                placeholder="12:00"
                disabled={isLoading}
                title="D-1 decision cutoff time in Europe/London (HH:MM)"
                className="w-14 bg-slate-900 border border-slate-700 text-slate-100 text-center text-xs font-mono py-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-500">London</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

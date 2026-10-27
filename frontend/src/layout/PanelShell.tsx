import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { MoreHorizontal, Maximize2, Download, Trash2, Search, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { ALL_PANELS, type PanelId } from '../registry/panelRegistry';
import { getDaysInRange, formatFullDay, getScopeBadge } from '../utils/dateFormatting';

interface PanelShellProps {
  id: PanelId;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onSearchToggle?: () => void;
  isSearchOpen?: boolean;
  onExportCsv?: () => void;
  isDragging?: boolean;
}

const PanelShellComponent: React.FC<PanelShellProps> = ({
  id,
  children,
  loading = false,
  error = null,
  onSearchToggle,
  isSearchOpen = false,
  onExportCsv,
  isDragging = false,
}) => {
  const {
    removePanel,
    setExpandedPanelId,
    refetchPanel,
    rangeMode,
    singleDate,
    setSingleDate,
    effectiveRange,
  } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const def = ALL_PANELS[id];
  const title = def?.title || id;

  const rangeDays = useMemo(() => {
    return getDaysInRange(effectiveRange.start, effectiveRange.end);
  }, [effectiveRange.start, effectiveRange.end]);

  const currentIndex = rangeDays.indexOf(singleDate);
  const safeIndex = currentIndex !== -1 ? currentIndex : 0;
  const hasPrevDay = safeIndex > 0;
  const hasNextDay = safeIndex < rangeDays.length - 1;

  const handlePrevDay = () => {
    if (hasPrevDay) setSingleDate(rangeDays[safeIndex - 1]);
  };

  const handleNextDay = () => {
    if (hasNextDay) setSingleDate(rangeDays[safeIndex + 1]);
  };

  const scopeBadgeText = useMemo(() => {
    return getScopeBadge(rangeMode, singleDate, effectiveRange.start, effectiveRange.end);
  }, [rangeMode, singleDate, effectiveRange.start, effectiveRange.end]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div
      className={`w-full h-full bg-white dark:bg-[#141414] rounded-xl border border-slate-200/80 dark:border-[#2A2A2A] shadow-sm flex flex-col overflow-hidden ${
        isDragging ? 'pointer-events-none select-none' : ''
      }`}
    >
      {/* Panel Header (Restricted drag handle for react-grid-layout) */}
      <div className="panel-header-drag flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#2A2A2A] select-none cursor-grab active:cursor-grabbing gap-3">
        {/* Title and Scope Badge / In-panel Day Picker */}
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white tracking-tight truncate">
            {title}
          </h3>

          {/* In-panel Day Picker for Forecast chart in multi-day range mode */}
          {id === 'forecast' && rangeMode !== 'single' ? (
            <div
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#A3A3A3] pointer-events-auto"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="text-xs font-medium text-slate-500 dark:text-[#737373] hidden sm:inline">
                Day shown:
              </span>
              <div className="flex items-center bg-slate-100 dark:bg-[#1F1F1F] rounded-md border border-slate-200 dark:border-[#2A2A2A] p-0.5">
                <button
                  type="button"
                  disabled={!hasPrevDay}
                  onClick={handlePrevDay}
                  title="Previous day"
                  className="p-1 rounded text-slate-600 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-[#2A2A2A] transition"
                  aria-label="Previous day in range"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <select
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white px-1.5 py-0.5 focus:outline-none cursor-pointer"
                  aria-label="Day shown"
                >
                  {rangeDays.map((d) => (
                    <option key={d} value={d} className="bg-white dark:bg-[#141414] text-slate-800 dark:text-white">
                      {formatFullDay(d)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!hasNextDay}
                  onClick={handleNextDay}
                  title="Next day"
                  className="p-1 rounded text-slate-600 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-[#2A2A2A] transition"
                  aria-label="Next day in range"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Explicit scope badge in every other panel */
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-[#1F1F1F] text-[#0B8FE3] dark:text-[#86C5EE] border border-blue-100/60 dark:border-[#2A2A2A] shrink-0">
              {scopeBadgeText}
            </span>
          )}
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1 pointer-events-auto shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          {/* Search Icon (for Data Table) */}
          {def?.hasSearch && onSearchToggle && (
            <button
              type="button"
              onClick={onSearchToggle}
              title={isSearchOpen ? 'Close search' : 'Search table'}
              className={`p-1.5 rounded-md transition-colors ${
                isSearchOpen
                  ? 'bg-blue-50 dark:bg-[#1F1F1F] text-[#0B8FE3] dark:text-[#86C5EE]'
                  : 'text-slate-400 hover:text-slate-700 dark:text-[#A3A3A3] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1F1F1F]'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Three-dot "..." Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Panel options"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:text-[#A3A3A3] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1F1F1F] transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#1F1F1F] rounded-lg shadow-xl border border-slate-200 dark:border-[#2A2A2A] py-1 z-50 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setExpandedPanelId(id);
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-slate-700 dark:text-[#A3A3A3] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2A2A2A] transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400 dark:text-[#737373]" />
                  <span>Expand View</span>
                </button>

                {def?.hasCsvExport && onExportCsv && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onExportCsv();
                    }}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-slate-700 dark:text-[#A3A3A3] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2A2A2A] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400 dark:text-[#737373]" />
                    <span>Download CSV</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100 dark:border-[#2A2A2A]" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    removePanel(id);
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Remove Panel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel Body Content */}
      <div className="flex-1 min-h-0 p-5 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#1F1F1F]" />
            <div className="w-3/4 h-3 rounded bg-slate-100 dark:bg-[#1F1F1F]" />
            <div className="w-1/2 h-2.5 rounded bg-slate-100 dark:bg-[#1F1F1F]" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-xs">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
            <p className="font-semibold text-slate-800 dark:text-white mb-1">Failed to load panel</p>
            <p className="text-slate-500 dark:text-[#A3A3A3] max-w-xs mb-3 text-[11px]">{error}</p>
            <button
              type="button"
              onClick={() => refetchPanel(id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-[#1F1F1F] text-[#0B8FE3] dark:text-[#86C5EE] border border-blue-100 dark:border-[#2A2A2A] hover:bg-blue-100 dark:hover:bg-[#2A2A2A] font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export const PanelShell = memo(PanelShellComponent);

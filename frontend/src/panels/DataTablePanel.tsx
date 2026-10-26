import React, { useState, useMemo, useEffect, memo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { downloadCsv } from '../utils/csvExport';

interface DataTablePanelProps {
  isSearchOpen?: boolean;
  onCloseSearch?: () => void;
  onRegisterExport?: (fn: () => void) => void;
  isPreview?: boolean;
}

const PAGE_SIZE = 5; // Exactly 5 rows per page matching screenshot

const DataTablePanelComponent: React.FC<DataTablePanelProps> = ({
  isSearchOpen = false,
  onCloseSearch,
  onRegisterExport,
  isPreview = false,
}) => {
  const { forecast, singleDate } = useDashboard();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const items = useMemo(() => forecast?.data || [], [forecast?.data]);

  // Reset page when date changes
  useEffect(() => {
    queueMicrotask(() => setPage(1));
  }, [singleDate]);

  // Filtering
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const time = item.start_time.slice(11, 16).toLowerCase();
      const status = item.status.toLowerCase();
      const actual = item.actual_mw !== null ? String(item.actual_mw) : '';
      const forecastVal = item.forecast_mw !== null ? String(item.forecast_mw) : '';
      return (
        time.includes(q) ||
        status.includes(q) ||
        actual.includes(q) ||
        forecastVal.includes(q)
      );
    });
  }, [items, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = isPreview ? filteredItems.slice(0, 3) : filteredItems.slice(startIndex, startIndex + PAGE_SIZE);

  // Register CSV Export
  useEffect(() => {
    if (onRegisterExport && items.length > 0) {
      onRegisterExport(() => {
        const headers = [
          'Settlement Slot (UTC)',
          'Actual Generation (MW)',
          'Selected Forecast (MW)',
          'Forecast Error (MW)',
          'Published Time (UTC)',
          'Lead Time (Hours)',
          'Status',
        ];
        const rows = items.map((r) => [
          r.start_time,
          r.actual_mw ?? '',
          r.forecast_mw ?? '',
          r.error_mw ?? '',
          r.publish_time ?? '',
          r.lead_time_hours ?? '',
          r.status,
        ]);
        downloadCsv(`settlement_data_${singleDate}`, headers, rows);
      });
    }
  }, [onRegisterExport, items, singleDate]);

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Inline Search Bar */}
      {isSearchOpen && !isPreview && (
        <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] animate-fade-in">
          <input
            type="text"
            placeholder="Search time, status, or values..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="flex-1 bg-transparent text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {onCloseSearch && (
            <button
              type="button"
              onClick={onCloseSearch}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-[#A3A3A3] dark:hover:text-white px-2 py-0.5"
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Table Container with Solid Black Header */}
      <div className="flex-1 overflow-x-auto rounded-lg border border-slate-200/80 dark:border-[#2A2A2A]">
        <table className="w-full text-left text-xs whitespace-nowrap">
          {/* Black Header Row */}
          <thead>
            <tr className="bg-black text-white font-bold text-[11px] uppercase tracking-wider">
              <th className="px-3.5 py-3 rounded-tl-lg">Time (UTC)</th>
              <th className="px-3 py-3 text-right">Actual (MW)</th>
              <th className="px-3 py-3 text-right">Forecast (MW)</th>
              <th className="px-3 py-3 text-right">Error (MW)</th>
              <th className="px-3 py-3 text-center">Published (UTC)</th>
              <th className="px-3 py-3 text-right">Lead (h)</th>
              <th className="px-3.5 py-3 rounded-tr-lg text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-[#737373]">
                  No matching settlement slots found
                </td>
              </tr>
            ) : (
              pageItems.map((row, idx) => {
                const time = row.start_time.slice(11, 16);
                const published = row.publish_time ? row.publish_time.slice(11, 16) : '—';
                const isOver = row.error_mw !== null && row.error_mw > 0;
                const isUnder = row.error_mw !== null && row.error_mw < 0;

                return (
                  <tr
                    key={row.start_time}
                    className={`transition-colors hover:bg-blue-50/40 dark:hover:bg-[#1F1F1F] ${
                      idx % 2 === 0
                        ? 'bg-white dark:bg-[#141414]'
                        : 'bg-slate-50/50 dark:bg-[#1A1A1A]'
                    }`}
                  >
                    <td className="px-3.5 py-2.5 font-semibold text-slate-800 dark:text-white">
                      {time}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-900 dark:text-white">
                      {row.actual_mw !== null ? row.actual_mw.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-700 dark:text-[#A3A3A3]">
                      {row.forecast_mw !== null ? row.forecast_mw.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">
                      {row.error_mw !== null ? (
                        <span
                          className={
                            isOver
                              ? 'text-amber-500'
                              : isUnder
                              ? 'text-[#0B8FE3]'
                              : 'text-slate-600 dark:text-[#A3A3A3]'
                          }
                        >
                          {row.error_mw > 0 ? `+${row.error_mw.toLocaleString()}` : row.error_mw.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-[#737373]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-500 dark:text-[#A3A3A3]">
                      {published}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-500 dark:text-[#A3A3A3]">
                      {row.lead_time_hours !== null ? `${row.lead_time_hours}h` : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          row.status === 'forecast_selected'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-[#0B8FE3] dark:text-[#86C5EE]'
                            : row.status === 'missing'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                            : 'bg-slate-100 dark:bg-[#2A2A2A] text-slate-500 dark:text-[#A3A3A3]'
                        }`}
                      >
                        {row.status === 'forecast_selected'
                          ? 'Selected'
                          : row.status === 'missing'
                          ? 'Missing'
                          : 'Half-hour slot'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5-Row Pagination Bar */}
      {!isPreview && (
        <div className="flex items-center justify-between pt-3 text-xs text-slate-500 dark:text-[#A3A3A3]">
          <div>
            Showing <strong className="text-slate-800 dark:text-white">{filteredItems.length === 0 ? 0 : startIndex + 1}</strong> to{' '}
            <strong className="text-slate-800 dark:text-white">{Math.min(startIndex + PAGE_SIZE, filteredItems.length)}</strong> of{' '}
            <strong className="text-slate-800 dark:text-white">{filteredItems.length}</strong> slots
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-md border border-slate-200 dark:border-[#2A2A2A] text-slate-600 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-[#1F1F1F] transition"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-slate-700 dark:text-[#A3A3A3]">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-md border border-slate-200 dark:border-[#2A2A2A] text-slate-600 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-[#1F1F1F] transition"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const DataTablePanel = memo(DataTablePanelComponent);

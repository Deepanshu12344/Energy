import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { downloadCsv } from '../utils/csvExport';

interface DataTablePanelProps {
  isSearchOpen?: boolean;
  onCloseSearch?: () => void;
  onRegisterExport?: (fn: () => void) => void;
}

const PAGE_SIZE = 5; // Exactly 5 rows per page matching screenshot

export const DataTablePanel: React.FC<DataTablePanelProps> = ({
  isSearchOpen = false,
  onCloseSearch,
  onRegisterExport,
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
  const pageItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);

  // Register CSV Export
  useEffect(() => {
    if (onRegisterExport && items.length > 0) {
      onRegisterExport(() => {
        const headers = [
          'Settlement Slot (UTC)',
          'Actual Generation (MW)',
          'Selected Forecast (MW)',
          'Forecast Error (MW)',
          'Publish Time (UTC)',
          'Lead Time (Hours)',
          'Selection Status',
        ];
        const rows = items.map((item) => [
          item.start_time,
          item.actual_mw,
          item.forecast_mw,
          item.error_mw,
          item.publish_time,
          item.lead_time_hours,
          item.status,
        ]);
        downloadCsv(`forecast_data_table_${singleDate}`, headers, rows);
      });
    }
  }, [onRegisterExport, items, singleDate]);

  if (!items.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
        No settlement data available
      </div>
    );
  }

  const startDisplay = filteredItems.length === 0 ? 0 : startIndex + 1;
  const endDisplay = Math.min(startIndex + PAGE_SIZE, filteredItems.length);

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      {/* Inline Search Bar (Toggled by Header Search Icon) */}
      {isSearchOpen && (
        <div className="mb-2.5 flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 animate-fade-in">
          <input
            type="text"
            placeholder="Search by time, status, or MW..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="flex-1 bg-transparent px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none placeholder:text-slate-400"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {onCloseSearch && (
            <button
              type="button"
              onClick={onCloseSearch}
              className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Table Container with Solid Black Header matching screenshot */}
      <div className="flex-1 overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800">
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
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
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
                    className={`transition-colors hover:bg-blue-50/40 dark:hover:bg-slate-800/40 ${
                      idx % 2 === 0
                        ? 'bg-white dark:bg-[#131B2E]'
                        : 'bg-slate-50/50 dark:bg-slate-900/30'
                    }`}
                  >
                    <td className="px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                      {time}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-900 dark:text-white">
                      {row.actual_mw !== null ? row.actual_mw.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-700 dark:text-slate-300">
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
                              : 'text-slate-600 dark:text-slate-300'
                          }
                        >
                          {row.error_mw > 0 ? `+${row.error_mw.toLocaleString()}` : row.error_mw.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-500 dark:text-slate-400">
                      {published}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-500 dark:text-slate-400">
                      {row.lead_time_hours !== null ? `${row.lead_time_hours}h` : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          row.status === 'forecast_selected'
                            ? 'bg-blue-50 text-[#0B8FE3] dark:bg-blue-950/60 dark:text-blue-300'
                            : row.status === 'missing'
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        }`}
                      >
                        {row.status === 'forecast_selected'
                          ? 'Selected'
                          : row.status === 'missing'
                          ? 'Missing'
                          : ':30 Slot'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Screenshot-Style Pagination Footer */}
      <div className="flex items-center justify-between pt-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 mt-2">
        <span>
          Showing {startDisplay} - {endDisplay} of {filteredItems.length}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <span className="font-medium text-slate-700 dark:text-slate-300">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

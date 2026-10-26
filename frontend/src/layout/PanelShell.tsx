import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Maximize2, Download, Trash2, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { ALL_PANELS, type PanelId } from '../registry/panelRegistry';

interface PanelShellProps {
  id: PanelId;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onSearchToggle?: () => void;
  isSearchOpen?: boolean;
  onExportCsv?: () => void;
}

export const PanelShell: React.FC<PanelShellProps> = ({
  id,
  children,
  loading = false,
  error = null,
  onSearchToggle,
  isSearchOpen = false,
  onExportCsv,
}) => {
  const { removePanel, setExpandedPanelId, refetchPanel } = useDashboard();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const def = ALL_PANELS[id];
  const title = def?.title || id;

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
    <div className="w-full h-full bg-white dark:bg-[#131B2E] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden transition-colors">
      {/* Panel Header (Restricted drag handle for react-grid-layout) */}
      <div className="panel-header-drag flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 select-none cursor-grab active:cursor-grabbing">
        {/* Title */}
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
          {title}
        </h3>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          {/* Search Icon (for Data Table) */}
          {def?.hasSearch && onSearchToggle && (
            <button
              type="button"
              onClick={onSearchToggle}
              title={isSearchOpen ? 'Close search' : 'Search table'}
              className={`p-1.5 rounded-md transition-colors ${
                isSearchOpen
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-[#0B8FE3]'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
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
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setExpandedPanelId(id);
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Expand View</span>
                </button>

                {def?.hasCsvExport && onExportCsv && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onExportCsv();
                    }}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Download CSV</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

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
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="w-3/4 h-3 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="w-1/2 h-2.5 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-xs">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
            <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Failed to load panel</p>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-3 text-[11px]">{error}</p>
            <button
              type="button"
              onClick={() => refetchPanel(id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0B8FE3] hover:bg-blue-100 dark:hover:bg-blue-900/60 font-medium transition-colors"
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

import React, { useEffect, useRef } from 'react';
import { X, Plus, CheckCircle2 } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { ALL_PANELS, type PanelId } from '../registry/panelRegistry';
import { ForecastChartPanel } from '../panels/ForecastChartPanel';
import { MetricsPanel } from '../panels/MetricsPanel';
import { DecisionSupportPanel } from '../panels/DecisionSupportPanel';
import { ErrorDistributionPanel } from '../panels/ErrorDistributionPanel';
import { OverUnderPiePanel } from '../panels/OverUnderPiePanel';
import { HourlyErrorPanel } from '../panels/HourlyErrorPanel';
import { HorizonPanel } from '../panels/HorizonPanel';
import { DataTablePanel } from '../panels/DataTablePanel';

export const AddPanelModal: React.FC = () => {
  const { isAddModalOpen, setIsAddModalOpen, visiblePanels, addPanel } = useDashboard();
  const modalRef = useRef<HTMLDivElement>(null);

  const availablePanels = (Object.keys(ALL_PANELS) as PanelId[]).filter(
    (id) => !visiblePanels.includes(id)
  );

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isAddModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, setIsAddModalOpen]);

  if (!isAddModalOpen) return null;

  const renderPreviewInner = (id: PanelId) => {
    switch (id) {
      case 'forecast':
        return <ForecastChartPanel isPreview={true} />;
      case 'metrics':
        return <MetricsPanel isPreview={true} />;
      case 'decision':
        return <DecisionSupportPanel isPreview={true} />;
      case 'distribution':
        return <ErrorDistributionPanel isPreview={true} />;
      case 'pie':
        return <OverUnderPiePanel isPreview={true} />;
      case 'hourly':
        return <HourlyErrorPanel isPreview={true} />;
      case 'horizon':
        return <HorizonPanel isPreview={true} />;
      case 'table':
        return <DataTablePanel isPreview={true} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        ref={modalRef}
        className="w-[94vw] max-w-7xl h-[88vh] max-h-[88vh] bg-white dark:bg-[#141414] rounded-2xl border border-slate-200 dark:border-[#2A2A2A] shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-panel-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2A2A2A] bg-white dark:bg-[#141414] shrink-0">
          <div>
            <h2 id="add-panel-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Add panel to dashboard
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#A3A3A3] mt-0.5">
              Click any panel preview to add it back to your active dashboard layout.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(false)}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:text-[#A3A3A3] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1F1F1F] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Responsive Preview Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-50/60 dark:bg-[#0A0A0A]">
          {availablePanels.length === 0 ? (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0B8FE3] flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8 text-[#0B8FE3]" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                All panels are already on your dashboard.
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#A3A3A3] max-w-sm">
                Every analytical panel is currently active on your dashboard. You can rearrange them by dragging the headers or resize them from the bottom-right corner.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {availablePanels.map((id) => {
                const def = ALL_PANELS[id];
                return (
                  <div
                    key={id}
                    role="button"
                    tabIndex={0}
                    data-testid={`preview-panel-${id}`}
                    onClick={() => addPanel(id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        addPanel(id);
                      }
                    }}
                    className="group relative bg-white dark:bg-[#141414] rounded-xl border border-slate-200 dark:border-[#2A2A2A] hover:border-[#0B8FE3] dark:hover:border-[#0B8FE3] hover:shadow-xl transition-all cursor-pointer flex flex-col h-[340px] overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#0B8FE3]"
                    aria-label={`Add ${def.title} to dashboard`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#2A2A2A] bg-white dark:bg-[#141414] shrink-0">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-white tracking-tight">
                        {def.title}
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#0B8FE3] group-hover:bg-[#0B8FE3] group-hover:text-white transition">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </span>
                    </div>

                    {/* Card Live Preview Body */}
                    <div className="flex-1 p-4 pointer-events-none select-none relative overflow-hidden flex flex-col bg-white dark:bg-[#141414]">
                      {renderPreviewInner(id)}

                      {/* Hover / Focus Overlay with button */}
                      <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center p-4">
                        <div className="px-4 py-2.5 rounded-lg bg-[#0B8FE3] text-white text-xs font-bold shadow-lg flex items-center gap-2 transform translate-y-1 group-hover:translate-y-0 group-focus:translate-y-0 transition-transform">
                          <Plus className="w-4 h-4" />
                          <span>+ Add to dashboard</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white dark:bg-[#141414] border-t border-slate-100 dark:border-[#2A2A2A] flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-[#A3A3A3]">
            {availablePanels.length > 0
              ? `${availablePanels.length} ${availablePanels.length === 1 ? 'panel' : 'panels'} available to add`
              : 'All panels added'}
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(false)}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-[#1F1F1F] text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-[#2A2A2A] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

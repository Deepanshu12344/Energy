import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { ALL_PANELS, type PanelId } from '../registry/panelRegistry';

interface ExpandModalProps {
  renderPanelContent: (id: PanelId) => React.ReactNode;
}

export const ExpandModal: React.FC<ExpandModalProps> = ({ renderPanelContent }) => {
  const { expandedPanelId, setExpandedPanelId } = useDashboard();

  useEffect(() => {
    if (!expandedPanelId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedPanelId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedPanelId, setExpandedPanelId]);

  if (!expandedPanelId) return null;

  const title = ALL_PANELS[expandedPanelId]?.title || expandedPanelId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-5xl h-[85vh] bg-white dark:bg-[#1F1F1F] rounded-2xl border border-slate-200 dark:border-[#2A2A2A] shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expanded-panel-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2A2A2A]">
          <h2 id="expanded-panel-title" className="text-base font-semibold text-slate-900 dark:text-white">
            {title} (Expanded View)
          </h2>
          <button
            type="button"
            onClick={() => setExpandedPanelId(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-[#A3A3A3] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2A2A2A] transition"
            aria-label="Close expanded view"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 p-6 overflow-hidden flex flex-col">
          {renderPanelContent(expandedPanelId)}
        </div>
      </div>
    </div>
  );
};

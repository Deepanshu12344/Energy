import React from 'react';
import { X, Plus, BarChart2, TrendingUp, Layers, CheckCircle2, PieChart, Table, Clock, ShieldCheck } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { ALL_PANELS, type PanelId } from '../registry/panelRegistry';

const PANEL_ICONS: Record<PanelId, React.ComponentType<{ className?: string }>> = {
  forecast: TrendingUp,
  metrics: Layers,
  decision: ShieldCheck,
  distribution: BarChart2,
  pie: PieChart,
  table: Table,
  hourly: Clock,
  horizon: BarChart2,
};

export const AddPanelModal: React.FC = () => {
  const { isAddModalOpen, setIsAddModalOpen, visiblePanels, addPanel } = useDashboard();

  if (!isAddModalOpen) return null;

  const availablePanels = (Object.keys(ALL_PANELS) as PanelId[]).filter(
    (id) => !visiblePanels.includes(id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-panel-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 id="add-panel-title" className="text-base font-semibold text-slate-900 dark:text-white">
            Add Dashboard Panel
          </h2>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {availablePanels.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                All panels are already on the dashboard
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You can rearrange them by dragging the panel headers.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {availablePanels.map((id) => {
                const def = ALL_PANELS[id];
                const IconComponent = PANEL_ICONS[id] || Layers;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      addPanel(id);
                      setIsAddModalOpen(false);
                    }}
                    className="w-full text-left p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-[#0B8FE3] hover:bg-blue-50/50 dark:hover:bg-blue-950/20 flex items-start gap-3.5 transition group"
                  >
                    <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0B8FE3] group-hover:bg-[#0B8FE3] group-hover:text-white transition">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {def.title}
                        </span>
                        <Plus className="w-4 h-4 text-slate-400 group-hover:text-[#0B8FE3] transition" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {def.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

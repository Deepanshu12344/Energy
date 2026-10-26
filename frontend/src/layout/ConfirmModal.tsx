import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export const ConfirmModal: React.FC = () => {
  const { isResetConfirmOpen, setIsResetConfirmOpen, resetLayout } = useDashboard();

  if (!isResetConfirmOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-reset-title"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 id="confirm-reset-title" className="text-sm font-semibold text-slate-900 dark:text-white">
              Reset Dashboard?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              This will restore all panels and the default layout.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6">
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(false)}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              resetLayout();
              setIsResetConfirmOpen(false);
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Activity, Wind, Server } from 'lucide-react';
import type { HealthResponse } from '../api/types';

interface HeaderProps {
  health: HealthResponse | null;
  loadingHealth: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ health, loadingHealth, onRefresh }) => {
  const isHealthy = health?.status === 'ok' && health?.database_connected;

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 text-[#0B8FE3] rounded-lg border border-blue-500/20 shadow-inner">
            <Wind className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                GB Wind Power Forecast Monitor
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-800 rounded-full">
                Elexon BMRS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Day-ahead wind procurement decision support & forecast benchmark (January 2026)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Database:</span>
            {loadingHealth ? (
              <span className="text-slate-400 animate-pulse">Checking...</span>
            ) : isHealthy ? (
              <span className="flex items-center text-[#0B8FE3] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#0B8FE3] mr-1.5 animate-ping" />
                PostgreSQL Connected
              </span>
            ) : (
              <span className="flex items-center text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-400 mr-1.5" />
                Connection Degraded
              </span>
            )}
          </div>

          <button
            onClick={onRefresh}
            title="Refresh active view"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-lg transition-all"
          >
            <Activity className="w-3.5 h-3.5 text-[#0B8FE3]" />
            <span>Reload</span>
          </button>
        </div>
      </div>
    </header>
  );
};

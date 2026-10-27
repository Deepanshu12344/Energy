import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Database, FileText, CheckCircle, Shield, Globe } from 'lucide-react';
import type { MetaResponse } from '../api/types';

interface AssumptionsPanelProps {
  meta: MetaResponse | null;
  cutoffTime: string;
}

export const AssumptionsPanel: React.FC<AssumptionsPanelProps> = ({ meta, cutoffTime }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center space-x-2.5">
          <FileText className="w-4 h-4 text-[#0B8FE3]" />
          <span className="text-sm font-semibold text-slate-200">
            Methodology, System Assumptions & Data Provenance
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            (Elexon BMRS, Resolution Matching, MAPE Guard, UTC)
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span>{isOpen ? 'Hide details' : 'View assumptions'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 text-xs text-slate-300 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Decision Cutoff & Market Timing */}
            <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-2 text-blue-400 font-semibold mb-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Trading Cutoff Rule</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Evaluated against the latest forecast published at or before{' '}
                <strong className="text-slate-200">{cutoffTime} Europe/London</strong> on Day D-1. Any forecasts published after the cutoff are discarded to faithfully reflect data available to buyers before market clearing.
              </p>
            </div>

            {/* 2. Resolution Matching */}
            <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-2 text-sky-400 font-semibold mb-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Resolution Alignment</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Elexon <strong className="text-slate-200">WINDFOR</strong> publishes at hourly intervals (:00). Actual generation (<strong className="text-slate-200">FUELHH</strong>) is half-hourly (:00, :30). Comparison is strictly evaluated at exact :00 timestamps without interpolation or synthetic forward-filling. Half-hour slots are kept in the chart as not applicable.
              </p>
            </div>

            {/* 3. MAPE Near-Zero Guard */}
            <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-2 text-blue-400 font-semibold mb-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Zero-Division MAPE Guard</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Actual generation outturn below <strong className="text-slate-200">10 MW</strong> is excluded from MAPE calculation to prevent explosive division by near-zero during low-actual generation periods. All valid slots remain included in MAE, RMSE, and percentiles.
              </p>
            </div>

            {/* 4. Timezones & Database */}
            <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-2 text-purple-400 font-semibold mb-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Timezone & Coordinates</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                All records are ingested and stored with absolute <strong className="text-slate-200">UTC</strong> timestamps in Supabase PostgreSQL. Business day boundaries and cutoff inputs are translated to UTC from Europe/London.
              </p>
            </div>

            {/* 5. Percentile Interpolation */}
            <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-2 text-rose-400 font-semibold mb-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Linear Percentile Method</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                P50, P90, and P95 absolute errors are computed using linear interpolation on raw absolute errors |Forecast - Actual|, matching NumPy standard percentile formula.
              </p>
            </div>

            {/* 6. Database Metadata */}
            <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-2 text-teal-400 font-semibold mb-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>Pre-loaded Supabase Store</span>
              </div>
              {meta ? (
                <div className="text-slate-400 space-y-1">
                  <div>Actuals rows (FUELHH): <strong className="text-slate-200">{meta.actual_rows_count.toLocaleString()}</strong></div>
                  <div>Forecast rows (WINDFOR): <strong className="text-slate-200">{meta.forecast_rows_count.toLocaleString()}</strong></div>
                  <div>Available range: <strong className="text-slate-200">{meta.available_start_date} to {meta.available_end_date}</strong></div>
                </div>
              ) : (
                <p className="text-slate-400">Loading database metadata...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

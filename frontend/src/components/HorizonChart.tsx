import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { CalendarRange, AlertTriangle } from 'lucide-react';
import type { HorizonAnalysisResponse } from '../api/types';

interface HorizonChartDataPoint {
  bucket: string;
  mae: number;
  rmse: number;
  bias: number;
  count: number;
}

interface HorizonTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload: HorizonChartDataPoint;
  }>;
}

const HorizonTooltipContent: React.FC<HorizonTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-slate-950/95 border border-slate-700/80 p-2.5 rounded-lg text-xs shadow-xl backdrop-blur-md">
      <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 mb-1">
        Lead Time: {item.bucket}
      </div>
      <div className="text-purple-400">
        MAE: <strong>{item.mae.toLocaleString()} MW</strong>
      </div>
      <div className="text-slate-300">
        RMSE: <strong>{item.rmse.toLocaleString()} MW</strong>
      </div>
      <div className="text-amber-400">
        Bias: <strong>{item.bias > 0 ? `+${item.bias}` : item.bias} MW</strong>
      </div>
      <div className="text-[10px] text-slate-400 mt-1">
        Sample size: {item.count} forecasts
      </div>
    </div>
  );
};

interface HorizonChartProps {
  horizonData: HorizonAnalysisResponse | null;
  isLoading: boolean;
}

export const HorizonChart: React.FC<HorizonChartProps> = ({ horizonData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-80 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mb-2" />
        <span className="text-xs text-slate-400">Loading lead time horizon analysis...</span>
      </div>
    );
  }

  if (!horizonData || !horizonData.main_buckets || horizonData.main_buckets.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        No horizon analysis data available for selected range.
      </div>
    );
  }

  const chartData: HorizonChartDataPoint[] = horizonData.main_buckets.map((b) => ({
    bucket: b.horizon_bucket,
    mae: b.mae !== null ? Math.round(b.mae) : 0,
    rmse: b.rmse !== null ? Math.round(b.rmse) : 0,
    bias: b.bias !== null ? Math.round(b.bias) : 0,
    count: b.count,
  }));

  const afterTarget = horizonData.after_target_bucket;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
            <CalendarRange className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Accuracy by Forecast Lead Time (Horizon)
            </h3>
            <p className="text-[11px] text-slate-400">
              Evaluates all published WINDFOR forecasts by lead time (start_time - publish_time)
            </p>
          </div>
        </div>
      </div>

      <div className="h-60 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="bucket"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              unit=" MW"
              width={50}
            />
            <Tooltip content={<HorizonTooltipContent />} />
            <Bar dataKey="mae" name="MAE (MW)" fill="#a855f7" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill="#a855f7" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Segregated After-Target Bucket Callout */}
      {afterTarget && afterTarget.count > 0 && (
        <div className="mt-4 bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-start sm:items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-semibold text-slate-200">
                Segregated: Forecasts published after delivery time (negative lead time)
              </span>
              <p className="text-[11px] text-slate-400">
                Excluded from forward horizons to prevent look-ahead contamination.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-slate-300 font-mono text-[11px] self-end sm:self-auto">
            <span>Count: <strong className="text-white">{afterTarget.count}</strong></span>
            <span>MAE: <strong className="text-white">{Math.round(afterTarget.mae ?? 0)} MW</strong></span>
            <span>Bias: <strong className="text-amber-400">{Math.round(afterTarget.bias ?? 0)} MW</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};

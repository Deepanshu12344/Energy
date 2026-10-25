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
import { BarChart2 } from 'lucide-react';
import type { ErrorDistributionResponse } from '../api/types';

interface HistogramDataPoint {
  label: string;
  count: number;
  isOverForecast: boolean;
  binMin: number;
  binMax: number;
}

interface HistogramTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload: HistogramDataPoint;
  }>;
  totalSamples: number;
}

const HistogramTooltipContent: React.FC<HistogramTooltipProps> = ({
  active,
  payload,
  totalSamples,
}) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  const pct = totalSamples > 0 ? ((item.count / totalSamples) * 100).toFixed(1) : '0';

  return (
    <div className="bg-slate-950/95 border border-slate-700/80 p-2.5 rounded-lg text-xs shadow-xl backdrop-blur-md">
      <div className="font-semibold text-slate-200">{item.label}</div>
      <div className="text-emerald-400 mt-1">
        Frequency: <strong>{item.count} hours</strong> ({pct}%)
      </div>
      <div className="text-[11px] text-slate-400 mt-0.5">
        {item.isOverForecast ? 'Over-forecasting (F > A)' : 'Under-forecasting (F < A)'}
      </div>
    </div>
  );
};

interface ErrorHistogramChartProps {
  distribution: ErrorDistributionResponse | null;
  isLoading: boolean;
}

export const ErrorHistogramChart: React.FC<ErrorHistogramChartProps> = ({
  distribution,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-80 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mb-2" />
        <span className="text-xs text-slate-400">Loading error distribution...</span>
      </div>
    );
  }

  if (!distribution || !distribution.bins || distribution.bins.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        No error distribution data available for selected range.
      </div>
    );
  }

  const chartData: HistogramDataPoint[] = distribution.bins.map((bin) => ({
    label: bin.bin_label,
    count: bin.count,
    isOverForecast: (bin.bin_min + bin.bin_max) / 2 >= 0,
    binMin: bin.bin_min,
    binMax: bin.bin_max,
  }));

  const overForecastSharePct =
    distribution.over_forecast_share !== null
      ? (distribution.over_forecast_share * 100).toFixed(1)
      : '0.0';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Forecast Error Distribution (MW)
            </h3>
            <p className="text-[11px] text-slate-400">
              Error = Forecast - Actual | Min: {Math.round(distribution.min_error_mw ?? 0)} MW, Max: {Math.round(distribution.max_error_mw ?? 0)} MW
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
          <span className="text-slate-400">Over-forecast share:</span>
          <span className="font-bold text-amber-400">
            {overForecastSharePct}% of hours
          </span>
        </div>
      </div>

      <div className="h-64 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={40}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              unit=" hrs"
              width={45}
            />
            <Tooltip content={<HistogramTooltipContent totalSamples={distribution.total_samples} />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isOverForecast ? '#f59e0b' : '#38bdf8'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 bg-sky-400 rounded-sm" />
            <span>Under-forecast (F &lt; A)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 bg-amber-400 rounded-sm" />
            <span>Over-forecast (F &gt; A)</span>
          </span>
        </div>
        <span className="text-slate-400">
          Total samples: <strong>{distribution.total_samples}</strong> hours
        </span>
      </div>
    </div>
  );
};

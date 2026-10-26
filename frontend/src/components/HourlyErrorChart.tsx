import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Clock } from 'lucide-react';
import type { ErrorByHourResponse } from '../api/types';

interface HourlyChartDataPoint {
  hour: string;
  mae: number | null;
  bias: number | null;
  count: number;
}

interface HourlyTooltipPayloadItem {
  color: string;
  name: string;
  value: number | null;
  payload: HourlyChartDataPoint;
}

interface HourlyTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<HourlyTooltipPayloadItem>;
  label?: string;
}

const HourlyTooltipContent: React.FC<HourlyTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-950/95 border border-slate-700/80 p-2.5 rounded-lg text-xs shadow-xl backdrop-blur-md">
      <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 mb-1">
        Delivery Hour {label}
      </div>
      {payload.map((entry, index) => (
        <div
          key={index}
          className="flex justify-between items-center gap-3 py-0.5"
          style={{ color: entry.color }}
        >
          <span>{entry.name}:</span>
          <span className="font-mono font-bold">
            {entry.value !== null && entry.value !== undefined
              ? `${entry.value.toLocaleString()} MW`
              : 'N/A'}
          </span>
        </div>
      ))}
    </div>
  );
};

interface HourlyErrorChartProps {
  hourlyData: ErrorByHourResponse | null;
  isLoading: boolean;
}

export const HourlyErrorChart: React.FC<HourlyErrorChartProps> = ({
  hourlyData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-80 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B8FE3] mb-2" />
        <span className="text-xs text-slate-400">Loading hourly error breakdown...</span>
      </div>
    );
  }

  if (!hourlyData || !hourlyData.hourly_errors || hourlyData.hourly_errors.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        No diurnal error data available.
      </div>
    );
  }

  const chartData: HourlyChartDataPoint[] = hourlyData.hourly_errors.map((item) => ({
    hour: `${item.hour.toString().padStart(2, '0')}:00`,
    mae: item.mae !== null ? Math.round(item.mae) : null,
    bias: item.bias !== null ? Math.round(item.bias) : null,
    count: item.count,
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Error by Delivery Hour of Day
            </h3>
            <p className="text-[11px] text-slate-400">
              Mean absolute error (bar) and mean bias (line) across 00:00 to 23:00 UTC
            </p>
          </div>
        </div>
      </div>

      <div className="h-64 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="hour"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              interval={2}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              unit=" MW"
              width={50}
            />
            <Tooltip content={<HourlyTooltipContent />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              formatter={(value) => <span className="text-slate-300">{value}</span>}
            />
            <Bar
              dataKey="mae"
              name="MAE (Mean Absolute Error)"
              fill="#38bdf8"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Line
              type="monotone"
              dataKey="bias"
              name="Mean Bias (Forecast - Actual)"
              stroke="#0B8FE3"
              strokeWidth={2}
              dot={{ r: 3, fill: '#0B8FE3' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

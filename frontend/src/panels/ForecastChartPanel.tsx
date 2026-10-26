import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { useTheme } from '../context/ThemeContext';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string | null;
    color: string;
    payload: {
      time: string;
      actual: number | null;
      forecast: number | null;
      error: number | null;
      leadTime: number | null;
      published: string | null;
      status: string;
    };
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 text-xs z-50">
      <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between gap-4">
        <span>{data.time} UTC</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
            data.status === 'forecast_selected'
              ? 'bg-blue-50 text-[#0B8FE3] dark:bg-blue-950/60 dark:text-blue-300'
              : data.status === 'missing'
              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {data.status === 'forecast_selected'
            ? 'Selected'
            : data.status === 'missing'
            ? 'Missing'
            : 'Half-hour slot'}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0B8FE3]" />
            Actual:
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {data.actual !== null ? `${data.actual.toLocaleString()} MW` : 'N/A'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-[#86C5EE]" />
            Forecast:
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {data.forecast !== null ? `${data.forecast.toLocaleString()} MW` : 'N/A (:30 slot)'}
          </span>
        </div>

        {data.error !== null && (
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Error (F - A):</span>
            <span
              className={`font-semibold ${
                data.error > 0
                  ? 'text-amber-500'
                  : data.error < 0
                  ? 'text-[#0B8FE3]'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {data.error > 0 ? `+${data.error.toLocaleString()}` : data.error.toLocaleString()} MW
            </span>
          </div>
        )}

        {data.leadTime !== null && (
          <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400">
            <span>Lead Time:</span>
            <span>{data.leadTime} hrs</span>
          </div>
        )}

        {data.published && (
          <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400">
            <span>Published:</span>
            <span>{data.published.slice(11, 16)} UTC</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const ForecastChartPanel: React.FC = () => {
  const { forecast, singleDate } = useDashboard();
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#1E293B' : '#F1F5F9';
  const axisColor = isDark ? '#64748B' : '#94A3B8';

  // Format data: actuals at 30-min resolution; forecast as separate hourly points (do not interpolate)
  const chartData = React.useMemo(() => {
    if (!forecast?.data) return [];
    return forecast.data.map((item) => {
      const timeStr = item.start_time.slice(11, 16);
      return {
        time: timeStr,
        actual: item.actual_mw,
        forecast: item.status === 'forecast_selected' ? item.forecast_mw : null,
        error: item.error_mw,
        leadTime: item.lead_time_hours,
        published: item.publish_time,
        status: item.status,
      };
    });
  }, [forecast]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Subtitle explicitly declaring delivery date and UTC */}
      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-3">
        <span>Delivery: <strong className="text-slate-700 dark:text-slate-300">{singleDate}</strong></span>
        <span>Axis: <strong className="text-slate-700 dark:text-slate-300">UTC</strong></span>
      </div>

      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="time"
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              interval={3}
            />
            <YAxis
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* 30-min actuals: Solid line with markers */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Generation"
              stroke="#0B8FE3"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#0B8FE3' }}
              activeDot={{ r: 5, fill: '#0B8FE3' }}
              connectNulls={false}
            />
            {/* Hourly forecasts: Dashed line with markers, hourly-only points without interpolation */}
            <Line
              type="monotone"
              dataKey="forecast"
              name="D-1 Selected Forecast"
              stroke="#86C5EE"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3.5, fill: '#86C5EE', stroke: '#0B8FE3', strokeWidth: 1 }}
              activeDot={{ r: 6, fill: '#86C5EE' }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Screenshot-style Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#0B8FE3]" />
          <span>Actual (30-min)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 border-t-2 border-dashed border-[#86C5EE]" />
          <span>Forecast (Hourly)</span>
        </div>
      </div>
    </div>
  );
};

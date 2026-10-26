import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { useTheme } from '../context/ThemeContext';
import { downloadCsv } from '../utils/csvExport';

interface HourlyErrorPanelProps {
  onRegisterExport?: (fn: () => void) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      hourLabel: string;
      mae: number;
      bias: number;
      rmse: number;
      count: number;
    };
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 text-xs z-50">
      <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between gap-4">
        <span>{d.hourLabel} UTC</span>
        <span className="text-[11px] text-slate-400 font-normal">{d.count} days</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#86C5EE]" />
            MAE:
          </span>
          <strong className="text-slate-800 dark:text-slate-200">{d.mae.toLocaleString()} MW</strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0B8FE3]" />
            Mean Bias:
          </span>
          <strong className={d.bias > 0 ? 'text-amber-500' : 'text-[#0B8FE3]'}>
            {d.bias > 0 ? `+${d.bias.toLocaleString()}` : d.bias.toLocaleString()} MW
          </strong>
        </div>
        <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 pt-0.5">
          <span>RMSE:</span>
          <span>{d.rmse.toLocaleString()} MW</span>
        </div>
      </div>
    </div>
  );
};

export const HourlyErrorPanel: React.FC<HourlyErrorPanelProps> = ({ onRegisterExport }) => {
  const { hourly, effectiveRange } = useDashboard();
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#1E293B' : '#F1F5F9';
  const axisColor = isDark ? '#64748B' : '#94A3B8';

  const chartData = React.useMemo(() => {
    if (!hourly?.hourly_errors) return [];
    return hourly.hourly_errors.map((h) => {
      const hourStr = String(h.hour).padStart(2, '0');
      return {
        hourLabel: `${hourStr}:00`,
        hour: h.hour,
        mae: h.mae,
        bias: h.bias,
        rmse: h.rmse,
        count: h.count,
      };
    });
  }, [hourly]);

  // Register CSV Export
  React.useEffect(() => {
    if (onRegisterExport && hourly?.hourly_errors) {
      onRegisterExport(() => {
        const headers = ['Hour (UTC)', 'MAE (MW)', 'Mean Bias (MW)', 'RMSE (MW)', 'Day Count'];
        const rows = hourly.hourly_errors.map((h) => [
          `${String(h.hour).padStart(2, '0')}:00`,
          h.mae,
          h.bias,
          h.rmse,
          h.count,
        ]);
        downloadCsv(`hourly_error_${effectiveRange.start}_${effectiveRange.end}`, headers, rows);
      });
    }
  }, [onRegisterExport, hourly, effectiveRange]);

  if (!hourly?.hourly_errors || hourly.hourly_errors.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
        No hourly error profile data available
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="hourLabel"
              stroke={axisColor}
              fontSize={10}
              tickLine={false}
              interval={2}
            />
            <YAxis stroke={axisColor} fontSize={10} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {/* MAE Bars */}
            <Bar
              dataKey="mae"
              name="MAE (MW)"
              fill="#86C5EE"
              radius={[3, 3, 0, 0]}
            />
            {/* Bias Line */}
            <Line
              type="monotone"
              dataKey="bias"
              name="Mean Bias (MW)"
              stroke="#0B8FE3"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#0B8FE3' }}
              activeDot={{ r: 5, fill: '#0B8FE3' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#86C5EE]" />
          <span>MAE (Magnitude)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 rounded bg-[#0B8FE3]" />
          <span>Mean Bias (Direction)</span>
        </div>
      </div>
    </div>
  );
};

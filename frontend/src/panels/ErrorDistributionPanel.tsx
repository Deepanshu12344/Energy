import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { useTheme } from '../context/ThemeContext';
import { downloadCsv } from '../utils/csvExport';

interface ErrorDistributionPanelProps {
  onRegisterExport?: (fn: () => void) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      label: string;
      count: number;
      min: number;
      max: number;
      isOver: boolean;
    };
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 text-xs z-50">
      <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: d.isOver ? '#0B8FE3' : '#86C5EE' }}
        />
        <span>{d.label}</span>
      </div>
      <div className="text-slate-600 dark:text-slate-300">
        Count: <strong className="text-slate-900 dark:text-white">{d.count} hours</strong>
      </div>
      <div className="text-[11px] text-slate-400 mt-1">
        {d.isOver ? 'Over-forecast (F > A)' : 'Under-forecast (F < A)'}
      </div>
    </div>
  );
};

export const ErrorDistributionPanel: React.FC<ErrorDistributionPanelProps> = ({ onRegisterExport }) => {
  const { distribution, effectiveRange } = useDashboard();
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#1E293B' : '#F1F5F9';
  const axisColor = isDark ? '#64748B' : '#94A3B8';

  const chartData = React.useMemo(() => {
    if (!distribution?.bins) return [];
    return distribution.bins.map((b) => ({
      label: b.bin_label,
      count: b.count,
      min: b.bin_min,
      max: b.bin_max,
      isOver: b.bin_min >= 0 || b.bin_max > 0,
    }));
  }, [distribution]);

  // Register CSV export
  React.useEffect(() => {
    if (onRegisterExport && distribution?.bins) {
      onRegisterExport(() => {
        const headers = ['Bin Label', 'Min Error (MW)', 'Max Error (MW)', 'Hourly Count'];
        const rows = distribution.bins.map((b) => [b.bin_label, b.bin_min, b.bin_max, b.count]);
        downloadCsv(`error_distribution_${effectiveRange.start}_${effectiveRange.end}`, headers, rows);
      });
    }
  }, [onRegisterExport, distribution, effectiveRange]);

  if (!distribution?.bins || distribution.bins.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
        No distribution data available
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={axisColor}
              fontSize={10}
              angle={-25}
              textAnchor="end"
              tickLine={false}
              interval={0}
            />
            <YAxis stroke={axisColor} fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isOver ? '#0B8FE3' : '#86C5EE'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Screenshot-Style Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#0B8FE3]" />
          <span>Over-forecast (F &gt; A)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#86C5EE]" />
          <span>Under-forecast (F &lt; A)</span>
        </div>
      </div>
    </div>
  );
};

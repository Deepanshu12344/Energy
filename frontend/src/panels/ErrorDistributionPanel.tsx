import React, { memo } from 'react';
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
  isPreview?: boolean;
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
    <div className="bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#2A2A2A] rounded-xl shadow-lg p-3 text-xs z-50">
      <div className="font-semibold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: d.isOver ? '#0B8FE3' : '#86C5EE' }}
        />
        <span>{d.label}</span>
      </div>
      <div className="text-slate-600 dark:text-[#A3A3A3]">
        Count: <strong className="text-slate-900 dark:text-white">{d.count} hours</strong>
      </div>
      <div className="text-[11px] text-slate-400 dark:text-[#737373] mt-1">
        {d.isOver ? 'Over-forecast (F > A)' : 'Under-forecast (F < A)'}
      </div>
    </div>
  );
};

const ErrorDistributionPanelComponent: React.FC<ErrorDistributionPanelProps> = ({
  onRegisterExport,
  isPreview = false,
}) => {
  const { distribution, effectiveRange } = useDashboard();
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#262626' : '#F1F5F9';
  const axisColor = isDark ? '#808080' : '#94A3B8';

  const chartData = React.useMemo(() => {
    if (!distribution?.bins) return [];
    return distribution.bins.map((b) => {
      const minRounded = Math.round(b.bin_min);
      const maxRounded = Math.round(b.bin_max);
      return {
        label: `${minRounded.toLocaleString()} to ${maxRounded.toLocaleString()}`,
        count: b.count,
        min: b.bin_min,
        max: b.bin_max,
        isOver: b.bin_min >= 0 || b.bin_max > 0,
      };
    });
  }, [distribution]);

  // Register CSV export
  React.useEffect(() => {
    if (onRegisterExport && distribution?.bins) {
      onRegisterExport(() => {
        const headers = ['Bin Range (MW)', 'Min Error (MW)', 'Max Error (MW)', 'Hourly Count'];
        const rows = distribution.bins.map((b) => [
          `${Math.round(b.bin_min)} to ${Math.round(b.bin_max)} MW`,
          b.bin_min,
          b.bin_max,
          b.count,
        ]);
        downloadCsv(`error_distribution_${effectiveRange.start}_${effectiveRange.end}`, headers, rows);
      });
    }
  }, [onRegisterExport, distribution, effectiveRange]);

  if (!distribution?.bins || distribution.bins.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-[#737373]">
        No distribution data available
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="flex-1 w-full min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: isPreview ? 5 : 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={axisColor}
              fontSize={10}
              tickLine={false}
              interval={1}
              label={
                !isPreview
                  ? {
                      value: 'Forecast error (MW)',
                      position: 'insideBottom',
                      offset: -5,
                      style: { textAnchor: 'middle', fill: axisColor, fontSize: 10, fontWeight: 500 },
                    }
                  : undefined
              }
              height={isPreview ? 25 : 30}
            />
            <YAxis
              stroke={axisColor}
              fontSize={10}
              tickLine={false}
              tickFormatter={(val) => Number(val).toLocaleString()}
              label={{
                value: 'Hours',
                angle: -90,
                position: 'insideLeft',
                offset: -2,
                style: { textAnchor: 'middle', fill: axisColor, fontSize: 10, fontWeight: 600 },
              }}
              width={50}
            />
            {!isPreview && <Tooltip content={<CustomTooltip />} />}
            <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isOver ? '#F59E0B' : '#0B8FE3'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Screenshot-Style Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-slate-100 dark:border-[#2A2A2A] text-xs font-medium text-slate-600 dark:text-[#A3A3A3]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#F59E0B]" />
          <span>Over-forecast (F &gt; A)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#0B8FE3]" />
          <span>Under-forecast (F &lt; A)</span>
        </div>
      </div>
    </div>
  );
};

export const ErrorDistributionPanel = memo(ErrorDistributionPanelComponent);

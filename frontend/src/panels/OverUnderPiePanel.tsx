import React, { memo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { useTheme } from '../context/ThemeContext';

interface CustomPieTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      value: number;
      count: number;
      color: string;
    };
  }>;
}

const CustomPieTooltip: React.FC<CustomPieTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#2A2A2A] rounded-xl shadow-lg p-3 text-xs z-50">
      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
        <span>{d.name}</span>
      </div>
      <div className="text-slate-600 dark:text-[#A3A3A3]">
        Share: <strong className="text-slate-900 dark:text-white">{d.value.toFixed(1)}%</strong>
      </div>
      <div className="text-[11px] text-slate-400 dark:text-[#737373] mt-0.5">
        Count: {d.count.toLocaleString()} hours
      </div>
    </div>
  );
};

interface OverUnderPiePanelProps {
  isPreview?: boolean;
}

const OverUnderPiePanelComponent: React.FC<OverUnderPiePanelProps> = ({ isPreview = false }) => {
  const { distribution } = useDashboard();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const data = React.useMemo(() => {
    if (!distribution) return [];
    const overShare = distribution.over_forecast_share ?? 0.8522;
    const total = distribution.total_samples ?? 744;
    const overCount = distribution.over_forecast_count ?? Math.round(total * overShare);
    const underCount = total - overCount;
    const underShare = 1 - overShare;

    return [
      {
        name: 'Over-forecast (F > A)',
        value: Number((overShare * 100).toFixed(1)),
        count: overCount,
        color: '#0B8FE3',
      },
      {
        name: 'Under-forecast (F ≤ A)',
        value: Number((underShare * 100).toFixed(1)),
        count: underCount,
        color: '#86C5EE',
      },
    ];
  }, [distribution]);

  if (!distribution) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-[#737373]">
        No pie chart data available
      </div>
    );
  }

  // Custom label inside the slice matching screenshot style
  const renderInsideLabel = (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
    value?: number;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, value = 0 } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#FFFFFF"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-bold text-xs select-none pointer-events-none drop-shadow-sm"
      >
        {`${value}%`}
      </text>
    );
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="flex-1 w-full min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderInsideLabel}
              outerRadius={isPreview ? 60 : 78}
              dataKey="value"
              stroke={isDark ? '#141414' : '#FFFFFF'}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            {!isPreview && <Tooltip content={<CustomPieTooltip />} />}
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Screenshot-Style Legend underneath */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-[#2A2A2A] text-xs font-medium text-slate-600 dark:text-[#A3A3A3]">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const OverUnderPiePanel = memo(OverUnderPiePanelComponent);

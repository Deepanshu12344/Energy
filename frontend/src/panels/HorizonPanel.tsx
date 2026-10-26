import React, { memo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Info } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { useTheme } from '../context/ThemeContext';
import { downloadCsv } from '../utils/csvExport';

interface HorizonPanelProps {
  onRegisterExport?: (fn: () => void) => void;
  isPreview?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      bucket: string;
      mae: number;
      rmse: number;
      bias: number;
      count: number;
    };
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#2A2A2A] rounded-xl shadow-lg p-3 text-xs z-50">
      <div className="font-semibold text-slate-900 dark:text-white mb-1.5 border-b border-slate-100 dark:border-[#2A2A2A] pb-1 flex items-center justify-between gap-4">
        <span>Lead Time: {d.bucket}</span>
        <span className="text-[11px] text-slate-400 dark:text-[#737373] font-normal">{d.count} samples</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-[#A3A3A3]">MAE:</span>
          <strong className="text-slate-800 dark:text-white">{d.mae.toLocaleString()} MW</strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-[#A3A3A3]">RMSE:</span>
          <strong className="text-slate-800 dark:text-white">{d.rmse.toLocaleString()} MW</strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-[#A3A3A3]">Mean Bias:</span>
          <strong className={d.bias > 0 ? 'text-amber-500' : 'text-[#0B8FE3]'}>
            {d.bias > 0 ? `+${d.bias.toLocaleString()}` : d.bias.toLocaleString()} MW
          </strong>
        </div>
      </div>
    </div>
  );
};

const HorizonPanelComponent: React.FC<HorizonPanelProps> = ({ onRegisterExport, isPreview = false }) => {
  const { horizon, effectiveRange } = useDashboard();
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#262626' : '#F1F5F9';
  const axisColor = isDark ? '#808080' : '#94A3B8';

  const chartData = React.useMemo(() => {
    if (!horizon?.main_buckets) return [];
    return horizon.main_buckets.map((b) => ({
      bucket: b.horizon_bucket,
      mae: b.mae,
      rmse: b.rmse,
      bias: b.bias,
      count: b.count,
    }));
  }, [horizon]);

  // Register CSV Export
  React.useEffect(() => {
    if (onRegisterExport && horizon?.main_buckets) {
      onRegisterExport(() => {
        const headers = ['Lead Time Horizon', 'MAE (MW)', 'RMSE (MW)', 'Mean Bias (MW)', 'Count'];
        const rows = horizon.main_buckets.map((b) => [b.horizon_bucket, b.mae, b.rmse, b.bias, b.count]);
        if (horizon.after_target_bucket) {
          const pat = horizon.after_target_bucket;
          rows.push(['Published After Target (Segregated)', pat.mae, pat.rmse, pat.bias, pat.count]);
        }
        downloadCsv(`horizon_analysis_${effectiveRange.start}_${effectiveRange.end}`, headers, rows);
      });
    }
  }, [onRegisterExport, horizon, effectiveRange]);

  if (!horizon?.main_buckets || horizon.main_buckets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-[#737373]">
        No lead-time horizon data available
      </div>
    );
  }

  const pat = horizon.after_target_bucket;

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="flex-1 w-full min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="bucket" stroke={axisColor} fontSize={11} tickLine={false} />
            <YAxis stroke={axisColor} fontSize={10} tickLine={false} />
            {!isPreview && <Tooltip content={<CustomTooltip />} />}
            <Bar dataKey="mae" name="MAE (MW)" fill="#0B8FE3" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Note for 'Published After Target' Bucket */}
      {!isPreview && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#2A2A2A] text-[11px] text-slate-500 dark:text-[#A3A3A3] flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 dark:text-[#737373] shrink-0 mt-0.5" />
          {pat && pat.count > 0 ? (
            <span>
              <strong>Published After Target Bucket:</strong> {pat.count} forecasts published post-target (negative lead time) are segregated (MAE: {pat.mae !== null ? `${pat.mae.toLocaleString()} MW` : 'N/A'}, Bias: {pat.bias !== null ? (pat.bias > 0 ? `+${pat.bias.toLocaleString()} MW` : `${pat.bias.toLocaleString()} MW`) : 'N/A'}).
            </span>
          ) : (
            <span>
              Negative lead time segregation: All selected forecasts published before target settlement slot.
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const HorizonPanel = memo(HorizonPanelComponent);

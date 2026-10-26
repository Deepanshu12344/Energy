import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Clock, Eye, AlertCircle } from 'lucide-react';
import type { ComparisonItem, ForecastComparisonResponse } from '../api/types';

interface ForecastTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload: {
      time: number;
      actual_mw?: number | null;
      forecast_mw?: number | null;
      lead_time_hours?: number | null;
      error_mw?: number | null;
    };
  }>;
  dataByTime: Map<number, ComparisonItem>;
}

const ForecastTooltipContent: React.FC<ForecastTooltipProps> = ({
  active,
  payload,
  dataByTime,
}) => {
  if (!active || !payload || !payload.length) return null;

  const activeTime = payload[0]?.payload?.time;
  if (!activeTime) return null;

  const item = dataByTime.get(activeTime);
  const dateStr = new Date(activeTime).toLocaleTimeString('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded-lg shadow-2xl text-xs space-y-1.5 backdrop-blur-md min-w-[200px]">
      <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 flex justify-between">
        <span>{dateStr} UTC</span>
        <span className="text-[10px] text-slate-400">
          {item?.status === 'not_applicable' ? 'Half-hour (:30)' : 'Hourly (:00)'}
        </span>
      </div>

      <div className="flex justify-between items-center text-[#0B8FE3]">
        <span>Actual Generation:</span>
        <span className="font-bold">
          {item?.actual_mw !== null && item?.actual_mw !== undefined
            ? `${Math.round(item.actual_mw).toLocaleString()} MW`
            : 'Missing'}
        </span>
      </div>

      <div className="flex justify-between items-center text-[#86C5EE]">
        <span>Day-Ahead Forecast:</span>
        <span className="font-bold">
          {item?.forecast_mw !== null && item?.forecast_mw !== undefined
            ? `${Math.round(item.forecast_mw).toLocaleString()} MW`
            : item?.status === 'not_applicable'
            ? 'None (WINDFOR hourly)'
            : 'Missing'}
        </span>
      </div>

      {item?.error_mw !== null && item?.error_mw !== undefined && (
        <div className="border-t border-slate-800/80 pt-1 flex justify-between items-center">
          <span className="text-slate-400">Error (F - A):</span>
          <span
            className="font-mono font-semibold text-[#0B8FE3]"
          >
            {item.error_mw > 0 ? `+${Math.round(item.error_mw)}` : Math.round(item.error_mw)} MW
          </span>
        </div>
      )}

      {item?.lead_time_hours !== null && item?.lead_time_hours !== undefined && (
        <div className="text-[10px] text-slate-400 pt-0.5 flex justify-between">
          <span>Lead time:</span>
          <span>{item.lead_time_hours.toFixed(1)} hrs</span>
        </div>
      )}
    </div>
  );
};

interface MainForecastChartProps {
  comparisonData: ForecastComparisonResponse | null;
  cutoffTime: string;
  deliveryDate: string;
  isLoading: boolean;
}

export const MainForecastChart: React.FC<MainForecastChartProps> = ({
  comparisonData,
  cutoffTime,
  deliveryDate,
  isLoading,
}) => {
  // Memoize lookup map
  const dataByTime = useMemo(() => {
    const map = new Map<number, ComparisonItem>();
    if (comparisonData?.data) {
      comparisonData.data.forEach((d) => {
        map.set(new Date(d.start_time).getTime(), d);
      });
    }
    return map;
  }, [comparisonData]);

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg h-96 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B8FE3] mb-3" />
        <span className="text-sm text-slate-400">Loading forecast & actual generation series...</span>
      </div>
    );
  }

  if (!comparisonData || !comparisonData.data || comparisonData.data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        No generation data available for {deliveryDate}.
      </div>
    );
  }

  // Format D-1 cutoff timestamp dynamically from cutoffTime and API cutoff_timestamp_utc
  const cutoffUtc = comparisonData.cutoff_timestamp_utc
    ? new Date(comparisonData.cutoff_timestamp_utc)
    : null;
  const cutoffUtcFormatted = cutoffUtc
    ? cutoffUtc.toLocaleDateString('en-GB', {
        timeZone: 'UTC',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + ' ' + cutoffUtc.toLocaleTimeString('en-GB', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' UTC'
    : 'UTC';
  const cutoffFormatted = `${cutoffTime} Europe/London (${cutoffUtcFormatted})`;

  // Filter actuals: all valid half-hourly outturn points (48 slots)
  const actualsSeries = comparisonData.data
    .filter((d) => d.actual_mw !== null && !d.is_actual_missing)
    .map((d) => ({
      time: new Date(d.start_time).getTime(),
      actual_mw: d.actual_mw,
    }));

  // Filter forecasts: ONLY hourly points with a selected forecast (no nulls inserted, 24 slots)
  const forecastsSeries = comparisonData.data
    .filter((d) => d.status === 'forecast_selected' && d.forecast_mw !== null)
    .map((d) => ({
      time: new Date(d.start_time).getTime(),
      forecast_mw: d.forecast_mw,
      publish_time: d.publish_time,
      lead_time_hours: d.lead_time_hours,
      error_mw: d.error_mw,
    }));

  const formatXAxisTick = (unixTime: number): string => {
    const d = new Date(unixTime);
    return d.toLocaleTimeString('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      {/* Cutoff Banner above the chart */}
      <div className="mb-4 bg-slate-950/80 border border-blue-500/30 rounded-lg px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-inner">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-blue-500/10 text-[#0B8FE3] rounded-md">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="text-slate-400">D-1 Decision Cutoff: </span>
            <span className="font-semibold text-blue-300 font-mono">{cutoffFormatted}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <Eye className="w-3.5 h-3.5 text-[#0B8FE3]" />
          <span>Latest WINDFOR revisions published at or before cutoff</span>
        </div>
      </div>

      {/* Chart Title & Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
        <div>
          <h2 className="text-base font-semibold text-white">
            Wind Generation: Actual Outturn vs Day-Ahead Forecast
          </h2>
          <p className="text-xs text-slate-400">
            Target Delivery Date: <span className="text-slate-200 font-medium">{deliveryDate}</span> | Chart Axis: <span className="text-slate-200 font-medium">UTC</span> (GB Winter Time)
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-[#0B8FE3] rounded" />
            <span className="text-slate-300">Actual Outturn (30-min)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 border-b-2 border-dashed border-[#86C5EE]" />
            <span className="text-slate-300">Day-Ahead Forecast (Hourly)</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[360px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatXAxisTick}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              dy={10}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(val) => `${Math.round(val / 1000)}k`}
              unit=" MW"
              width={55}
            />
            <Tooltip content={<ForecastTooltipContent dataByTime={dataByTime} />} />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: '15px' }}
              formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
            />

            {/* Actuals Series: Solid line connecting all 48 half-hourly points */}
            <Line
              data={actualsSeries}
              dataKey="actual_mw"
              name="Actual Generation (FUELHH, 30m)"
              stroke="#0B8FE3"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#0B8FE3', stroke: '#086cb0', strokeWidth: 2 }}
              isAnimationActive={false}
            />

            {/* Forecasts Series: Dashed line with markers connecting ONLY the 24 hourly points (no :30 nulls) */}
            <Line
              data={forecastsSeries}
              dataKey="forecast_mw"
              name="Day-Ahead Forecast (WINDFOR, 1h)"
              stroke="#86C5EE"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3.5, fill: '#86C5EE', stroke: '#5faedb', strokeWidth: 1 }}
              activeDot={{ r: 6, fill: '#86C5EE', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Resolution Note footer */}
      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Resolution matching: WINDFOR publishes hourly; actuals are 30-min. Forecast markers show evaluated hourly matches.</span>
        </span>
        <span>
          Matched: <strong className="text-slate-200">{comparisonData.matched_slots}</strong> / {comparisonData.hourly_slots} hours
        </span>
      </div>
    </div>
  );
};

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export type PanelId =
  | 'forecast'
  | 'metrics'
  | 'decision'
  | 'distribution'
  | 'pie'
  | 'hourly'
  | 'horizon'
  | 'table';

export interface PanelDefinition {
  id: PanelId;
  title: string;
  description: string;
  defaultLayout: LayoutItem;
  hasCsvExport: boolean;
  hasSearch?: boolean;
}

export const ALL_PANELS: Record<PanelId, PanelDefinition> = {
  forecast: {
    id: 'forecast',
    title: 'Forecast vs Actual',
    description: '30-minute actual wind generation vs hourly selected forecast at D-1 gate closure.',
    defaultLayout: { i: 'forecast', x: 0, y: 0, w: 6, h: 5, minW: 4, minH: 4 },
    hasCsvExport: false,
  },
  metrics: {
    id: 'metrics',
    title: 'Accuracy Metrics',
    description: 'Summary KPIs including MAE, RMSE, Bias, MAPE, P95 error, and slot coverage.',
    defaultLayout: { i: 'metrics', x: 6, y: 0, w: 3, h: 5, minW: 3, minH: 4 },
    hasCsvExport: false,
  },
  decision: {
    id: 'decision',
    title: 'Decision Support',
    description: 'Buyer-centric buffer recommendations and systematic bias observation.',
    defaultLayout: { i: 'decision', x: 9, y: 0, w: 3, h: 5, minW: 3, minH: 4 },
    hasCsvExport: false,
  },
  distribution: {
    id: 'distribution',
    title: 'Error Distribution',
    description: 'Histogram of forecast errors showing over-forecast vs under-forecast spread.',
    defaultLayout: { i: 'distribution', x: 0, y: 5, w: 4, h: 5, minW: 3, minH: 4 },
    hasCsvExport: true,
  },
  table: {
    id: 'table',
    title: 'Data Table',
    description: 'Granular hourly settlement slots with actuals, forecast, error, and status.',
    defaultLayout: { i: 'table', x: 4, y: 5, w: 4, h: 5, minW: 4, minH: 4 },
    hasCsvExport: true,
    hasSearch: true,
  },
  pie: {
    id: 'pie',
    title: 'Over vs Under Forecast',
    description: 'Proportion of evaluated hours where forecast exceeded actual generation.',
    defaultLayout: { i: 'pie', x: 8, y: 5, w: 4, h: 5, minW: 3, minH: 4 },
    hasCsvExport: false,
  },
  hourly: {
    id: 'hourly',
    title: 'Error by Hour of Day',
    description: 'Intraday profile of forecast error (MAE and Bias) across 24 UTC hours.',
    defaultLayout: { i: 'hourly', x: 0, y: 10, w: 6, h: 5, minW: 4, minH: 4 },
    hasCsvExport: true,
  },
  horizon: {
    id: 'horizon',
    title: 'Error by Lead Time',
    description: 'Error degradation across forecast publication horizons with post-target segregation.',
    defaultLayout: { i: 'horizon', x: 6, y: 10, w: 6, h: 5, minW: 4, minH: 4 },
    hasCsvExport: true,
  },
};

export const DEFAULT_PANEL_IDS: PanelId[] = [
  'forecast',
  'metrics',
  'decision',
  'distribution',
  'table',
  'pie',
  'hourly',
  'horizon',
];

export const DEFAULT_LAYOUT: LayoutItem[] = DEFAULT_PANEL_IDS.map(
  (id) => ALL_PANELS[id].defaultLayout
);

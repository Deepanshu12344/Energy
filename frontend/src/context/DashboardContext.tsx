import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import type {
  ErrorByHourResponse,
  ErrorDistributionResponse,
  ForecastComparisonResponse,
  HorizonAnalysisResponse,
  MetaResponse,
  MetricsResponse,
} from '../api/types';
import {
  ALL_PANELS,
  DEFAULT_LAYOUT,
  DEFAULT_PANEL_IDS,
  type LayoutItem,
  type PanelId,
} from '../registry/panelRegistry';

export type RangeMode = 'single' | 'full' | 'custom';
export type ActiveTab = 'dashboard' | 'assumptions';

const STORAGE_LAYOUT_KEY = 'windcast_dashboard_layout';
const STORAGE_PANELS_KEY = 'windcast_visible_panels';
const LEGACY_STORAGE_LAYOUT_KEY = 'windwatch_dashboard_layout';
const LEGACY_STORAGE_PANELS_KEY = 'windwatch_visible_panels';

export interface DashboardContextType {
  // Navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Filters
  singleDate: string;
  setSingleDate: (date: string) => void;
  cutoffTime: string;
  setCutoffTime: (cutoff: string) => void;
  rangeMode: RangeMode;
  setRangeMode: (mode: RangeMode) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  effectiveRange: { start: string; end: string; label: string };

  // Layout & Panels
  visiblePanels: PanelId[];
  layout: LayoutItem[];
  addPanel: (id: PanelId) => void;
  removePanel: (id: PanelId) => void;
  resetLayout: () => void;
  onLayoutChange: (newLayout: LayoutItem[]) => void;
  commitLayout: (newLayout: LayoutItem[]) => void;
  lastRemovedPanel: { id: PanelId; title: string } | null;
  undoRemovePanel: () => void;
  clearUndo: () => void;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;

  // Modals
  expandedPanelId: PanelId | null;
  setExpandedPanelId: (id: PanelId | null) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  isResetConfirmOpen: boolean;
  setIsResetConfirmOpen: (open: boolean) => void;

  // Data & States
  forecast: ForecastComparisonResponse | null;
  loadingForecast: boolean;
  forecastError: string | null;

  metrics: MetricsResponse | null;
  loadingMetrics: boolean;
  metricsError: string | null;

  distribution: ErrorDistributionResponse | null;
  loadingDistribution: boolean;
  distributionError: string | null;

  hourly: ErrorByHourResponse | null;
  loadingHourly: boolean;
  hourlyError: string | null;

  horizon: HorizonAnalysisResponse | null;
  loadingHorizon: boolean;
  horizonError: string | null;

  meta: MetaResponse | null;
  loadingMeta: boolean;
  metaError: string | null;

  refetchPanel: (id: PanelId) => void;
  refetchAll: () => void;
}

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Filters
  const [singleDate, setSingleDate] = useState('2026-01-15');
  const [cutoffTime, setCutoffTime] = useState('12:00');
  const [rangeMode, setRangeModeState] = useState<RangeMode>('single');
  const [startDate, setStartDate] = useState('2026-01-02');
  const [endDate, setEndDate] = useState('2026-02-01');

  // Wrapped setRangeMode that sets singleDate to the first day of the selected range
  const setRangeMode = useCallback((mode: RangeMode) => {
    setRangeModeState(mode);
    if (mode === 'full') {
      setSingleDate('2026-01-02');
    } else if (mode === 'custom') {
      setSingleDate((prev) => (prev >= '2026-01-02' && prev <= '2026-02-01' ? prev : '2026-01-02'));
    }
  }, []);

  // Modals
  const [expandedPanelId, setExpandedPanelId] = useState<PanelId | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [lastRemovedPanel, setLastRemovedPanel] = useState<{ id: PanelId; title: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss toast notification after 3s
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Compute effective date range
  const effectiveRange = useMemo(() => {
    if (rangeMode === 'single') {
      return { start: singleDate, end: singleDate, label: `Delivery: ${singleDate}` };
    }
    if (rangeMode === 'full') {
      return { start: '2026-01-02', end: '2026-02-01', label: 'All January decisions (2 Jan to 1 Feb)' };
    }
    return { start: startDate, end: endDate, label: `Custom: ${startDate} to ${endDate}` };
  }, [rangeMode, singleDate, startDate, endDate]);

  // Load layout and visible panels with defensive fallback
  const [visiblePanels, setVisiblePanels] = useState<PanelId[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PANELS_KEY) || localStorage.getItem(LEGACY_STORAGE_PANELS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((id): id is PanelId => id in ALL_PANELS);
          if (valid.length > 0) return valid;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PANEL_IDS;
  });

  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_LAYOUT_KEY) || localStorage.getItem(LEGACY_STORAGE_LAYOUT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_LAYOUT;
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Commit layout changes and debounce write to localStorage
  const commitLayout = useCallback((newLayout: LayoutItem[]) => {
    setLayout(newLayout);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_LAYOUT_KEY, JSON.stringify(newLayout));
      } catch {
        // ignore
      }
    }, 200);
  }, []);

  const onLayoutChange = commitLayout;

  // Panel addition
  const addPanel = useCallback((id: PanelId) => {
    setToastMessage('Panel added');
    setVisiblePanels((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(STORAGE_PANELS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    setLayout((prevLayout) => {
      if (prevLayout.some((item) => item.i === id)) return prevLayout;
      const def = ALL_PANELS[id].defaultLayout;
      const maxY = prevLayout.reduce((acc, item) => Math.max(acc, item.y + item.h), 0);
      const newItem: LayoutItem = { ...def, x: 0, y: maxY };
      const nextLayout = [...prevLayout, newItem];
      try {
        localStorage.setItem(STORAGE_LAYOUT_KEY, JSON.stringify(nextLayout));
      } catch {
        // ignore
      }
      return nextLayout;
    });
  }, []);

  // Panel removal
  const removePanel = useCallback((id: PanelId) => {
    const title = ALL_PANELS[id]?.title || id;
    setLastRemovedPanel({ id, title });

    setVisiblePanels((prev) => {
      const next = prev.filter((p) => p !== id);
      try {
        localStorage.setItem(STORAGE_PANELS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const undoRemovePanel = useCallback(() => {
    if (lastRemovedPanel) {
      addPanel(lastRemovedPanel.id);
      setLastRemovedPanel(null);
    }
  }, [addPanel, lastRemovedPanel]);

  const clearUndo = useCallback(() => {
    setLastRemovedPanel(null);
  }, []);

  // Reset to default
  const resetLayout = useCallback(() => {
    setVisiblePanels(DEFAULT_PANEL_IDS);
    setLayout(DEFAULT_LAYOUT);
    setLastRemovedPanel(null);
    try {
      localStorage.setItem(STORAGE_PANELS_KEY, JSON.stringify(DEFAULT_PANEL_IDS));
      localStorage.setItem(STORAGE_LAYOUT_KEY, JSON.stringify(DEFAULT_LAYOUT));
    } catch {
      // ignore
    }
  }, []);

  // Data fetching states
  const [forecast, setForecast] = useState<ForecastComparisonResponse | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [distribution, setDistribution] = useState<ErrorDistributionResponse | null>(null);
  const [loadingDistribution, setLoadingDistribution] = useState(true);
  const [distributionError, setDistributionError] = useState<string | null>(null);

  const [hourly, setHourly] = useState<ErrorByHourResponse | null>(null);
  const [loadingHourly, setLoadingHourly] = useState(true);
  const [hourlyError, setHourlyError] = useState<string | null>(null);

  const [horizon, setHorizon] = useState<HorizonAnalysisResponse | null>(null);
  const [loadingHorizon, setLoadingHorizon] = useState(true);
  const [horizonError, setHorizonError] = useState<string | null>(null);

  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  // Fetch meta once on mount
  useEffect(() => {
    let active = true;
    const fetchMeta = async () => {
      try {
        setLoadingMeta(true);
        setMetaError(null);
        const data = await apiClient.getMeta();
        if (active) setMeta(data);
      } catch (err) {
        if (active) {
          setMetaError(err instanceof Error ? err.message : 'Failed to load system metadata');
        }
      } finally {
        if (active) setLoadingMeta(false);
      }
    };
    queueMicrotask(() => {
      if (active) void fetchMeta();
    });
    return () => {
      active = false;
    };
  }, []);

  // Fetch forecast data (for forecast chart and data table)
  const fetchForecast = useCallback(async () => {
    try {
      setLoadingForecast(true);
      setForecastError(null);
      const data = await apiClient.getForecast(singleDate, cutoffTime);
      setForecast(data);
    } catch (err) {
      setForecastError(err instanceof Error ? err.message : 'Failed to load forecast data');
    } finally {
      setLoadingForecast(false);
    }
  }, [singleDate, cutoffTime]);

  // Fetch metrics & decision data
  const fetchMetrics = useCallback(async () => {
    try {
      setLoadingMetrics(true);
      setMetricsError(null);
      const data = await apiClient.getMetrics(effectiveRange.start, effectiveRange.end, cutoffTime);
      setMetrics(data);
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : 'Failed to load accuracy metrics');
    } finally {
      setLoadingMetrics(false);
    }
  }, [effectiveRange.start, effectiveRange.end, cutoffTime]);

  // Fetch distribution & pie data
  const fetchDistribution = useCallback(async () => {
    try {
      setLoadingDistribution(true);
      setDistributionError(null);
      const data = await apiClient.getErrorDistribution(
        effectiveRange.start,
        effectiveRange.end,
        cutoffTime,
        10
      );
      setDistribution(data);
    } catch (err) {
      setDistributionError(err instanceof Error ? err.message : 'Failed to load error distribution');
    } finally {
      setLoadingDistribution(false);
    }
  }, [effectiveRange.start, effectiveRange.end, cutoffTime]);

  // Fetch hourly profile
  const fetchHourly = useCallback(async () => {
    try {
      setLoadingHourly(true);
      setHourlyError(null);
      const data = await apiClient.getErrorByHour(
        effectiveRange.start,
        effectiveRange.end,
        cutoffTime
      );
      setHourly(data);
    } catch (err) {
      setHourlyError(err instanceof Error ? err.message : 'Failed to load hourly error profile');
    } finally {
      setLoadingHourly(false);
    }
  }, [effectiveRange.start, effectiveRange.end, cutoffTime]);

  // Fetch horizon analysis
  const fetchHorizon = useCallback(async () => {
    try {
      setLoadingHorizon(true);
      setHorizonError(null);
      const data = await apiClient.getHorizonAnalysis(
        effectiveRange.start,
        effectiveRange.end
      );
      setHorizon(data);
    } catch (err) {
      setHorizonError(err instanceof Error ? err.message : 'Failed to load horizon analysis');
    } finally {
      setLoadingHorizon(false);
    }
  }, [effectiveRange.start, effectiveRange.end]);

  // Trigger coordinated fetches whenever parameters change
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void fetchForecast();
    });
    return () => {
      active = false;
    };
  }, [fetchForecast]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        void fetchMetrics();
        void fetchDistribution();
        void fetchHourly();
        void fetchHorizon();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchMetrics, fetchDistribution, fetchHourly, fetchHorizon]);

  const refetchPanel = useCallback(
    (id: PanelId) => {
      switch (id) {
        case 'forecast':
        case 'table':
          fetchForecast();
          break;
        case 'metrics':
        case 'decision':
          fetchMetrics();
          break;
        case 'distribution':
        case 'pie':
          fetchDistribution();
          break;
        case 'hourly':
          fetchHourly();
          break;
        case 'horizon':
          fetchHorizon();
          break;
      }
    },
    [fetchForecast, fetchMetrics, fetchDistribution, fetchHourly, fetchHorizon]
  );

  const refetchAll = useCallback(() => {
    fetchForecast();
    fetchMetrics();
    fetchDistribution();
    fetchHourly();
    fetchHorizon();
  }, [fetchForecast, fetchMetrics, fetchDistribution, fetchHourly, fetchHorizon]);

  return (
    <DashboardContext.Provider
      value={{
        activeTab,
        setActiveTab,
        singleDate,
        setSingleDate,
        cutoffTime,
        setCutoffTime,
        rangeMode,
        setRangeMode,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        effectiveRange,
        visiblePanels,
        layout,
        addPanel,
        removePanel,
        resetLayout,
        onLayoutChange,
        commitLayout,
        lastRemovedPanel,
        undoRemovePanel,
        clearUndo,
        toastMessage,
        setToastMessage,
        expandedPanelId,
        setExpandedPanelId,
        isAddModalOpen,
        setIsAddModalOpen,
        isResetConfirmOpen,
        setIsResetConfirmOpen,
        forecast,
        loadingForecast,
        forecastError,
        metrics,
        loadingMetrics,
        metricsError,
        distribution,
        loadingDistribution,
        distributionError,
        hourly,
        loadingHourly,
        hourlyError,
        horizon,
        loadingHorizon,
        horizonError,
        meta,
        loadingMeta,
        metaError,
        refetchPanel,
        refetchAll,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export { useDashboard } from './useDashboard';

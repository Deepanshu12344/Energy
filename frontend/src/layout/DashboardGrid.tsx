import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GridLayout, useContainerWidth } from 'react-grid-layout';
import { Undo2, X } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { PanelShell } from './PanelShell';
import { ForecastChartPanel } from '../panels/ForecastChartPanel';
import { MetricsPanel } from '../panels/MetricsPanel';
import { DecisionSupportPanel } from '../panels/DecisionSupportPanel';
import { ErrorDistributionPanel } from '../panels/ErrorDistributionPanel';
import { OverUnderPiePanel } from '../panels/OverUnderPiePanel';
import { HourlyErrorPanel } from '../panels/HourlyErrorPanel';
import { HorizonPanel } from '../panels/HorizonPanel';
import { DataTablePanel } from '../panels/DataTablePanel';
import { ALL_PANELS, type PanelId, type LayoutItem } from '../registry/panelRegistry';

export const DashboardGrid: React.FC = () => {
  const {
    visiblePanels,
    layout,
    onLayoutChange,
    lastRemovedPanel,
    undoRemovePanel,
    clearUndo,
    loadingForecast,
    forecastError,
    loadingMetrics,
    metricsError,
    loadingDistribution,
    distributionError,
    loadingHourly,
    hourlyError,
    loadingHorizon,
    horizonError,
  } = useDashboard();

  const { containerRef, width } = useContainerWidth();

  // Search state for table
  const [tableSearchOpen, setTableSearchOpen] = useState(false);

  // CSV export function references
  const exportCallbacks = useRef<Partial<Record<PanelId, () => void>>>({});

  const registerExport = useCallback((id: PanelId, fn: () => void) => {
    exportCallbacks.current[id] = fn;
  }, []);

  // Auto-dismiss undo notification after 7s
  useEffect(() => {
    if (!lastRemovedPanel) return;
    const timer = setTimeout(() => {
      clearUndo();
    }, 7000);
    return () => clearTimeout(timer);
  }, [lastRemovedPanel, clearUndo]);

  // Build grid layout items for visible panels
  const activeLayout = React.useMemo(() => {
    return visiblePanels.map((id) => {
      const existing = layout.find((l) => l.i === id);
      if (existing) return existing;
      const def = ALL_PANELS[id]?.defaultLayout;
      return def ? { ...def } : { i: id, x: 0, y: 0, w: 4, h: 5 };
    });
  }, [visiblePanels, layout]);

  // Handle layout changes from drag or resize
  const handleLayoutChange = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      onLayoutChange([...newLayout]);
    },
    [onLayoutChange]
  );

  // Render panel content by ID
  const renderPanelInner = (id: PanelId) => {
    switch (id) {
      case 'forecast':
        return <ForecastChartPanel />;
      case 'metrics':
        return <MetricsPanel />;
      case 'decision':
        return <DecisionSupportPanel />;
      case 'distribution':
        return (
          <ErrorDistributionPanel
            onRegisterExport={(fn) => registerExport('distribution', fn)}
          />
        );
      case 'pie':
        return <OverUnderPiePanel />;
      case 'hourly':
        return (
          <HourlyErrorPanel
            onRegisterExport={(fn) => registerExport('hourly', fn)}
          />
        );
      case 'horizon':
        return (
          <HorizonPanel
            onRegisterExport={(fn) => registerExport('horizon', fn)}
          />
        );
      case 'table':
        return (
          <DataTablePanel
            isSearchOpen={tableSearchOpen}
            onCloseSearch={() => setTableSearchOpen(false)}
            onRegisterExport={(fn) => registerExport('table', fn)}
          />
        );
      default:
        return null;
    }
  };

  const getPanelLoading = (id: PanelId) => {
    switch (id) {
      case 'forecast':
      case 'table':
        return loadingForecast;
      case 'metrics':
      case 'decision':
        return loadingMetrics;
      case 'distribution':
      case 'pie':
        return loadingDistribution;
      case 'hourly':
        return loadingHourly;
      case 'horizon':
        return loadingHorizon;
    }
  };

  const getPanelError = (id: PanelId) => {
    switch (id) {
      case 'forecast':
      case 'table':
        return forecastError;
      case 'metrics':
      case 'decision':
        return metricsError;
      case 'distribution':
      case 'pie':
        return distributionError;
      case 'hourly':
        return hourlyError;
      case 'horizon':
        return horizonError;
    }
  };

  return (
    <div className="relative w-full pb-12">
      {/* Container ref for react-grid-layout measurements */}
      <div ref={containerRef} className="w-full">
        {width > 0 && (
          <GridLayout
            width={width}
            layout={activeLayout}
            gridConfig={{
              cols: 12,
              rowHeight: 76,
              margin: [18, 18],
              containerPadding: [0, 0],
              maxRows: 100,
            }}
            dragConfig={{
              enabled: true,
              bounded: true,
              handle: '.panel-header-drag',
              threshold: 3,
            }}
            resizeConfig={{
              enabled: true,
              handles: ['se'],
            }}
            onLayoutChange={handleLayoutChange}
          >
            {visiblePanels.map((id) => (
              <div key={id} className="h-full">
                <PanelShell
                  id={id}
                  loading={getPanelLoading(id)}
                  error={getPanelError(id)}
                  isSearchOpen={id === 'table' ? tableSearchOpen : false}
                  onSearchToggle={
                    id === 'table' ? () => setTableSearchOpen((prev) => !prev) : undefined
                  }
                  onExportCsv={() => exportCallbacks.current[id]?.()}
                >
                  {renderPanelInner(id)}
                </PanelShell>
              </div>
            ))}
          </GridLayout>
        )}
      </div>

      {/* Floating Undo Notification */}
      {lastRemovedPanel && (
        <div className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-2xl border border-slate-700 dark:border-slate-200 flex items-center gap-3 animate-slide-up">
          <span className="text-xs font-medium">
            <strong>{lastRemovedPanel.title}</strong> removed
          </span>
          <button
            type="button"
            onClick={undoRemovePanel}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#0B8FE3] text-white hover:bg-blue-600 transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={clearUndo}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { DashboardProvider } from '../context/DashboardContext';
import { useDashboard } from '../context/useDashboard';
import { AddPanelModal } from '../layout/AddPanelModal';
import { ALL_PANELS, DEFAULT_PANEL_IDS, type PanelId } from '../registry/panelRegistry';

// Mock API client to avoid network calls during component unit tests
vi.mock('../api/client', () => ({
  apiClient: {
    getHealth: vi.fn().mockResolvedValue({ status: 'ok', database_connected: true, timestamp: '' }),
    getMeta: vi.fn().mockResolvedValue({
      available_start_date: '2026-01-01',
      available_end_date: '2026-01-31',
      default_cutoff_time: '12:00',
      actual_rows_count: 1488,
      forecast_rows_count: 18080,
      timezone: 'Europe/London',
      resolution_notes: {
        windfor_resolution: 'hourly',
        fuelhh_resolution: 'half_hourly',
        evaluation_rule: 'D-1 12:00 cutoff',
        matching_strategy: 'exact_timestamp_match',
      },
    }),
    getForecast: vi.fn().mockResolvedValue({
      delivery_date: '2026-01-15',
      cutoff_time: '12:00',
      total_slots: 48,
      data: [
        {
          start_time: '2026-01-15T00:00:00Z',
          actual_mw: 8500,
          forecast_mw: 9200,
          error_mw: 700,
          lead_time_hours: 12,
          publish_time: '2026-01-14T11:45:00Z',
          status: 'forecast_selected',
        },
      ],
    }),
    getMetrics: vi.fn().mockResolvedValue({
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      cutoff_time: '12:00',
      metrics: {
        mae: 2002.91,
        rmse: 2470.08,
        bias: 1805.86,
        mape: 19.5,
        mape_excluded_count: 0,
        p50_abs_error: 1709.5,
        p90_abs_error: 4000.0,
        p95_abs_error: 4686.1,
        buffer_recommendation_mw_p90: 4000.0,
        total_slots: 744,
        evaluated_slots: 744,
        missing_slots: 0,
      },
    }),
    getErrorDistribution: vi.fn().mockResolvedValue({
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      cutoff_time: '12:00',
      total_samples: 744,
      over_forecast_count: 634,
      over_forecast_share: 0.8522,
      bins: [
        { bin_label: '-1000 to 0', bin_min: -1000, bin_max: 0, count: 110 },
        { bin_label: '0 to 1000', bin_min: 0, bin_max: 1000, count: 250 },
      ],
    }),
    getErrorByHour: vi.fn().mockResolvedValue({
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      cutoff_time: '12:00',
      hourly_errors: [{ hour: 0, mae: 1900, bias: 1700, rmse: 2300, count: 31 }],
    }),
    getHorizonAnalysis: vi.fn().mockResolvedValue({
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      main_buckets: [{ horizon_bucket: '<12h', mae: 1800, rmse: 2200, bias: 1600, count: 150 }],
      after_target_bucket: null,
    }),
  },
}));

// Test harness exposing dashboard operations via UI
const TestDashboardHarness: React.FC = () => {
  const {
    visiblePanels,
    addPanel,
    removePanel,
    resetLayout,
    lastRemovedPanel,
    undoRemovePanel,
    isAddModalOpen,
    setIsAddModalOpen,
  } = useDashboard();

  return (
    <div>
      <div data-testid="visible-count">{visiblePanels.length}</div>
      <div data-testid="visible-panels">{visiblePanels.join(',')}</div>
      {lastRemovedPanel && (
        <div data-testid="last-removed">{lastRemovedPanel.title}</div>
      )}

      {/* Button to remove table panel */}
      <button
        data-testid="remove-table"
        type="button"
        onClick={() => removePanel('table')}
      >
        Remove Table
      </button>

      {/* Button to remove metrics panel */}
      <button
        data-testid="remove-metrics"
        type="button"
        onClick={() => removePanel('metrics')}
      >
        Remove Metrics
      </button>

      {/* Button to add table panel back */}
      <button
        data-testid="add-table"
        type="button"
        onClick={() => addPanel('table')}
      >
        Add Table
      </button>

      {/* Button to undo removal */}
      <button
        data-testid="undo-remove"
        type="button"
        onClick={undoRemovePanel}
      >
        Undo Remove
      </button>

      {/* Button to reset layout */}
      <button
        data-testid="reset-layout"
        type="button"
        onClick={resetLayout}
      >
        Reset Layout
      </button>

      {/* Button to toggle add modal */}
      <button
        data-testid="open-add-modal"
        type="button"
        onClick={() => setIsAddModalOpen(true)}
      >
        Open Add Modal
      </button>

      {/* Render AddPanelModal */}
      {isAddModalOpen && <AddPanelModal />}
    </div>
  );
};

describe('Dashboard Grid State & Layout Persistence Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders default panel set on initial load', () => {
    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    expect(screen.getByTestId('visible-count').textContent).toBe(String(DEFAULT_PANEL_IDS.length));
    expect(screen.getByTestId('visible-panels').textContent).toBe(DEFAULT_PANEL_IDS.join(','));
  });

  it('removes a panel and records lastRemovedPanel for undo', () => {
    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    expect(screen.getByTestId('visible-panels').textContent).toContain('table');

    act(() => {
      fireEvent.click(screen.getByTestId('remove-table'));
    });

    expect(screen.getByTestId('visible-panels').textContent).not.toContain('table');
    expect(screen.getByTestId('last-removed').textContent).toBe(ALL_PANELS.table.title);
    expect(screen.getByTestId('visible-count').textContent).toBe(String(DEFAULT_PANEL_IDS.length - 1));

    // Verify localStorage was updated
    const saved = JSON.parse(localStorage.getItem('windcast_visible_panels') || '[]');
    expect(saved).not.toContain('table');
  });

  it('adds a panel back and updates visible set', () => {
    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    // Remove first
    act(() => {
      fireEvent.click(screen.getByTestId('remove-table'));
    });
    expect(screen.getByTestId('visible-panels').textContent).not.toContain('table');

    // Add back
    act(() => {
      fireEvent.click(screen.getByTestId('add-table'));
    });
    expect(screen.getByTestId('visible-panels').textContent).toContain('table');

    // Verify localStorage contains table
    const saved = JSON.parse(localStorage.getItem('windcast_visible_panels') || '[]');
    expect(saved).toContain('table');
  });

  it('undoes removal using undoRemovePanel', () => {
    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('remove-table'));
    });
    expect(screen.getByTestId('visible-panels').textContent).not.toContain('table');

    act(() => {
      fireEvent.click(screen.getByTestId('undo-remove'));
    });
    expect(screen.getByTestId('visible-panels').textContent).toContain('table');
  });

  it('resets layout and restores all default panels', () => {
    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    // Remove panel
    act(() => {
      fireEvent.click(screen.getByTestId('remove-table'));
    });
    expect(screen.getByTestId('visible-count').textContent).toBe(String(DEFAULT_PANEL_IDS.length - 1));

    // Click reset layout
    act(() => {
      fireEvent.click(screen.getByTestId('reset-layout'));
    });

    expect(screen.getByTestId('visible-count').textContent).toBe(String(DEFAULT_PANEL_IDS.length));
    expect(screen.getByTestId('visible-panels').textContent).toBe(DEFAULT_PANEL_IDS.join(','));
  });

  it('recovers gracefully from corrupted localStorage data', () => {
    localStorage.setItem('windcast_visible_panels', '{"invalid": "corrupt json string}');
    localStorage.setItem('windcast_dashboard_layout', 'invalid layout data');

    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    // Should gracefully fallback to default panel set without throwing
    expect(screen.getByTestId('visible-count').textContent).toBe(String(DEFAULT_PANEL_IDS.length));
  });

  it('recovers gracefully from legacy windwatch localStorage keys', () => {
    const legacyList: PanelId[] = ['forecast', 'metrics', 'decision'];
    localStorage.setItem('windwatch_visible_panels', JSON.stringify(legacyList));

    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    expect(screen.getByTestId('visible-count').textContent).toBe('3');
    expect(screen.getByTestId('visible-panels').textContent).toBe('forecast,metrics,decision');
  });
});

describe('AddPanelModal Tests (Full Panel Previews & Keyboard Support)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('modal displays empty state when all panels are already active', () => {
    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('open-add-modal'));
    });

    expect(screen.getByText('Add panel to dashboard')).toBeDefined();
    expect(screen.getByText('All panels are already on your dashboard.')).toBeDefined();
  });

  it('modal lists only panels currently missing from the dashboard', () => {
    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    // Remove table and metrics
    act(() => {
      fireEvent.click(screen.getByTestId('remove-table'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('remove-metrics'));
    });

    // Open add modal
    act(() => {
      fireEvent.click(screen.getByTestId('open-add-modal'));
    });

    // Should contain preview cards for table and metrics
    expect(screen.getByTestId('preview-panel-table')).toBeDefined();
    expect(screen.getByTestId('preview-panel-metrics')).toBeDefined();

    // Should NOT contain preview card for forecast because it is still active
    expect(screen.queryByTestId('preview-panel-forecast')).toBeNull();
  });

  it('clicking a preview adds the panel and immediately removes it from the modal while staying open', () => {
    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    // Remove table and metrics
    act(() => {
      fireEvent.click(screen.getByTestId('remove-table'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('remove-metrics'));
    });

    // Open modal
    act(() => {
      fireEvent.click(screen.getByTestId('open-add-modal'));
    });

    expect(screen.getByTestId('preview-panel-table')).toBeDefined();
    expect(screen.getByTestId('preview-panel-metrics')).toBeDefined();

    // Click table preview
    act(() => {
      fireEvent.click(screen.getByTestId('preview-panel-table'));
    });

    // Table is now added back to dashboard visible panels
    expect(screen.getByTestId('visible-panels').textContent).toContain('table');

    // In modal, table preview is removed, but metrics preview is still present
    expect(screen.queryByTestId('preview-panel-table')).toBeNull();
    expect(screen.getByTestId('preview-panel-metrics')).toBeDefined();
    // Modal stays open
    expect(screen.getByText('Add panel to dashboard')).toBeDefined();
  });

  it('closes modal when Escape key is pressed', () => {
    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('open-add-modal'));
    });

    expect(screen.getByText('Add panel to dashboard')).toBeDefined();

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    });

    expect(screen.queryByText('Add panel to dashboard')).toBeNull();
  });

  it('supports adding panel via Enter key', () => {
    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('remove-table'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('open-add-modal'));
    });

    const preview = screen.getByTestId('preview-panel-table');
    act(() => {
      fireEvent.keyDown(preview, { key: 'Enter', code: 'Enter' });
    });

    expect(screen.getByTestId('visible-panels').textContent).toContain('table');
    expect(screen.queryByTestId('preview-panel-table')).toBeNull();
  });
});

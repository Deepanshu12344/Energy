import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { DashboardProvider } from '../context/DashboardContext';
import { useDashboard } from '../context/useDashboard';
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
      cutoff_timestamp_utc: '2026-01-14T12:00:00Z',
      total_slots: 48,
      hourly_slots: 24,
      matched_slots: 24,
      missing_slots: 0,
      not_applicable_slots: 24,
      data: [],
    }),
    getMetrics: vi.fn().mockResolvedValue({
      start_date: '2026-01-15',
      end_date: '2026-01-15',
      cutoff_time: '12:00',
      metrics: {
        mae: 1500,
        rmse: 2000,
        bias: 1200,
        mape: 15.2,
        mape_excluded_count: 0,
        p50_abs_error: 1300,
        p90_abs_error: 3000,
        p95_abs_error: 3500,
        buffer_recommendation_mw_p90: 3000,
        total_slots: 24,
        evaluated_slots: 24,
        missing_slots: 0,
      },
    }),
    getErrorDistribution: vi.fn().mockResolvedValue({
      start_date: '2026-01-15',
      end_date: '2026-01-15',
      cutoff_time: '12:00',
      total_samples: 24,
      min_error_mw: -1000,
      max_error_mw: 2000,
      over_forecast_count: 20,
      over_forecast_share: 0.833,
      bins: [],
    }),
    getErrorByHour: vi.fn().mockResolvedValue({
      start_date: '2026-01-15',
      end_date: '2026-01-15',
      cutoff_time: '12:00',
      hourly_errors: [],
    }),
    getHorizonAnalysis: vi.fn().mockResolvedValue({
      start_date: '2026-01-15',
      end_date: '2026-01-15',
      main_buckets: [],
      after_target_bucket: null,
      buckets: [],
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
    const saved = JSON.parse(localStorage.getItem('windwatch_visible_panels') || '[]');
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
    const saved = JSON.parse(localStorage.getItem('windwatch_visible_panels') || '[]');
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
    localStorage.setItem('windwatch_visible_panels', '{"invalid": "corrupt json string}');
    localStorage.setItem('windwatch_dashboard_layout', 'invalid layout data');

    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    // Should gracefully fallback to default panel set without throwing
    expect(screen.getByTestId('visible-count').textContent).toBe(String(DEFAULT_PANEL_IDS.length));
  });

  it('persists customized panel list across remounts', () => {
    const customList: PanelId[] = ['forecast', 'metrics', 'decision'];
    localStorage.setItem('windwatch_visible_panels', JSON.stringify(customList));

    render(
      <DashboardProvider>
        <TestDashboardHarness />
      </DashboardProvider>
    );

    expect(screen.getByTestId('visible-count').textContent).toBe('3');
    expect(screen.getByTestId('visible-panels').textContent).toBe('forecast,metrics,decision');
  });
});

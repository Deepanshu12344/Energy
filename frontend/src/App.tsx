import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import { Navbar } from './layout/Navbar';
import { FilterBar } from './layout/FilterBar';
import { DashboardGrid } from './layout/DashboardGrid';
import { AssumptionsView } from './components/AssumptionsView';
import { AddPanelModal } from './layout/AddPanelModal';
import { ConfirmModal } from './layout/ConfirmModal';
import { ExpandModal } from './layout/ExpandModal';
import { ForecastChartPanel } from './panels/ForecastChartPanel';
import { MetricsPanel } from './panels/MetricsPanel';
import { DecisionSupportPanel } from './panels/DecisionSupportPanel';
import { ErrorDistributionPanel } from './panels/ErrorDistributionPanel';
import { OverUnderPiePanel } from './panels/OverUnderPiePanel';
import { HourlyErrorPanel } from './panels/HourlyErrorPanel';
import { HorizonPanel } from './panels/HorizonPanel';
import { DataTablePanel } from './panels/DataTablePanel';
import type { PanelId } from './registry/panelRegistry';

const DashboardContent: React.FC = () => {
  const { activeTab, setIsAddModalOpen, setIsResetConfirmOpen } = useDashboard();

  // Helper to render panel for enlarged expand modal
  const renderExpandedPanel = (id: PanelId) => {
    switch (id) {
      case 'forecast':
        return <ForecastChartPanel />;
      case 'metrics':
        return <MetricsPanel />;
      case 'decision':
        return <DecisionSupportPanel />;
      case 'distribution':
        return <ErrorDistributionPanel />;
      case 'pie':
        return <OverUnderPiePanel />;
      case 'hourly':
        return <HourlyErrorPanel />;
      case 'horizon':
        return <HorizonPanel />;
      case 'table':
        return <DataTablePanel />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0A0A0A] transition-colors flex flex-col font-sans selection:bg-[#0B8FE3]/20">
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' ? (
          <>
            {/* Dashboard Title & Actions Row (Matching RAW screenshot) */}
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Dashboard
              </h1>

              <div className="flex items-center gap-2.5">
                {/* Blue "+ Add Panel" Button */}
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0B8FE3] hover:bg-[#097ec9] text-white shadow-sm transition active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Panel</span>
                </button>

                {/* Trash Icon Button to Reset Layout */}
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                  title="Reset dashboard layout to default"
                  aria-label="Reset layout"
                  className="p-2 rounded-lg border border-slate-200 dark:border-[#2A2A2A] text-slate-400 dark:text-[#A3A3A3] hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Global Filter Bar */}
            <FilterBar />

            {/* Draggable & Resizable Grid */}
            <DashboardGrid />
          </>
        ) : (
          /* Assumptions Page */
          <AssumptionsView />
        )}
      </main>

      {/* Global Interactive Modals */}
      <AddPanelModal />
      <ConfirmModal />
      <ExpandModal renderPanelContent={renderExpandedPanel} />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </ThemeProvider>
  );
}

export default App;

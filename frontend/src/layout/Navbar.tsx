import React from 'react';
import { LayoutDashboard, FileText, Sun, Moon } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { useTheme } from '../context/ThemeContext';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab } = useDashboard();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-[#131B2E] border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* App Logo in spaced uppercase letters matching screenshot 'R A W' */}
        <div className="flex items-center">
          <span className="text-xl font-bold tracking-[0.25em] text-slate-900 dark:text-white uppercase select-none">
            W I N D W A T C H
          </span>
        </div>

        {/* Centered navigation tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-100/80 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-[#0B8FE3] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assumptions')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'assumptions'
                ? 'bg-[#0B8FE3] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Assumptions</span>
          </button>
        </nav>

        {/* Right side: Light/Dark theme toggle */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};

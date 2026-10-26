import React from 'react';
import { LayoutDashboard, FileText, Sun, Moon } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { useTheme } from '../context/ThemeContext';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab } = useDashboard();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-[#141414] border-b border-slate-200/80 dark:border-[#2A2A2A] transition-colors">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 grid grid-cols-3 items-center">
        {/* Left Zone: Logo */}
        <div className="flex items-center justify-start">
          <span className="text-xl font-bold uppercase tracking-normal text-slate-900 dark:text-white select-none">
            WINDCAST
          </span>
        </div>

        {/* Center Zone: Truly centered navigation tabs */}
        <div className="flex items-center justify-center">
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-100/90 dark:bg-[#1A1A1A] p-1 rounded-xl border border-slate-200/60 dark:border-[#2A2A2A]">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#0B8FE3] text-white shadow-sm'
                  : 'text-slate-600 dark:text-[#A3A3A3] hover:text-slate-900 dark:hover:text-white'
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
                  : 'text-slate-600 dark:text-[#A3A3A3] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Assumptions</span>
            </button>
          </nav>
        </div>

        {/* Right Zone: Theme Toggle (Brand Blue in both modes) */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="p-2 rounded-lg text-[#0B8FE3] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
          >
            {theme === 'light' ? <Moon className="w-5 h-5 text-[#0B8FE3]" /> : <Sun className="w-5 h-5 text-[#0B8FE3]" />}
          </button>
        </div>
      </div>
    </header>
  );
};

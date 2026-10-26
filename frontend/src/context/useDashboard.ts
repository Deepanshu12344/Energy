import { useContext } from 'react';
import { DashboardContext, type DashboardContextType } from './DashboardContext';

export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

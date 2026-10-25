import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  error: string | null;
  detail?: string | null;
  onRetry?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, detail, onRetry }) => {
  if (!error) return null;

  return (
    <div className="bg-rose-950/80 border border-rose-800 rounded-xl p-4 flex items-start justify-between gap-3 shadow-lg">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-rose-200">{error}</h4>
          {detail && <p className="text-xs text-rose-300/80 mt-1">{detail}</p>}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center space-x-1 px-3 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700/60 rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};

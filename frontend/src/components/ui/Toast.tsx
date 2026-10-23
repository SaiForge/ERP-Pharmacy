import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

export interface ToastProps {
  type?: ToastType;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
}) => {
  const styles = {
    success: 'border-l-4 border-l-success bg-success-soft text-emerald-950 border border-success/30',
    danger: 'border-l-4 border-l-danger bg-danger-soft text-rose-950 border border-danger/30',
    warning: 'border-l-4 border-l-warning bg-warning-soft text-amber-950 border border-warning/30',
    info: 'border-l-4 border-l-accent bg-accent-soft text-teal-950 border border-accent/30',
  };

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />,
    danger: <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-accent flex-shrink-0" />,
  };

  return (
    <div
      className={`rounded-r-md p-3.5 flex items-start justify-between gap-3 text-xs ${styles[type]} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        {icons[type]}
        <div>
          {title && <h4 className="font-semibold text-xs mb-0.5">{title}</h4>}
          <p className="leading-relaxed">{message}</p>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-800 p-0.5 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

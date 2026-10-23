import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  subtitle?: string;
  variant?: 'default' | 'accent' | 'warning' | 'danger';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  subtitle,
  variant = 'default',
}) => {
  const iconBgClasses = {
    default: 'bg-accent-soft text-accent',
    accent: 'bg-teal-100 text-teal-800',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
  };

  return (
    <div className="bg-white border border-border rounded-md p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</p>
          <h2 className="text-2xl font-bold text-text-primary mt-1.5 tracking-tight">{value}</h2>
        </div>
        <div className={`p-2.5 rounded-full flex-shrink-0 ${iconBgClasses[variant]}`}>
          {icon}
        </div>
      </div>

      {(trend || subtitle) && (
        <div className="mt-3.5 pt-3 border-t border-border flex items-center justify-between text-xs">
          {trend ? (
            <div className="flex items-center gap-1.5">
              <span
                className={`font-semibold ${
                  trend.isPositive ? 'text-success' : 'text-danger'
                }`}
              >
                {trend.value}
              </span>
              {trend.label && <span className="text-text-secondary">{trend.label}</span>}
            </div>
          ) : (
            <span className="text-text-secondary">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};

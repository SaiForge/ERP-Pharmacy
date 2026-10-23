import React from 'react';

export type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] leading-tight font-medium',
    md: 'px-2.5 py-1 text-xs leading-tight font-medium',
  };

  const variantClasses = {
    accent: 'bg-accent-soft text-accent border border-accent/20',
    success: 'bg-success-soft text-success border border-success/20',
    warning: 'bg-warning-soft text-warning border border-warning/20',
    danger: 'bg-danger-soft text-danger border border-danger/20',
    neutral: 'bg-surface-alt text-text-secondary border border-border',
  };

  return (
    <span
      className={`inline-flex items-center rounded gap-1 tracking-wide select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

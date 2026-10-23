import React from 'react';
import { Search, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Badge } from './Badge';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle, actions }) => {
  const { user, logout } = useAuthStore();

  const getRoleVariant = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'danger';
      case 'PHARMACIST':
        return 'accent';
      case 'BILLING_STAFF':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 flex-shrink-0 z-20">
      {/* Title & Context */}
      <div className="flex items-center gap-4">
        <div>
          {title && <h1 className="text-base font-bold text-text-primary tracking-tight">{title}</h1>}
          {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
        </div>
      </div>

      {/* Right Side: Actions, User Info, Role Badge */}
      <div className="flex items-center gap-3">
        {actions && <div className="flex items-center gap-2 mr-2">{actions}</div>}

        {/* User Card & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="text-xs font-semibold text-text-primary leading-tight">
                {user?.full_name || 'Staff User'}
              </p>
              <div className="mt-0.5">
                <Badge variant={getRoleVariant(user?.role)} size="sm">
                  {user?.role || 'STAFF'}
                </Badge>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-surface-alt border border-border flex items-center justify-center text-text-secondary">
              <UserIcon className="w-4 h-4" />
            </div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-md text-text-secondary hover:text-danger hover:bg-danger-soft transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

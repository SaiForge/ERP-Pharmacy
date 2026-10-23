import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  Layers,
  Truck,
  ShoppingCart,
  Receipt,
  Building2,
  GitPullRequest,
  BarChart3,
  SlidersHorizontal,
  PlusCircle,
  Menu,
  LogOut,
  Shield,
  Stethoscope,
  CreditCard,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  allowedRoles: UserRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const ROLE_META: Record<UserRole, { label: string; color: string; icon: React.ElementType }> = {
  ADMIN:        { label: 'Administrator',   color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Shield },
  PHARMACIST:   { label: 'Pharmacist',      color: 'bg-teal-100 text-teal-700 border-teal-200',       icon: Stethoscope },
  BILLING_STAFF:{ label: 'Billing Staff',   color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: CreditCard },
  DEPT_STAFF:   { label: 'Dept. Staff',     color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Users },
};

const ALL_ROLES: UserRole[] = ['ADMIN', 'PHARMACIST', 'BILLING_STAFF', 'DEPT_STAFF'];

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ALL_ROLES },
    ],
  },
  {
    label: 'Inventory Management',
    items: [
      { to: '/inventory/medicines',    label: 'Medicines Catalog',  icon: Pill,              allowedRoles: ['ADMIN', 'PHARMACIST', 'BILLING_STAFF'] },
      { to: '/inventory/batches',      label: 'Batches & FEFO',     icon: Layers,            allowedRoles: ['ADMIN', 'PHARMACIST'] },
      { to: '/inventory/adjustments',  label: 'Stock Adjustments',  icon: SlidersHorizontal, allowedRoles: ['ADMIN', 'PHARMACIST'] },
    ],
  },
  {
    label: 'Procurement & Purchase',
    items: [
      { to: '/purchase/orders',    label: 'Purchase Orders', icon: ShoppingCart, allowedRoles: ['ADMIN', 'PHARMACIST'] },
      { to: '/purchase/suppliers', label: 'Suppliers',       icon: Truck,        allowedRoles: ['ADMIN', 'PHARMACIST'] },
    ],
  },
  {
    label: 'Patient Dispensing',
    items: [
      { to: '/billing',     label: 'Bills & Sales',   icon: Receipt,    allowedRoles: ['ADMIN', 'BILLING_STAFF'] },
      { to: '/billing/new', label: 'New Bill (POS)',   icon: PlusCircle, allowedRoles: ['ADMIN', 'BILLING_STAFF'] },
    ],
  },
  {
    label: 'Hospital Departments',
    items: [
      { to: '/departments/issues', label: 'Requisitions & Issues', icon: GitPullRequest, allowedRoles: ['ADMIN', 'PHARMACIST', 'DEPT_STAFF'] },
      { to: '/departments',        label: 'Departments List',      icon: Building2,      allowedRoles: ['ADMIN', 'PHARMACIST', 'DEPT_STAFF'] },
    ],
  },
  {
    label: 'Analytics & Audit',
    items: [
      { to: '/reports', label: 'Reports & Ledger', icon: BarChart3, allowedRoles: ALL_ROLES },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, logout } = useAuthStore();
  const role = user?.role as UserRole | undefined;
  const roleMeta = role ? ROLE_META[role] : null;
  const RoleIcon = roleMeta?.icon;

  // Filter groups to only show items the current role can access
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      !role || item.allowedRoles.includes(role)
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={`h-screen bg-white border-r border-border flex flex-col flex-shrink-0 transition-all duration-200 z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-surface">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white font-bold text-sm tracking-wider flex-shrink-0">
              HP
            </div>
            <div className="truncate">
              <h1 className="text-sm font-bold text-text-primary leading-tight">HPMS</h1>
              <p className="text-[11px] text-text-secondary">Hospital Pharmacy</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white font-bold text-sm mx-auto">
            HP
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors hidden md:block"
          title="Toggle Sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Role Badge */}
      {!isCollapsed && roleMeta && (
        <div className={`mx-3 mt-3 px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-2 ${roleMeta.color}`}>
          {RoleIcon && <RoleIcon className="w-3.5 h-3.5 flex-shrink-0" />}
          <div className="truncate">
            <p className="font-semibold">{user?.full_name?.split(' ')[0]}</p>
            <p className="opacity-75 text-[10px]">{roleMeta.label}</p>
          </div>
        </div>
      )}

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors border-l-2 select-none ${
                      isActive
                        ? 'border-accent text-accent bg-accent-soft font-semibold'
                        : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-alt'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer: user info + logout */}
      <div className={`border-t border-border bg-surface ${isCollapsed ? 'p-2' : 'p-3'}`}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <div className="truncate">
              <p className="font-medium text-text-primary truncate">{user?.email}</p>
              <p className="text-[10px]">v1.0.0</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            title="Logout"
            className="w-full flex justify-center p-2 rounded hover:bg-red-50 hover:text-red-500 transition-colors text-text-secondary"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};

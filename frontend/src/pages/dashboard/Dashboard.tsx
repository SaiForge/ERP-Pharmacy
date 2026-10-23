import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Pill,
  DollarSign,
  AlertTriangle,
  Clock,
  Ban,
  Receipt,
  ShoppingCart,
  PlusCircle,
  BarChart2,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { dashboardApi } from '../../api/dashboard';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Topbar } from '../../components/ui/Topbar';

export const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <Topbar
        title="Hospital Pharmacy Operations Dashboard"
        subtitle="Real-time stock ledger, FEFO dispensing status, and department consumption"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/billing/new">
              <Button size="sm" variant="primary">
                <Receipt className="w-4 h-4 mr-1" /> New Bill (POS)
              </Button>
            </Link>
            <Link to="/purchase/orders">
              <Button size="sm" variant="secondary">
                <ShoppingCart className="w-4 h-4 mr-1" /> New Purchase Order
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Medicines"
          value={isLoading ? '...' : stats?.total_active_medicines || 0}
          icon={<Pill className="w-5 h-5 text-accent" />}
          subtitle="Catalog active items"
          variant="default"
        />

        <StatCard
          label="Total Inventory Value"
          value={isLoading ? '...' : `₹${(stats?.total_stock_value || 0).toLocaleString('en-IN')}`}
          icon={<DollarSign className="w-5 h-5 text-accent" />}
          subtitle="At wholesale cost price"
          variant="default"
        />

        <StatCard
          label="Low Stock Alerts"
          value={isLoading ? '...' : stats?.low_stock_count || 0}
          icon={<AlertTriangle className="w-5 h-5 text-warning" />}
          subtitle="At or below reorder level"
          variant="warning"
        />

        <StatCard
          label="Expiring Soon (30d)"
          value={isLoading ? '...' : stats?.expiring_soon_count || 0}
          icon={<Clock className="w-5 h-5 text-warning" />}
          subtitle="Priority FEFO candidates"
          variant="warning"
        />

        <StatCard
          label="Expired Batches"
          value={isLoading ? '...' : stats?.expired_count || 0}
          icon={<Ban className="w-5 h-5 text-danger" />}
          subtitle="Write-off / quarantine needed"
          variant="danger"
        />

        <StatCard
          label="Today's Billing"
          value={isLoading ? '...' : `₹${(stats?.today_billing_total || 0).toLocaleString('en-IN')}`}
          icon={<Receipt className="w-5 h-5 text-accent" />}
          subtitle={`${stats?.today_bills_count || 0} patient bills today`}
          variant="default"
        />

        <StatCard
          label="Pending Purchase Orders"
          value={isLoading ? '...' : stats?.pending_purchase_orders || 0}
          icon={<ShoppingCart className="w-5 h-5 text-accent" />}
          subtitle="Awaiting goods receipt"
          variant="default"
        />

        {/* Quick Action Card */}
        <div className="bg-white border border-border rounded-md p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Direct Actions</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link to="/inventory/medicines" className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center">
                + Add Medicine
              </Link>
              <Link to="/inventory/adjustments" className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center">
                Stock Adjust
              </Link>
              <Link to="/departments/issues" className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center">
                Dept Requisition
              </Link>
              <Link to="/reports" className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center">
                Audit Ledger
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Departments Bar Chart - Flat solid teal only */}
        <Card
          title="Top 5 Departments by Drug Consumption"
          subtitle="Units of medicines issued across hospital wards"
        >
          <div className="h-72 w-full pt-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-xs">
                Loading analytics...
              </div>
            ) : !stats?.top_departments_consumption?.length ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-xs">
                No department issues recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.top_departments_consumption}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="department_name"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    interval={0}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      boxShadow: 'none',
                    }}
                  />
                  {/* Flat solid teal accent color — NO gradients */}
                  <Bar dataKey="units_consumed" name="Units Consumed" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* 7-Day Stock In vs Stock Out Line Chart - Flat solid colors only */}
        <Card
          title="Stock Movement Velocity (Last 7 Days)"
          subtitle="Units received (stock in) vs units dispensed/issued (stock out)"
        >
          <div className="h-72 w-full pt-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-xs">
                Loading analytics...
              </div>
            ) : !stats?.stock_trends?.length ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-xs">
                No stock movements logged
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.stock_trends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      boxShadow: 'none',
                    }}
                  />
                  {/* Flat single-color series: Stock In (Teal) and Stock Out (Slate-600) */}
                  <Line
                    type="monotone"
                    dataKey="stock_in"
                    name="Stock In (Received)"
                    stroke="#0D9488"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#0D9488' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="stock_out"
                    name="Stock Out (Dispensed)"
                    stroke="#475569"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#475569' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

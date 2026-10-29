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
  TrendingUp,
  CreditCard,
  QrCode,
  Building2,
  GitPullRequest,
  CheckCircle2,
  ArrowRight,
  Layers,
  SlidersHorizontal,
  ShieldCheck,
  FileText,
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
import { useAuthStore } from '../../store/authStore';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Topbar } from '../../components/ui/Topbar';
import { UserRole } from '../../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const role: UserRole = user?.role || 'PHARMACIST';

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000,
  });

  // Payment modes data for Billing Staff chart
  const paymentBreakdownData = [
    { mode: 'Cash', amount: stats?.today_cash_total || 0 },
    { mode: 'UPI / QR', amount: stats?.today_upi_total || 0 },
    { mode: 'Card', amount: stats?.today_card_total || 0 },
    { mode: 'Insurance', amount: stats?.today_insurance_total || 0 },
  ];

  // ==========================================
  // 1. BILLING STAFF DASHBOARD
  // ==========================================
  if (role === 'BILLING_STAFF') {
    return (
      <div className="space-y-6">
        <Topbar
          title="Point of Sale (POS) & Cashier Revenue Desk"
          subtitle={`Welcome back, ${user?.full_name || 'Cashier'} • Outpatient and Inpatient checkout, collection breakdown, and invoice reprints`}
          actions={
            <div className="flex items-center gap-2">
              <Link to="/billing/new">
                <Button size="sm" variant="primary">
                  <Receipt className="w-4 h-4 mr-1" /> New Bill (POS)
                </Button>
              </Link>
              <Link to="/billing">
                <Button size="sm" variant="secondary">
                  <FileText className="w-4 h-4 mr-1" /> Bills History
                </Button>
              </Link>
            </div>
          }
        />

        {/* Billing Staff KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Today's Total Sales"
            value={isLoading ? '...' : `₹${(stats?.today_billing_total || 0).toLocaleString('en-IN')}`}
            icon={<DollarSign className="w-5 h-5 text-accent" />}
            subtitle={`${stats?.today_bills_count || 0} bills completed today`}
            variant="default"
          />

          <StatCard
            label="Cash Collections"
            value={isLoading ? '...' : `₹${(stats?.today_cash_total || 0).toLocaleString('en-IN')}`}
            icon={<Receipt className="w-5 h-5 text-accent" />}
            subtitle="Hard currency in cash till"
            variant="default"
          />

          <StatCard
            label="UPI / QR Payments"
            value={isLoading ? '...' : `₹${(stats?.today_upi_total || 0).toLocaleString('en-IN')}`}
            icon={<QrCode className="w-5 h-5 text-accent" />}
            subtitle="Direct digital hospital UPI"
            variant="default"
          />

          <StatCard
            label="Card & Insurance"
            value={
              isLoading
                ? '...'
                : `₹${((stats?.today_card_total || 0) + (stats?.today_insurance_total || 0)).toLocaleString('en-IN')}`
            }
            icon={<CreditCard className="w-5 h-5 text-accent" />}
            subtitle={`Card: ₹${(stats?.today_card_total || 0).toLocaleString('en-IN')} | TPA: ₹${(stats?.today_insurance_total || 0).toLocaleString('en-IN')}`}
            variant="default"
          />
        </div>

        {/* Additional Billing Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Invoices Dispensed"
            value={isLoading ? '...' : stats?.today_bills_count || 0}
            icon={<CheckCircle2 className="w-5 h-5 text-accent" />}
            subtitle="Total patient transactions today"
            variant="default"
          />

          <StatCard
            label="Average Bill Value"
            value={
              isLoading
                ? '...'
                : stats?.today_bills_count
                ? `₹${Math.round((stats?.today_billing_total || 0) / stats.today_bills_count).toLocaleString('en-IN')}`
                : '₹0'
            }
            icon={<TrendingUp className="w-5 h-5 text-accent" />}
            subtitle="Per patient ticket size"
            variant="default"
          />

          <div className="bg-white border border-border rounded-md p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Fast POS Actions</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Link
                  to="/billing/new"
                  className="text-xs font-medium p-2 bg-accent text-white rounded hover:bg-teal-700 text-center font-semibold"
                >
                  + New Bill (POS)
                </Link>
                <Link
                  to="/billing"
                  className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center"
                >
                  Search Invoices
                </Link>
                <Link
                  to="/inventory/medicines"
                  className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center col-span-2"
                >
                  Check Medicine Stock & Prices
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Collection Breakdown & Recent Bills */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Method Distribution Chart */}
          <Card
            title="Today's Revenue by Payment Mode"
            subtitle="Distribution of collections across tender types"
            className="lg:col-span-1"
          >
            <div className="h-64 w-full pt-4">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-text-secondary text-xs">
                  Loading collections...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="mode" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="amount" name="Collected (₹)" fill="#0D9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Recent Invoices Feed */}
          <Card
            title="Recent Patient Invoices & Receipts"
            subtitle="Latest dispensing records with 10-digit mobile number and payment verification"
            action={
              <Link to="/billing">
                <Button size="sm" variant="ghost">
                  View All Bills <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            }
            className="lg:col-span-2"
          >
            <div className="overflow-x-auto">
              {!stats?.recent_bills?.length ? (
                <div className="py-8 text-center text-xs text-text-secondary">
                  No billing transactions logged today yet. Click "New Bill (POS)" to start dispensing.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-text-secondary font-medium">
                      <th className="py-2.5 px-3">Bill Number</th>
                      <th className="py-2.5 px-3">Patient Name</th>
                      <th className="py-2.5 px-3">Mobile No</th>
                      <th className="py-2.5 px-3">Tender Mode</th>
                      <th className="py-2.5 px-3 text-right">Net Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.recent_bills.map((b) => (
                      <tr key={b.id} className="hover:bg-surface/50">
                        <td className="py-2.5 px-3 font-semibold text-accent">{b.bill_number}</td>
                        <td className="py-2.5 px-3 text-text-primary font-medium">{b.patient_name}</td>
                        <td className="py-2.5 px-3 text-text-secondary font-mono">{b.patient_phone || '-'}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant="neutral" size="sm">
                            {b.payment_mode}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-text-primary">
                          ₹{b.net_amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            variant={b.payment_status === 'PAID' ? 'success' : 'danger'}
                            size="sm"
                          >
                            {b.payment_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. PHARMACIST DASHBOARD
  // ==========================================
  if (role === 'PHARMACIST') {
    return (
      <div className="space-y-6">
        <Topbar
          title="Pharmacy Dispensary & FEFO Inventory Control"
          subtitle={`Welcome back, ${user?.full_name || 'Pharmacist'} • Priority FEFO candidate batches, shelf life expiry monitoring, and ward dispensing`}
          actions={
            <div className="flex items-center gap-2">
              <Link to="/inventory/adjustments">
                <Button size="sm" variant="secondary">
                  <SlidersHorizontal className="w-4 h-4 mr-1" /> Stock Adjust
                </Button>
              </Link>
              <Link to="/inventory/batches">
                <Button size="sm" variant="primary">
                  <Layers className="w-4 h-4 mr-1" /> Batches & FEFO
                </Button>
              </Link>
            </div>
          }
        />

        {/* Pharmacist Critical KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Low Stock Alerts"
            value={isLoading ? '...' : stats?.low_stock_count || 0}
            icon={<AlertTriangle className="w-5 h-5 text-warning" />}
            subtitle="At or below reorder threshold"
            variant="warning"
          />

          <StatCard
            label="Expiring Soon (<= 30d)"
            value={isLoading ? '...' : stats?.expiring_soon_count || 0}
            icon={<Clock className="w-5 h-5 text-warning" />}
            subtitle="Priority FEFO candidates"
            variant="warning"
          />

          <StatCard
            label="Expired Batches"
            value={isLoading ? '...' : stats?.expired_count || 0}
            icon={<Ban className="w-5 h-5 text-danger" />}
            subtitle="Quarantine / write-off required"
            variant="danger"
          />

          <StatCard
            label="Pending Ward Requisitions"
            value={isLoading ? '...' : stats?.pending_department_issues || 0}
            icon={<GitPullRequest className="w-5 h-5 text-accent" />}
            subtitle="Clinical wards awaiting drug issue"
            variant="default"
          />

          <StatCard
            label="Active Medicine Catalog"
            value={isLoading ? '...' : stats?.total_active_medicines || 0}
            icon={<Pill className="w-5 h-5 text-accent" />}
            subtitle="Approved hospital formulary items"
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
            label="Awaiting Goods Receipt"
            value={isLoading ? '...' : stats?.pending_purchase_orders || 0}
            icon={<ShoppingCart className="w-5 h-5 text-accent" />}
            subtitle="Purchase orders pending delivery"
            variant="default"
          />

          <div className="bg-white border border-border rounded-md p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Dispensary Quick Links</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Link to="/inventory/medicines" className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center">
                  + Add Medicine
                </Link>
                <Link to="/inventory/adjustments" className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center">
                  Stock Adjust
                </Link>
                <Link to="/departments/issues" className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center">
                  Issue to Ward
                </Link>
                <Link to="/purchase/orders" className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center">
                  Receive PO
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Pharmacist Actionable Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Batches Expiring in <= 30 Days */}
          <Card
            title="Candidate Batches Expiring in <= 30 Days"
            subtitle="Action required: Prioritize in FEFO dispensing or initiate supplier return"
            action={
              <Link to="/inventory/batches">
                <Button size="sm" variant="ghost">
                  All Batches <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            }
          >
            <div className="overflow-x-auto">
              {!stats?.expiring_batches_list?.length ? (
                <div className="py-8 text-center text-xs text-text-secondary">
                  No batches expiring within the next 30 days. Stock shelf-life is healthy.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-text-secondary font-medium">
                      <th className="py-2.5 px-2">Batch #</th>
                      <th className="py-2.5 px-2">Medicine</th>
                      <th className="py-2.5 px-2 text-right">Available</th>
                      <th className="py-2.5 px-2">Expiry Date</th>
                      <th className="py-2.5 px-2 text-center">Shelf Life</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.expiring_batches_list.map((b) => (
                      <tr key={b.id} className="hover:bg-surface/50">
                        <td className="py-2 px-2 font-mono font-semibold text-text-primary">{b.batch_number}</td>
                        <td className="py-2 px-2 font-medium text-text-primary">{b.medicine_name}</td>
                        <td className="py-2 px-2 text-right font-bold">{b.quantity_available} units</td>
                        <td className="py-2 px-2 text-text-secondary">{b.expiry_date}</td>
                        <td className="py-2 px-2 text-center">
                          <Badge
                            variant={b.days_to_expiry <= 7 ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {b.days_to_expiry <= 0 ? 'Expired' : `${b.days_to_expiry}d left`}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* Low Stock Watchlist */}
          <Card
            title="Critical Low Stock Medicines Watchlist"
            subtitle="Items at or below reorder level requiring immediate purchase replenishment"
            action={
              <Link to="/purchase/orders">
                <Button size="sm" variant="ghost">
                  Create PO <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            }
          >
            <div className="overflow-x-auto">
              {!stats?.low_stock_medicines?.length ? (
                <div className="py-8 text-center text-xs text-text-secondary">
                  All active catalog items are adequately stocked above reorder thresholds.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-text-secondary font-medium">
                      <th className="py-2.5 px-2">Medicine Name</th>
                      <th className="py-2.5 px-2">Category</th>
                      <th className="py-2.5 px-2 text-right">Stock</th>
                      <th className="py-2.5 px-2 text-right">Reorder Level</th>
                      <th className="py-2.5 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.low_stock_medicines.map((m) => (
                      <tr key={m.id} className="hover:bg-surface/50">
                        <td className="py-2 px-2 font-medium text-text-primary">{m.name}</td>
                        <td className="py-2 px-2 text-text-secondary">{m.category}</td>
                        <td className="py-2 px-2 text-right font-bold text-danger">
                          {m.current_stock}
                        </td>
                        <td className="py-2 px-2 text-right text-text-secondary">{m.reorder_level}</td>
                        <td className="py-2 px-2 text-center">
                          <Badge variant="warning" size="sm">
                            Low Stock
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>

        {/* 7-Day Stock In vs Out Line Chart */}
        <Card
          title="Stock Movement Velocity (Last 7 Days)"
          subtitle="Units received from suppliers vs units dispensed to patients and clinical wards"
        >
          <div className="h-64 w-full pt-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-xs">
                Loading movements...
              </div>
            ) : !stats?.stock_trends?.length ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-xs">
                No movements logged
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
                    }}
                  />
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
    );
  }

  // ==========================================
  // 3. DEPT STAFF (NURSE / WARD) DASHBOARD
  // ==========================================
  if (role === 'DEPT_STAFF') {
    return (
      <div className="space-y-6">
        <Topbar
          title="Ward Drug Requisitions & Clinical Supply Portal"
          subtitle={`Welcome back, ${user?.full_name || 'Department Staff'} • Request patient medications, track ward supply orders, and monitor fulfillment`}
          actions={
            <div className="flex items-center gap-2">
              <Link to="/departments/issues">
                <Button size="sm" variant="primary">
                  <GitPullRequest className="w-4 h-4 mr-1" /> New Ward Requisition
                </Button>
              </Link>
              <Link to="/departments">
                <Button size="sm" variant="secondary">
                  <Building2 className="w-4 h-4 mr-1" /> Departments
                </Button>
              </Link>
            </div>
          }
        />

        {/* Dept Staff KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pending Requisitions"
            value={isLoading ? '...' : stats?.pending_department_issues || 0}
            icon={<Clock className="w-5 h-5 text-warning" />}
            subtitle="Awaiting pharmacy pharmacist review"
            variant="warning"
          />

          <StatCard
            label="Approved Requisitions"
            value={isLoading ? '...' : stats?.approved_department_issues || 0}
            icon={<CheckCircle2 className="w-5 h-5 text-accent" />}
            subtitle="Approved & ready for ward handover"
            variant="default"
          />

          <StatCard
            label="Fulfilled & Issued"
            value={isLoading ? '...' : stats?.issued_department_issues || 0}
            icon={<Building2 className="w-5 h-5 text-accent" />}
            subtitle="Completed ward drug deliveries"
            variant="default"
          />

          <StatCard
            label="Hospital Formulary"
            value={isLoading ? '...' : stats?.total_active_medicines || 0}
            icon={<Pill className="w-5 h-5 text-accent" />}
            subtitle="Available medicines for requisition"
            variant="default"
          />
        </div>

        {/* Requisitions Status Tracker Table */}
        <Card
          title="Recent Department Requisitions Tracking"
          subtitle="Real-time status of clinical medication requests sent to the central pharmacy"
          action={
            <Link to="/departments/issues">
              <Button size="sm" variant="ghost">
                View All Requisitions <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          }
        >
          <div className="overflow-x-auto">
            {!stats?.recent_requisitions?.length ? (
              <div className="py-8 text-center text-xs text-text-secondary">
                No ward requisitions filed yet. Click "New Ward Requisition" to request drug stock.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-secondary font-medium">
                    <th className="py-2.5 px-3">Requisition #</th>
                    <th className="py-2.5 px-3">Ward / Department</th>
                    <th className="py-2.5 px-3">Requested By</th>
                    <th className="py-2.5 px-3 text-center">Items Count</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Fulfillment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recent_requisitions.map((req) => (
                    <tr key={req.id} className="hover:bg-surface/50">
                      <td className="py-2.5 px-3 font-semibold text-accent">{req.issue_number}</td>
                      <td className="py-2.5 px-3 font-medium text-text-primary">{req.department_name}</td>
                      <td className="py-2.5 px-3 text-text-secondary">{req.requested_by}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{req.items_count} items</td>
                      <td className="py-2.5 px-3 text-text-secondary">
                        {new Date(req.issue_date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant={
                            req.status === 'ISSUED'
                              ? 'success'
                              : req.status === 'APPROVED'
                              ? 'accent'
                              : req.status === 'CANCELLED'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {req.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Department Consumption Overview */}
        <Card
          title="Top Departments by Medication Consumption"
          subtitle="Total units issued across hospital wards and specialized departments"
        >
          <div className="h-64 w-full pt-4">
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
                    }}
                  />
                  <Bar dataKey="units_consumed" name="Units Consumed" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // ==========================================
  // 4. ADMIN DASHBOARD (DEFAULT / EXECUTIVE)
  // ==========================================
  return (
    <div className="space-y-6">
      <Topbar
        title="Executive Pharmacy Operations & Governance Dashboard"
        subtitle={`Welcome back, ${user?.full_name || 'Administrator'} • Complete real-time stock valuation, audit ledger, and departmental consumption`}
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
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Executive Direct Actions</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link to="/inventory/medicines" className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center">
                + Add Medicine
              </Link>
              <Link to="/inventory/adjustments" className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center">
                Stock Adjust
              </Link>
              <Link to="/departments/issues" className="text-xs font-medium p-2 border border-border rounded hover:bg-surface text-center">
                Dept Requisitions
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
                    }}
                  />
                  <Bar dataKey="units_consumed" name="Units Consumed" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

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
                    }}
                  />
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

      {/* Admin Executive Summary Table Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card
          title="Recent Pharmacy Invoices"
          subtitle="Latest patient bills processed at POS counters"
          action={
            <Link to="/billing">
              <Button size="sm" variant="ghost">
                All Bills <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          }
        >
          <div className="overflow-x-auto">
            {!stats?.recent_bills?.length ? (
              <div className="py-6 text-center text-xs text-text-secondary">No invoices recorded today yet.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-secondary font-medium">
                    <th className="py-2 px-2">Bill #</th>
                    <th className="py-2 px-2">Patient</th>
                    <th className="py-2 px-2">Phone</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                    <th className="py-2 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recent_bills.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-surface/50">
                      <td className="py-2 px-2 font-semibold text-accent">{b.bill_number}</td>
                      <td className="py-2 px-2 text-text-primary">{b.patient_name}</td>
                      <td className="py-2 px-2 text-text-secondary font-mono">{b.patient_phone || '-'}</td>
                      <td className="py-2 px-2 text-right font-bold">₹{b.net_amount.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge variant={b.payment_status === 'PAID' ? 'success' : 'danger'} size="sm">
                          {b.payment_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Recent Department Requisitions */}
        <Card
          title="Recent Ward Drug Requisitions"
          subtitle="Latest medication requests from hospital clinical units"
          action={
            <Link to="/departments/issues">
              <Button size="sm" variant="ghost">
                All Requisitions <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          }
        >
          <div className="overflow-x-auto">
            {!stats?.recent_requisitions?.length ? (
              <div className="py-6 text-center text-xs text-text-secondary">No requisitions recorded yet.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-secondary font-medium">
                    <th className="py-2 px-2">Issue #</th>
                    <th className="py-2 px-2">Department</th>
                    <th className="py-2 px-2">Requested By</th>
                    <th className="py-2 px-2 text-center">Items</th>
                    <th className="py-2 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recent_requisitions.slice(0, 5).map((req) => (
                    <tr key={req.id} className="hover:bg-surface/50">
                      <td className="py-2 px-2 font-semibold text-accent">{req.issue_number}</td>
                      <td className="py-2 px-2 text-text-primary">{req.department_name}</td>
                      <td className="py-2 px-2 text-text-secondary">{req.requested_by}</td>
                      <td className="py-2 px-2 text-center font-bold">{req.items_count}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge
                          variant={
                            req.status === 'ISSUED'
                              ? 'success'
                              : req.status === 'APPROVED'
                              ? 'accent'
                              : req.status === 'CANCELLED'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {req.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Filter, Calendar, BarChart3, Clock, Receipt, ShoppingCart, GitPullRequest, Layers } from 'lucide-react';
import { reportsApi } from '../../api/reports';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { Topbar } from '../../components/ui/Topbar';
import {
  StockReportItem,
  ExpiryReportItem,
  SalesReportItem,
  PurchaseReportItem,
  ConsumptionReportItem,
  StockMovementLedgerItem,
} from '../../types';

export const ReportsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'expiry' | 'sales' | 'purchase' | 'consumption' | 'ledger'>('stock');

  // Filters
  const [expiryDays, setExpiryDays] = useState<number>(90);
  const [salesStart, setSalesStart] = useState<string>('');
  const [salesEnd, setSalesEnd] = useState<string>('');

  // Queries
  const { data: stockData, isLoading: isStockLoading } = useQuery({
    queryKey: ['report-stock'],
    queryFn: () => reportsApi.getStockReport(),
    enabled: activeTab === 'stock',
  });

  const { data: expiryData, isLoading: isExpiryLoading } = useQuery({
    queryKey: ['report-expiry', expiryDays],
    queryFn: () => reportsApi.getExpiryReport({ days_window: expiryDays }),
    enabled: activeTab === 'expiry',
  });

  const { data: salesData, isLoading: isSalesLoading } = useQuery({
    queryKey: ['report-sales', salesStart, salesEnd],
    queryFn: () => reportsApi.getSalesReport({ start_date: salesStart || undefined, end_date: salesEnd || undefined }),
    enabled: activeTab === 'sales',
  });

  const { data: purchaseData, isLoading: isPurchaseLoading } = useQuery({
    queryKey: ['report-purchase'],
    queryFn: () => reportsApi.getPurchaseReport(),
    enabled: activeTab === 'purchase',
  });

  const { data: consumptionData, isLoading: isConsumptionLoading } = useQuery({
    queryKey: ['report-consumption'],
    queryFn: () => reportsApi.getConsumptionReport(),
    enabled: activeTab === 'consumption',
  });

  const { data: ledgerData, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['report-ledger'],
    queryFn: () => reportsApi.getLedger({ limit: 100 }),
    enabled: activeTab === 'ledger',
  });

  const tabsConfig = [
    { id: 'stock', label: 'Current Stock', icon: <Layers className="w-4 h-4" /> },
    { id: 'expiry', label: 'Expiry Alerts', icon: <Clock className="w-4 h-4" /> },
    { id: 'sales', label: 'Sales & Billing', icon: <Receipt className="w-4 h-4" /> },
    { id: 'purchase', label: 'Procurement', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'consumption', label: 'Dept Consumption', icon: <GitPullRequest className="w-4 h-4" /> },
    { id: 'ledger', label: 'Stock Movement Ledger', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  // CSV download helper
  const handleExportCsv = () => {
    let url = '';
    if (activeTab === 'stock') url = reportsApi.exportCsvUrl('stock');
    if (activeTab === 'expiry') url = reportsApi.exportCsvUrl('expiry', { days_window: expiryDays });
    if (activeTab === 'sales') url = reportsApi.exportCsvUrl('sales', { start_date: salesStart, end_date: salesEnd });
    if (activeTab === 'purchase') url = reportsApi.exportCsvUrl('purchase');
    if (activeTab === 'consumption') url = reportsApi.exportCsvUrl('consumption');
    if (activeTab === 'ledger') url = reportsApi.exportCsvUrl('ledger');

    if (url) {
      window.open(url, '_blank');
    }
  };

  // Stock Columns
  const stockColumns: Column<StockReportItem>[] = [
    { key: 'medicine_name', header: 'Medicine', render: (i) => <span className="font-semibold text-text-primary">{i.medicine_name}</span> },
    { key: 'generic_name', header: 'Generic Name', render: (i) => <span className="text-text-secondary text-xs">{i.generic_name}</span> },
    { key: 'category', header: 'Category', render: (i) => <Badge variant="neutral" size="sm">{i.category}</Badge> },
    { key: 'batch_number', header: 'Batch', render: (i) => <span className="font-mono text-xs">{i.batch_number}</span> },
    { key: 'quantity_available', header: 'Available Qty', render: (i) => <span className="font-mono font-bold text-accent">{i.quantity_available} {i.unit}s</span> },
    { key: 'unit_cost_price', header: 'Cost Price', render: (i) => <span className="font-mono text-xs">₹{i.unit_cost_price.toFixed(2)}</span> },
    { key: 'mrp', header: 'MRP', render: (i) => <span className="font-mono text-xs font-semibold">₹{i.mrp.toFixed(2)}</span> },
    { key: 'total_cost_value', header: 'Total Value (Cost)', render: (i) => <span className="font-mono text-xs font-bold text-text-primary">₹{i.total_cost_value.toFixed(2)}</span> },
    { key: 'expiry_date', header: 'Expiry Date', render: (i) => <span className="font-mono text-xs">{i.expiry_date}</span> },
  ];

  // Expiry Columns
  const expiryColumns: Column<ExpiryReportItem>[] = [
    { key: 'medicine_name', header: 'Medicine', render: (i) => <span className="font-semibold text-text-primary">{i.medicine_name}</span> },
    { key: 'category', header: 'Category', render: (i) => <Badge variant="neutral" size="sm">{i.category}</Badge> },
    { key: 'batch_number', header: 'Batch #', render: (i) => <span className="font-mono text-xs">{i.batch_number}</span> },
    { key: 'quantity_available', header: 'Units at Risk', render: (i) => <span className="font-mono font-bold text-danger">{i.quantity_available}</span> },
    { key: 'expiry_date', header: 'Expiry Date', render: (i) => <span className="font-mono text-xs">{i.expiry_date}</span> },
    {
      key: 'days_to_expiry',
      header: 'Days Remaining',
      render: (i) => (
        <span className={`font-mono font-semibold text-xs ${i.days_to_expiry < 0 ? 'text-danger' : 'text-warning'}`}>
          {i.days_to_expiry < 0 ? `${Math.abs(i.days_to_expiry)} days ago (EXPIRED)` : `${i.days_to_expiry} days`}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Alert Level',
      render: (i) => {
        if (i.status === 'EXPIRED') return <Badge variant="danger" size="sm">Expired</Badge>;
        if (i.status === 'EXPIRING_30') return <Badge variant="danger" size="sm">Critical (≤30d)</Badge>;
        if (i.status === 'EXPIRING_60') return <Badge variant="warning" size="sm">Warning (≤60d)</Badge>;
        return <Badge variant="neutral" size="sm">Watchlist (≤90d)</Badge>;
      },
    },
  ];

  // Sales Columns
  const salesColumns: Column<SalesReportItem>[] = [
    { key: 'bill_number', header: 'Bill #', render: (i) => <span className="font-mono font-bold text-text-primary">{i.bill_number}</span> },
    { key: 'bill_date', header: 'Timestamp', render: (i) => <span className="text-xs text-text-secondary">{new Date(i.bill_date).toLocaleDateString()}</span> },
    { key: 'patient_name', header: 'Patient (UHID)', render: (i) => <div><span className="font-medium text-text-primary block">{i.patient_name}</span><span className="font-mono text-[11px] text-text-secondary">{i.patient_uhid}</span></div> },
    { key: 'payment_mode', header: 'Payment Mode', render: (i) => <Badge variant="neutral" size="sm">{i.payment_mode}</Badge> },
    { key: 'payment_status', header: 'Status', render: (i) => <Badge variant={i.payment_status === 'PAID' ? 'success' : 'danger'} size="sm">{i.payment_status}</Badge> },
    { key: 'subtotal', header: 'Subtotal', render: (i) => <span className="font-mono text-xs">₹{i.subtotal.toFixed(2)}</span> },
    { key: 'net_amount', header: 'Net Amount', render: (i) => <span className="font-mono font-bold text-accent text-xs">₹{i.net_amount.toFixed(2)}</span> },
  ];

  // Purchase Columns
  const purchaseColumns: Column<PurchaseReportItem>[] = [
    { key: 'po_number', header: 'PO #', render: (i) => <span className="font-mono font-bold text-text-primary">{i.po_number}</span> },
    { key: 'supplier_name', header: 'Supplier', render: (i) => <span className="font-medium text-text-primary">{i.supplier_name}</span> },
    { key: 'order_date', header: 'Order Date', render: (i) => <span className="font-mono text-xs">{i.order_date}</span> },
    { key: 'status', header: 'Status', render: (i) => <Badge variant="accent" size="sm">{i.status}</Badge> },
    { key: 'items_count', header: 'Items (Recv / Ord)', render: (i) => <span className="font-mono text-xs">{i.received_items_count} / {i.items_count}</span> },
    { key: 'total_amount', header: 'Total Value', render: (i) => <span className="font-mono font-bold text-xs text-text-primary">₹{i.total_amount.toFixed(2)}</span> },
  ];

  // Consumption Columns
  const consumptionColumns: Column<ConsumptionReportItem>[] = [
    { key: 'department_name', header: 'Department', render: (i) => <span className="font-semibold text-text-primary">{i.department_name}</span> },
    { key: 'medicine_name', header: 'Medicine', render: (i) => <span className="text-text-primary font-medium">{i.medicine_name}</span> },
    { key: 'category', header: 'Category', render: (i) => <Badge variant="neutral" size="sm">{i.category}</Badge> },
    { key: 'total_quantity_issued', header: 'Units Consumed', render: (i) => <span className="font-mono font-bold text-accent">{i.total_quantity_issued}</span> },
    { key: 'issues_count', header: 'Requisitions Count', render: (i) => <span className="font-mono text-xs">{i.issues_count} times</span> },
  ];

  // Movement Ledger Columns
  const ledgerColumns: Column<StockMovementLedgerItem>[] = [
    {
      key: 'timestamp',
      header: 'Date & Time',
      render: (i) => (
        <div>
          <span className="font-mono text-xs block text-text-primary">{new Date(i.timestamp).toLocaleDateString()}</span>
          <span className="text-[11px] text-text-secondary">{new Date(i.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      ),
    },
    {
      key: 'movement_type',
      header: 'Movement Type',
      render: (i) => {
        if (i.movement_type === 'PURCHASE_RECEIPT') return <Badge variant="accent" size="sm">Goods Receipt (IN)</Badge>;
        if (i.movement_type === 'PATIENT_SALE') return <Badge variant="success" size="sm">Patient Sale (OUT)</Badge>;
        if (i.movement_type === 'DEPT_ISSUE') return <Badge variant="neutral" size="sm">Dept Issue (OUT)</Badge>;
        if (i.movement_type === 'REFUND_RESTORE') return <Badge variant="warning" size="sm">Refund Return (IN)</Badge>;
        return <Badge variant="danger" size="sm">{i.movement_type}</Badge>;
      },
    },
    { key: 'medicine_name', header: 'Medicine', render: (i) => <span className="font-semibold text-text-primary">{i.medicine_name}</span> },
    { key: 'batch_number', header: 'Batch #', render: (i) => <span className="font-mono text-xs">{i.batch_number}</span> },
    {
      key: 'quantity_in',
      header: 'In / Out',
      render: (i) => (
        <span className={`font-mono font-bold text-xs ${i.quantity_in > 0 ? 'text-success' : 'text-danger'}`}>
          {i.quantity_in > 0 ? `+${i.quantity_in}` : `-${i.quantity_out}`}
        </span>
      ),
    },
    { key: 'reference_id', header: 'Reference', render: (i) => <span className="font-mono text-xs font-medium">{i.reference_id}</span> },
    { key: 'performed_by', header: 'User / Source', render: (i) => <span className="text-xs text-text-secondary">{i.performed_by || '-'}</span> },
  ];

  return (
    <div className="space-y-4">
      <Topbar
        title="Hospital Pharmacy Analytics & Audit Reports"
        subtitle="Filterable clinical stock reports, regulatory expiry logs, sales, and movement audit trail"
        actions={
          <Button size="sm" variant="secondary" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-1.5" /> Export Report (CSV)
          </Button>
        }
      />

      {/* Tabs Row */}
      <Tabs
        tabs={tabsConfig}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* Active Tab Filter Bar */}
      {activeTab === 'expiry' && (
        <div className="p-3 bg-white border border-border rounded flex items-center gap-3">
          <span className="text-xs font-medium text-text-secondary">Expiry Window:</span>
          <div className="flex items-center gap-1.5">
            {[30, 60, 90, 180].map((days) => (
              <button
                key={days}
                onClick={() => setExpiryDays(days)}
                className={`px-3 py-1 text-xs rounded border transition-colors select-none ${
                  expiryDays === days
                    ? 'bg-accent-soft text-accent border-accent font-semibold'
                    : 'bg-white text-text-secondary border-border hover:bg-surface'
                }`}
              >
                Within {days} Days
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="p-3 bg-white border border-border rounded flex flex-col sm:flex-row items-center gap-3">
          <span className="text-xs font-medium text-text-secondary">Date Filter:</span>
          <Input
            type="date"
            label="Start Date"
            value={salesStart}
            onChange={(e) => setSalesStart(e.target.value)}
            className="w-40"
          />
          <Input
            type="date"
            label="End Date"
            value={salesEnd}
            onChange={(e) => setSalesEnd(e.target.value)}
            className="w-40"
          />
        </div>
      )}

      {/* Report Data Tables */}
      {activeTab === 'stock' && (
        <Table
          columns={stockColumns}
          data={stockData || []}
          keyExtractor={(item) => `${item.medicine_id}-${item.batch_number}`}
          isLoading={isStockLoading}
          emptyMessage="No stock inventory available."
        />
      )}

      {activeTab === 'expiry' && (
        <Table
          columns={expiryColumns}
          data={expiryData || []}
          keyExtractor={(item) => `${item.medicine_id}-${item.batch_number}`}
          isLoading={isExpiryLoading}
          emptyMessage="No batches nearing expiry within selected timeframe."
        />
      )}

      {activeTab === 'sales' && (
        <Table
          columns={salesColumns}
          data={salesData || []}
          keyExtractor={(item) => item.bill_id}
          isLoading={isSalesLoading}
          emptyMessage="No sales transactions recorded in selected window."
        />
      )}

      {activeTab === 'purchase' && (
        <Table
          columns={purchaseColumns}
          data={purchaseData || []}
          keyExtractor={(item) => item.po_id}
          isLoading={isPurchaseLoading}
          emptyMessage="No procurement orders recorded."
        />
      )}

      {activeTab === 'consumption' && (
        <Table
          columns={consumptionColumns}
          data={consumptionData || []}
          keyExtractor={(item) => `${item.department_id}-${item.medicine_name}`}
          isLoading={isConsumptionLoading}
          emptyMessage="No department consumption recorded."
        />
      )}

      {activeTab === 'ledger' && (
        <Table
          columns={ledgerColumns}
          data={ledgerData || []}
          keyExtractor={(item) => item.id}
          isLoading={isLedgerLoading}
          emptyMessage="No stock ledger movements logged."
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Printer, RotateCcw, Eye, Receipt } from 'lucide-react';
import { billsApi } from '../../api/bills';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { BillPrintModal } from './BillPrintModal';
import { Topbar } from '../../components/ui/Topbar';
import { Bill, PaymentStatus } from '../../types';

export const BillList: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');

  const [selectedBillForPrint, setSelectedBillForPrint] = useState<Bill | null>(null);
  const [billToRefund, setBillToRefund] = useState<Bill | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bills', page, search, statusFilter],
    queryFn: () =>
      billsApi.list({
        page,
        page_size: 15,
        search: search || undefined,
        payment_status: (statusFilter as PaymentStatus) || undefined,
      }),
  });

  const refundMutation = useMutation({
    mutationFn: (billId: number) => billsApi.refund(billId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setBillToRefund(null);
    },
  });

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success" size="sm">Paid</Badge>;
      case 'REFUNDED':
        return <Badge variant="danger" size="sm">Refunded / Restored</Badge>;
      case 'PENDING':
        return <Badge variant="warning" size="sm">Pending</Badge>;
    }
  };

  const columns: Column<Bill>[] = [
    {
      key: 'bill_number',
      header: 'Bill # & Date',
      render: (b) => (
        <div>
          <span className="font-mono font-bold text-text-primary block">{b.bill_number}</span>
          <span className="text-[11px] text-text-secondary">
            {new Date(b.bill_date).toLocaleDateString()} {new Date(b.bill_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      key: 'patient_name',
      header: 'Patient Details',
      render: (b) => (
        <div>
          <span className="font-semibold text-text-primary block">{b.patient_name || 'Walk-in'}</span>
          <span className="text-xs text-text-secondary font-mono">{b.patient_uhid || '-'}</span>
        </div>
      ),
    },
    {
      key: 'items_count',
      header: 'Medicines',
      render: (b) => (
        <span className="text-xs text-text-secondary">
          {b.items.length} line item(s)
        </span>
      ),
    },
    {
      key: 'payment_mode',
      header: 'Mode',
      render: (b) => (
        <Badge variant="neutral" size="sm">
          {b.payment_mode}
        </Badge>
      ),
    },
    {
      key: 'net_amount',
      header: 'Net Total',
      render: (b) => (
        <span className="font-mono font-bold text-sm text-accent">
          ₹{b.net_amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'payment_status',
      header: 'Status',
      render: (b) => getStatusBadge(b.payment_status),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (b) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedBillForPrint(b)}
            className="py-1 px-2 text-xs border border-border"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" /> Invoice
          </Button>

          {b.payment_status !== 'REFUNDED' && (
            <button
              onClick={() => setBillToRefund(b)}
              title="Void / Refund Bill & Restore Stock"
              className="p-1.5 rounded text-text-secondary hover:text-danger hover:bg-surface-alt transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Topbar
        title="Patient Billing & Sales History"
        subtitle="Comprehensive log of pharmacy dispensing, tax invoices, and stock refunds"
        actions={
          <Link to="/billing/new">
            <Button size="sm" variant="primary">
              <Plus className="w-4 h-4 mr-1" /> New Bill (POS)
            </Button>
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-border rounded-md p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by Bill #, Patient name, UHID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['', 'PAID', 'REFUNDED'] as (PaymentStatus | '')[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors select-none ${
                statusFilter === st
                  ? 'bg-accent-soft text-accent border-accent font-semibold'
                  : 'bg-white text-text-secondary border-border hover:bg-surface'
              }`}
            >
              {st === '' ? 'All Statuses' : st}
            </button>
          ))}
        </div>
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        emptyMessage="No billing records found."
      />

      {data && (
        <Pagination
          currentPage={data.page}
          totalPages={data.total_pages}
          totalItems={data.total}
          pageSize={data.page_size}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* Print Modal */}
      <BillPrintModal
        isOpen={!!selectedBillForPrint}
        onClose={() => setSelectedBillForPrint(null)}
        bill={selectedBillForPrint}
      />

      {/* Refund Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!billToRefund}
        onClose={() => setBillToRefund(null)}
        onConfirm={() => billToRefund && refundMutation.mutate(billToRefund.id)}
        title="Void / Refund Bill & Restore Stock"
        message={`Are you sure you want to void and refund bill '${billToRefund?.bill_number}' for ₹${billToRefund?.net_amount.toFixed(2)}? All dispensed quantities will immediately be restored to their original inventory batches.`}
        confirmLabel="Void & Restore Stock"
        isDestructive={true}
        isLoading={refundMutation.isPending}
      />
    </div>
  );
};

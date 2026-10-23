import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, PackageCheck, Ban, Eye, Truck, ShoppingCart } from 'lucide-react';
import { purchaseOrdersApi } from '../../api/purchaseOrders';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ReceiveGoodsModal } from './ReceiveGoodsModal';
import { Topbar } from '../../components/ui/Topbar';
import { PurchaseOrder, POStatus } from '../../types';

export const PurchaseOrderList: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<POStatus | ''>('');

  const [receiveModalPO, setReceiveModalPO] = useState<PurchaseOrder | null>(null);
  const [viewDetailsPO, setViewDetailsPO] = useState<PurchaseOrder | null>(null);
  const [poToCancel, setPoToCancel] = useState<PurchaseOrder | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page, search, statusFilter],
    queryFn: () =>
      purchaseOrdersApi.list({
        page,
        page_size: 15,
        search: search || undefined,
        status_filter: (statusFilter as POStatus) || undefined,
      }),
  });

  const receiveMutation = useMutation({
    mutationFn: ({ poId, data }: { poId: number; data: any }) =>
      purchaseOrdersApi.receive(poId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setReceiveModalPO(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (poId: number) => purchaseOrdersApi.cancel(poId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setPoToCancel(null);
    },
  });

  const getStatusBadge = (status: POStatus) => {
    switch (status) {
      case 'ORDERED':
        return <Badge variant="accent" size="sm">Ordered</Badge>;
      case 'PARTIALLY_RECEIVED':
        return <Badge variant="warning" size="sm">Partially Received</Badge>;
      case 'RECEIVED':
        return <Badge variant="success" size="sm">Received</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger" size="sm">Cancelled</Badge>;
      case 'DRAFT':
        return <Badge variant="neutral" size="sm">Draft</Badge>;
    }
  };

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'po_number',
      header: 'PO Number & Date',
      render: (po) => (
        <div>
          <span className="font-mono font-bold text-text-primary block">{po.po_number}</span>
          <span className="text-[11px] text-text-secondary">Ordered: {po.order_date}</span>
        </div>
      ),
    },
    {
      key: 'supplier_name',
      header: 'Supplier / Vendor',
      render: (po) => <span className="font-medium text-text-primary">{po.supplier_name}</span>,
    },
    {
      key: 'items_count',
      header: 'Items Progress',
      render: (po) => {
        const totalItems = po.items.length;
        const fullyRecv = po.items.filter((i) => i.quantity_received >= i.quantity_ordered).length;
        return (
          <span className="text-xs text-text-secondary font-mono">
            {fullyRecv} of {totalItems} items received
          </span>
        );
      },
    },
    {
      key: 'total_amount',
      header: 'PO Total Value',
      render: (po) => (
        <span className="font-mono font-semibold text-xs text-text-primary">
          ₹{po.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (po) => getStatusBadge(po.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (po) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setViewDetailsPO(po)}
            title="View Line Items"
            className="p-1 rounded text-text-secondary hover:text-accent hover:bg-surface-alt transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setReceiveModalPO(po)}
              className="py-1 px-2 text-xs"
            >
              <PackageCheck className="w-3.5 h-3.5 mr-1 text-accent" /> Receive Goods
            </Button>
          )}

          {po.status === 'ORDERED' && (
            <button
              onClick={() => setPoToCancel(po)}
              title="Cancel PO"
              className="p-1 rounded text-text-secondary hover:text-danger hover:bg-surface-alt transition-colors"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Topbar
        title="Purchase Orders & Goods Receipt"
        subtitle="Manage pharmaceutical procurement orders, line item tracking, and batch creation on delivery"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/purchase/suppliers">
              <Button size="sm" variant="ghost">
                <Truck className="w-4 h-4 mr-1" /> Suppliers Directory
              </Button>
            </Link>
            <Link to="/purchase/new">
              <Button size="sm" variant="primary">
                <Plus className="w-4 h-4 mr-1" /> New Purchase Order
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-border rounded-md p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search PO # or supplier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] as (POStatus | '')[]).map(
            (st) => (
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
                {st === '' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            )
          )}
        </div>
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        keyExtractor={(po) => po.id}
        isLoading={isLoading}
        emptyMessage="No purchase orders found matching filters."
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

      {/* Receive Goods Modal */}
      <ReceiveGoodsModal
        isOpen={!!receiveModalPO}
        onClose={() => setReceiveModalPO(null)}
        purchaseOrder={receiveModalPO}
        onReceive={async (formData) => {
          if (receiveModalPO) {
            await receiveMutation.mutateAsync({ poId: receiveModalPO.id, data: formData });
          }
        }}
        isLoading={receiveMutation.isPending}
      />

      {/* View PO Details Modal */}
      <Modal
        isOpen={!!viewDetailsPO}
        onClose={() => setViewDetailsPO(null)}
        title={viewDetailsPO ? `Order Details: ${viewDetailsPO.po_number}` : ''}
        subtitle={viewDetailsPO ? `Supplier: ${viewDetailsPO.supplier_name}` : ''}
        maxWidth="lg"
        footer={
          <Button variant="ghost" size="sm" onClick={() => setViewDetailsPO(null)}>
            Close
          </Button>
        }
      >
        {viewDetailsPO && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-surface border border-border rounded text-xs">
              <div>
                <span className="text-text-secondary block">Order Date</span>
                <span className="font-semibold text-text-primary">{viewDetailsPO.order_date}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Expected Date</span>
                <span className="font-semibold text-text-primary">{viewDetailsPO.expected_date || '-'}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Status</span>
                <span className="mt-0.5 inline-block">{getStatusBadge(viewDetailsPO.status)}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Total Amount</span>
                <span className="font-mono font-bold text-accent">₹{viewDetailsPO.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-alt border-b border-border text-text-secondary font-semibold">
                  <tr>
                    <th className="p-2.5">Medicine</th>
                    <th className="p-2.5 text-right">Ordered</th>
                    <th className="p-2.5 text-right">Received</th>
                    <th className="p-2.5 text-right">Unit Cost</th>
                    <th className="p-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {viewDetailsPO.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5 font-medium">{item.medicine_name || `Medicine #${item.medicine_id}`}</td>
                      <td className="p-2.5 text-right font-mono">{item.quantity_ordered}</td>
                      <td className="p-2.5 text-right font-mono font-semibold text-accent">
                        {item.quantity_received}
                      </td>
                      <td className="p-2.5 text-right font-mono">₹{item.unit_price.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-semibold">
                        ₹{(item.quantity_ordered * item.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={!!poToCancel}
        onClose={() => setPoToCancel(null)}
        onConfirm={() => poToCancel && cancelMutation.mutate(poToCancel.id)}
        title="Cancel Purchase Order"
        message={`Are you sure you want to cancel purchase order '${poToCancel?.po_number}'? This action cannot be reversed.`}
        confirmLabel="Cancel Order"
        isDestructive={true}
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
};

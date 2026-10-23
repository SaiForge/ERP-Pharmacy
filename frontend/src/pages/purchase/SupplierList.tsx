import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { suppliersApi } from '../../api/purchaseOrders';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SupplierFormModal } from './SupplierFormModal';
import { Topbar } from '../../components/ui/Topbar';
import { Supplier } from '../../types';

export const SupplierList: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: () => suppliersApi.list({ page, page_size: 15, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Supplier> }) =>
      suppliersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: suppliersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setSupplierToDelete(null);
    },
  });

  const handleCreateOrUpdate = async (formData: any) => {
    if (selectedSupplier) {
      await updateMutation.mutateAsync({ id: selectedSupplier.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier / Firm Name',
      sortable: true,
      render: (s) => (
        <div>
          <span className="font-semibold text-text-primary block">{s.name}</span>
          <span className="text-xs text-text-secondary">Rep: {s.contact_person}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Details',
      render: (s) => (
        <div className="space-y-0.5 text-xs text-text-secondary">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{s.phone}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-slate-400" />
            <span>{s.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'gst_number',
      header: 'GSTIN',
      render: (s) => <span className="font-mono text-xs text-text-secondary">{s.gst_number || '-'}</span>,
    },
    {
      key: 'address',
      header: 'Address',
      render: (s) => (
        <p className="text-xs text-text-secondary line-clamp-1 max-w-xs">{s.address}</p>
      ),
    },
    {
      key: 'total_orders_count',
      header: 'Purchase Orders',
      render: (s) => (
        <Badge variant="neutral" size="sm">
          {s.total_orders_count || 0} orders
        </Badge>
      ),
    },
    {
      key: 'total_spend',
      header: 'Cumulative Spend',
      render: (s) => (
        <span className="font-mono font-semibold text-xs text-text-primary">
          ₹{(s.total_spend || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setSelectedSupplier(s);
              setIsModalOpen(true);
            }}
            title="Edit Supplier"
            className="p-1 rounded text-text-secondary hover:text-accent hover:bg-surface-alt transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSupplierToDelete(s)}
            title="Deactivate Supplier"
            className="p-1 rounded text-text-secondary hover:text-danger hover:bg-surface-alt transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Topbar
        title="Pharmaceutical Suppliers"
        subtitle="Manage vendor profiles, wholesale purchase relationships, and GST registrations"
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setSelectedSupplier(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Supplier
          </Button>
        }
      />

      <div className="bg-white border border-border rounded-md p-4 flex items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by vendor name, representative, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyMessage="No suppliers registered yet."
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

      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={selectedSupplier}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!supplierToDelete}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={() => supplierToDelete && deleteMutation.mutate(supplierToDelete.id)}
        title="Deactivate Supplier"
        message={`Are you sure you want to deactivate '${supplierToDelete?.name}'?`}
        confirmLabel="Deactivate"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

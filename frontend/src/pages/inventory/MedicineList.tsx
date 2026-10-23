import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Layers, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { medicinesApi } from '../../api/medicines';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { MedicineFormModal } from './MedicineFormModal';
import { Medicine } from '../../types';
import { Topbar } from '../../components/ui/Topbar';

export const MedicineList: React.FC = () => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [medicineToDelete, setMedicineToDelete] = useState<Medicine | null>(null);

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['medicines', page, search, category, lowStockOnly],
    queryFn: () =>
      medicinesApi.list({
        page,
        page_size: 15,
        search: search || undefined,
        category: category || undefined,
        low_stock_only: lowStockOnly,
      }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['medicine-categories'],
    queryFn: medicinesApi.getCategories,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: medicinesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Medicine> }) =>
      medicinesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: medicinesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setMedicineToDelete(null);
    },
  });

  const handleCreateOrUpdate = async (formData: any) => {
    if (selectedMedicine) {
      await updateMutation.mutateAsync({ id: selectedMedicine.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const columns: Column<Medicine>[] = [
    {
      key: 'name',
      header: 'Medicine Name & Generic',
      sortable: true,
      render: (m) => (
        <div>
          <span className="font-semibold text-text-primary block">{m.name}</span>
          <span className="text-xs text-text-secondary">{m.generic_name}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (m) => (
        <Badge variant="neutral" size="sm">
          {m.category}
        </Badge>
      ),
    },
    {
      key: 'unit',
      header: 'Form / Unit',
      render: (m) => (
        <span className="text-xs text-text-secondary">
          {m.unit} (pack of {m.pack_size})
        </span>
      ),
    },
    {
      key: 'manufacturer',
      header: 'Manufacturer',
      render: (m) => <span className="text-xs text-text-secondary">{m.manufacturer}</span>,
    },
    {
      key: 'reorder_level',
      header: 'Reorder Lvl',
      render: (m) => <span className="text-xs font-mono">{m.reorder_level}</span>,
    },
    {
      key: 'total_stock',
      header: 'Available Stock',
      render: (m) => {
        const stock = m.total_stock ?? 0;
        const isLow = stock <= m.reorder_level;
        return (
          <div className="flex items-center gap-2">
            <span
              className={`font-mono font-bold text-sm ${
                stock === 0 ? 'text-danger' : isLow ? 'text-warning' : 'text-text-primary'
              }`}
            >
              {stock}
            </span>
            <span className="text-[11px] text-text-secondary">units</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Stock Status',
      render: (m) => {
        const stock = m.total_stock ?? 0;
        if (stock === 0) {
          return <Badge variant="danger" size="sm">Out of Stock</Badge>;
        }
        if (m.is_low_stock) {
          return <Badge variant="warning" size="sm">Low Stock</Badge>;
        }
        if (m.has_expiring_soon) {
          return <Badge variant="warning" size="sm">Expiring ≤30d</Badge>;
        }
        return <Badge variant="success" size="sm">In Stock</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/inventory/batches?medicine_id=${m.id}`}
            title="Inspect Batches"
            className="p-1 rounded text-text-secondary hover:text-accent hover:bg-surface-alt transition-colors"
          >
            <Layers className="w-4 h-4" />
          </Link>
          <button
            onClick={() => {
              setSelectedMedicine(m);
              setIsModalOpen(true);
            }}
            title="Edit Medicine"
            className="p-1 rounded text-text-secondary hover:text-accent hover:bg-surface-alt transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMedicineToDelete(m)}
            title="Deactivate / Delete"
            className="p-1 rounded text-text-secondary hover:text-danger hover:bg-surface-alt transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="space-y-4">
      <Topbar
        title="Medicine Inventory & Catalog"
        subtitle="Formulary master catalog, real-time FEFO stock counts, and reorder levels"
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setSelectedMedicine(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Medicine
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-border rounded-md p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <div className="relative w-full sm:w-80">
            <Input
              placeholder="Search by brand, generic name, category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              options={categoryOptions}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Flat toggle chips */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setLowStockOnly((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors select-none ${
              lowStockOnly
                ? 'bg-warning-soft text-warning border-warning font-semibold'
                : 'bg-white text-text-secondary border-border hover:bg-surface'
            }`}
          >
            Low Stock Only
          </button>
        </div>
      </div>

      {/* Table Container */}
      <Table
        columns={columns}
        data={data?.items || []}
        keyExtractor={(m) => m.id}
        isLoading={isLoading}
        emptyMessage="No medicines found in catalog matching filters."
      />

      {/* Pagination */}
      {data && (
        <Pagination
          currentPage={data.page}
          totalPages={data.total_pages}
          totalItems={data.total}
          pageSize={data.page_size}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* Form Modal */}
      <MedicineFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={selectedMedicine}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!medicineToDelete}
        onClose={() => setMedicineToDelete(null)}
        onConfirm={() => medicineToDelete && deleteMutation.mutate(medicineToDelete.id)}
        title="Deactivate Medicine"
        message={`Are you sure you want to deactivate '${medicineToDelete?.name}'? It will no longer appear in active dispensing search.`}
        confirmLabel="Deactivate"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

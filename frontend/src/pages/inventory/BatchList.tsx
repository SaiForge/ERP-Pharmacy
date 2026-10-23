import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, Search, Layers, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { batchesApi } from '../../api/batches';
import { medicinesApi } from '../../api/medicines';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Topbar } from '../../components/ui/Topbar';
import { Batch } from '../../types';

export const BatchList: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialMedicineId = searchParams.get('medicine_id');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [medicineId, setMedicineId] = useState<number | undefined>(
    initialMedicineId ? Number(initialMedicineId) : undefined
  );
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false);
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);

  // New batch modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [modalMedId, setModalMedId] = useState<number>(0);
  const [qtyReceived, setQtyReceived] = useState<number>(100);
  const [costPrice, setCostPrice] = useState<number>(10);
  const [mrp, setMrp] = useState<number>(15);
  const [mfgDate, setMfgDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expDate, setExpDate] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['batches', page, search, medicineId, expiringSoonOnly, expiredOnly, availableOnly],
    queryFn: () =>
      batchesApi.list({
        page,
        page_size: 15,
        search: search || undefined,
        medicine_id: medicineId,
        expiring_soon_only: expiringSoonOnly,
        expired_only: expiredOnly,
        available_only: availableOnly,
      }),
  });

  const { data: medicinesList } = useQuery({
    queryKey: ['medicines-all-short'],
    queryFn: () => medicinesApi.list({ page: 1, page_size: 100 }),
  });

  const createBatchMutation = useMutation({
    mutationFn: batchesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsModalOpen(false);
      setBatchNumber('');
    },
  });

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMedId || !batchNumber || !expDate) return;
    createBatchMutation.mutate({
      medicine_id: modalMedId,
      batch_number: batchNumber.toUpperCase().trim(),
      quantity_received: qtyReceived,
      quantity_available: qtyReceived,
      unit_cost_price: costPrice,
      mrp: mrp,
      manufacture_date: mfgDate,
      expiry_date: expDate,
    });
  };

  const columns: Column<Batch>[] = [
    {
      key: 'batch_number',
      header: 'Batch Number',
      render: (b) => (
        <div>
          <span className="font-mono font-bold text-text-primary block">{b.batch_number}</span>
          <span className="text-[11px] text-text-secondary">Recv: {b.received_date}</span>
        </div>
      ),
    },
    {
      key: 'medicine_name',
      header: 'Medicine',
      render: (b) => (
        <span className="font-medium text-text-primary">{b.medicine_name || `Med #${b.medicine_id}`}</span>
      ),
    },
    {
      key: 'quantity_available',
      header: 'Stock (Avail / Recv)',
      render: (b) => (
        <div className="font-mono">
          <span className="font-bold text-accent">{b.quantity_available}</span>
          <span className="text-text-secondary text-xs"> / {b.quantity_received}</span>
        </div>
      ),
    },
    {
      key: 'unit_cost_price',
      header: 'Cost Price',
      render: (b) => <span className="font-mono text-xs">₹{b.unit_cost_price.toFixed(2)}</span>,
    },
    {
      key: 'mrp',
      header: 'MRP (Sell Price)',
      render: (b) => <span className="font-mono font-semibold text-xs text-text-primary">₹{b.mrp.toFixed(2)}</span>,
    },
    {
      key: 'expiry_date',
      header: 'Expiry Date',
      render: (b) => {
        const days = b.days_to_expiry ?? 0;
        return (
          <div>
            <span className="font-mono text-xs block">{b.expiry_date}</span>
            <span
              className={`text-[11px] font-medium ${
                days < 0 ? 'text-danger' : days <= 30 ? 'text-warning' : 'text-text-secondary'
              }`}
            >
              {days < 0 ? `${Math.abs(days)}d ago (EXPIRED)` : `${days} days remaining`}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'FEFO Status',
      render: (b) => {
        if (b.is_expired) {
          return <Badge variant="danger" size="sm">Expired</Badge>;
        }
        if (b.is_expiring_soon) {
          return <Badge variant="warning" size="sm">Expiring ≤30d</Badge>;
        }
        return <Badge variant="success" size="sm">FEFO Eligible</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Topbar
        title="Batch Inventory & FEFO Queue"
        subtitle="Earliest-expiry-first-out inventory tracking, batch cost price, and shelf-life monitoring"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/inventory/medicines">
              <Button size="sm" variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-1" /> Medicines
              </Button>
            </Link>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                if (medicinesList?.items?.length) {
                  setModalMedId(medicinesList.items[0].id);
                }
                setIsModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Stock Batch
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="bg-white border border-border rounded-md p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search batch # or medicine..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="w-full sm:w-64">
            <Select
              options={[
                { value: '', label: 'All Medicines' },
                ...(medicinesList?.items || []).map((m) => ({
                  value: m.id,
                  label: m.name,
                })),
              ]}
              value={medicineId || ''}
              onChange={(e) => {
                setMedicineId(e.target.value ? Number(e.target.value) : undefined);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setExpiringSoonOnly((p) => !p)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors select-none ${
              expiringSoonOnly
                ? 'bg-warning-soft text-warning border-warning font-semibold'
                : 'bg-white text-text-secondary border-border hover:bg-surface'
            }`}
          >
            Expiring ≤ 30 Days
          </button>

          <button
            type="button"
            onClick={() => setExpiredOnly((p) => !p)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors select-none ${
              expiredOnly
                ? 'bg-danger-soft text-danger border-danger font-semibold'
                : 'bg-white text-text-secondary border-border hover:bg-surface'
            }`}
          >
            Expired
          </button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={data?.items || []}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        emptyMessage="No batches found matching filter criteria."
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

      {/* Manual Batch Intake Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Stock Batch (Manual Intake)"
        subtitle="Manually intake an unlinked batch into the pharmacy inventory"
        maxWidth="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddBatch}
              isLoading={createBatchMutation.isPending}
            >
              Add Batch
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddBatch} className="space-y-4">
          <Select
            label="Target Medicine"
            required
            options={(medicinesList?.items || []).map((m) => ({
              value: m.id,
              label: `${m.name} (${m.unit})`,
            }))}
            value={modalMedId}
            onChange={(e) => setModalMedId(Number(e.target.value))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Batch Number / Lot #"
              required
              placeholder="e.g. BATCH-2026-X01"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
            />
            <Input
              label="Quantity Received"
              type="number"
              required
              value={qtyReceived}
              onChange={(e) => setQtyReceived(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Unit Cost Price (₹)"
              type="number"
              step="0.01"
              required
              value={costPrice}
              onChange={(e) => setCostPrice(Number(e.target.value))}
            />
            <Input
              label="Unit MRP / Selling Price (₹)"
              type="number"
              step="0.01"
              required
              value={mrp}
              onChange={(e) => setMrp(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Manufacture Date"
              type="date"
              required
              value={mfgDate}
              onChange={(e) => setMfgDate(e.target.value)}
            />
            <Input
              label="Expiry Date"
              type="date"
              required
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

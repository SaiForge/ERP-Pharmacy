import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, SlidersHorizontal, AlertTriangle, FileText } from 'lucide-react';
import { adjustmentsApi, batchesApi } from '../../api/batches';
import { medicinesApi } from '../../api/medicines';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { Topbar } from '../../components/ui/Topbar';
import { StockAdjustment, AdjustmentType } from '../../types';

export const StockAdjustList: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  // New adjustment form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [medicineId, setMedicineId] = useState<number>(0);
  const [batchId, setBatchId] = useState<number>(0);
  const [adjType, setAdjType] = useState<AdjustmentType>('DAMAGE');
  const [qty, setQty] = useState<number>(-1);
  const [reason, setReason] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stock-adjustments', page],
    queryFn: () => adjustmentsApi.list({ page, page_size: 15 }),
  });

  const { data: medicines } = useQuery({
    queryKey: ['medicines-for-adjust'],
    queryFn: () => medicinesApi.list({ page: 1, page_size: 100 }),
  });

  const { data: batches } = useQuery({
    queryKey: ['batches-for-adjust', medicineId],
    queryFn: () => batchesApi.list({ medicine_id: medicineId, available_only: false }),
    enabled: !!medicineId,
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: adjustmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsModalOpen(false);
      setReason('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to submit stock adjustment');
    },
  });

  const handleOpenModal = () => {
    if (medicines?.items?.length) {
      setMedicineId(medicines.items[0].id);
    }
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineId || !batchId || !reason.trim()) {
      setFormError('Please select a medicine, batch, and provide a valid audit reason.');
      return;
    }
    createAdjustmentMutation.mutate({
      medicine_id: medicineId,
      batch_id: batchId,
      adjustment_type: adjType,
      quantity: Number(qty),
      reason: reason.trim(),
    });
  };

  const getAdjustmentBadge = (type: AdjustmentType) => {
    switch (type) {
      case 'DAMAGE':
        return <Badge variant="danger" size="sm">Damaged</Badge>;
      case 'LOSS':
        return <Badge variant="warning" size="sm">Loss / Stolen</Badge>;
      case 'EXPIRED':
        return <Badge variant="danger" size="sm">Expired Write-off</Badge>;
      case 'CORRECTION':
        return <Badge variant="accent" size="sm">Physical Count Audit</Badge>;
    }
  };

  const columns: Column<StockAdjustment>[] = [
    {
      key: 'created_at',
      header: 'Audit Timestamp',
      render: (a) => (
        <div>
          <span className="font-mono text-xs block text-text-primary">
            {new Date(a.created_at).toLocaleDateString()}
          </span>
          <span className="text-[11px] text-text-secondary">
            {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      key: 'medicine_name',
      header: 'Medicine',
      render: (a) => <span className="font-semibold text-text-primary">{a.medicine_name}</span>,
    },
    {
      key: 'batch_number',
      header: 'Batch #',
      render: (a) => <span className="font-mono text-xs">{a.batch_number}</span>,
    },
    {
      key: 'adjustment_type',
      header: 'Adjustment Type',
      render: (a) => getAdjustmentBadge(a.adjustment_type),
    },
    {
      key: 'quantity',
      header: 'Quantity Delta',
      render: (a) => (
        <span
          className={`font-mono font-bold text-sm ${
            a.quantity < 0 ? 'text-danger' : 'text-success'
          }`}
        >
          {a.quantity > 0 ? `+${a.quantity}` : a.quantity}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Audit Trail / Reason',
      render: (a) => <p className="text-xs text-text-secondary line-clamp-2 max-w-md">{a.reason}</p>,
    },
    {
      key: 'adjusted_by_name',
      header: 'Audited By',
      render: (a) => (
        <span className="text-xs text-text-primary font-medium">
          {a.adjusted_by_name || `User #${a.adjusted_by}`}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Topbar
        title="Stock Adjustments & Loss Write-Offs"
        subtitle="Mandatory audit trail for damages, expired discards, loss, and physical inventory reconciliations"
        actions={
          <Button size="sm" variant="primary" onClick={handleOpenModal}>
            <Plus className="w-4 h-4 mr-1" /> New Adjustment
          </Button>
        }
      />

      <Table
        columns={columns}
        data={data?.items || []}
        keyExtractor={(a) => a.id}
        isLoading={isLoading}
        emptyMessage="No stock adjustments recorded yet."
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

      {/* Adjustment Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Stock Adjustment"
        subtitle="Changes immediately alter batch quantity and log an immutable audit trail"
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={createAdjustmentMutation.isPending}
            >
              Confirm Adjustment
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-danger-soft border border-danger/30 rounded text-danger text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Select
            label="Medicine"
            required
            options={(medicines?.items || []).map((m) => ({
              value: m.id,
              label: m.name,
            }))}
            value={medicineId}
            onChange={(e) => {
              setMedicineId(Number(e.target.value));
              setBatchId(0);
            }}
          />

          <Select
            label="Target Batch"
            required
            options={(batches?.items || []).map((b) => ({
              value: b.id,
              label: `${b.batch_number} (Avail: ${b.quantity_available}, Exp: ${b.expiry_date})`,
            }))}
            value={batchId}
            onChange={(e) => setBatchId(Number(e.target.value))}
            placeholder="Select a batch..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Adjustment Reason Category"
              required
              options={[
                { value: 'DAMAGE', label: 'Damage / Broken Vial' },
                { value: 'EXPIRED', label: 'Expired Write-Off' },
                { value: 'LOSS', label: 'Loss / Discrepancy' },
                { value: 'CORRECTION', label: 'Physical Count Reconciliation' },
              ]}
              value={adjType}
              onChange={(e) => setAdjType(e.target.value as AdjustmentType)}
            />

            <Input
              label="Quantity Delta"
              type="number"
              required
              helperText="Negative for deduction (e.g. -5), positive for correction up"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </div>

          <Textarea
            label="Detailed Audit Reason & Staff Notes"
            required
            placeholder="Document incident, supervisor sign-off, or discrepancy reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};

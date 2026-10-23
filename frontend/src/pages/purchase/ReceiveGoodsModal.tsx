import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PurchaseOrder } from '../../types';

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  onReceive: (data: any) => Promise<void>;
  isLoading?: boolean;
}

interface ReceiveLineState {
  item_id: number;
  medicine_name: string;
  quantity_ordered: number;
  already_received: number;
  remaining_expected: number;
  quantity_receiving: number;
  batch_number: string;
  manufacture_date: string;
  expiry_date: string;
  unit_cost_price: number;
  mrp: number;
}

export const ReceiveGoodsModal: React.FC<ReceiveGoodsModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onReceive,
  isLoading = false,
}) => {
  const [lines, setLines] = useState<ReceiveLineState[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (purchaseOrder && isOpen) {
      const today = new Date().toISOString().split('T')[0];
      const initialLines: ReceiveLineState[] = purchaseOrder.items.map((item) => {
        const remaining = item.quantity_ordered - item.quantity_received;
        return {
          item_id: item.id,
          medicine_name: item.medicine_name || `Medicine #${item.medicine_id}`,
          quantity_ordered: item.quantity_ordered,
          already_received: item.quantity_received,
          remaining_expected: remaining,
          quantity_receiving: remaining > 0 ? remaining : 0,
          batch_number: '',
          manufacture_date: today,
          expiry_date: '',
          unit_cost_price: item.unit_price,
          mrp: Number((item.unit_price * 1.5).toFixed(2)),
        };
      });
      setLines(initialLines);
      setError(null);
    }
  }, [purchaseOrder, isOpen]);

  const updateLine = (index: number, field: keyof ReceiveLineState, value: any) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const activeLines = lines.filter((l) => l.quantity_receiving > 0);
    if (!activeLines.length) {
      setError('Please specify a received quantity greater than 0 for at least one item.');
      return;
    }

    for (const line of activeLines) {
      if (!line.batch_number.trim()) {
        setError(`Please provide a Batch Number for ${line.medicine_name}`);
        return;
      }
      if (!line.expiry_date) {
        setError(`Please provide an Expiry Date for ${line.medicine_name}`);
        return;
      }
      if (line.quantity_receiving > line.remaining_expected) {
        setError(`Quantity receiving cannot exceed remaining expected (${line.remaining_expected}) for ${line.medicine_name}`);
        return;
      }
    }

    try {
      await onReceive({
        items: activeLines.map((l) => ({
          item_id: l.item_id,
          quantity_receiving: Number(l.quantity_receiving),
          batch_number: l.batch_number.trim().toUpperCase(),
          manufacture_date: l.manufacture_date,
          expiry_date: l.expiry_date,
          mrp: Number(l.mrp),
          unit_cost_price: Number(l.unit_cost_price),
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record received goods.');
    }
  };

  if (!purchaseOrder) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Receive Goods — ${purchaseOrder.po_number}`}
      subtitle={`Vendor: ${purchaseOrder.supplier_name || 'Supplier'} | Creates batch stock and updates fulfillment status`}
      maxWidth="2xl"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isLoading}>
            Record Goods Receipt & Intake
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-danger-soft border border-danger/30 rounded text-danger text-xs">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {lines.map((line, index) => (
            <div
              key={line.item_id}
              className="p-3.5 border border-border rounded-md bg-surface space-y-3"
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h4 className="font-semibold text-xs text-text-primary">{line.medicine_name}</h4>
                  <span className="text-[11px] text-text-secondary">
                    Ordered: {line.quantity_ordered} | Recv so far: {line.already_received} | Remaining: {line.remaining_expected}
                  </span>
                </div>
              </div>

              {line.remaining_expected > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <Input
                    label="Qty Receiving"
                    type="number"
                    max={line.remaining_expected}
                    min={0}
                    required
                    value={line.quantity_receiving}
                    onChange={(e) => updateLine(index, 'quantity_receiving', Number(e.target.value))}
                  />
                  <Input
                    label="Batch / Lot #"
                    placeholder="BATCH-XXX"
                    required
                    value={line.batch_number}
                    onChange={(e) => updateLine(index, 'batch_number', e.target.value)}
                  />
                  <Input
                    label="Mfg Date"
                    type="date"
                    required
                    value={line.manufacture_date}
                    onChange={(e) => updateLine(index, 'manufacture_date', e.target.value)}
                  />
                  <Input
                    label="Expiry Date"
                    type="date"
                    required
                    value={line.expiry_date}
                    onChange={(e) => updateLine(index, 'expiry_date', e.target.value)}
                  />
                  <Input
                    label="Unit Cost (₹)"
                    type="number"
                    step="0.01"
                    value={line.unit_cost_price}
                    onChange={(e) => updateLine(index, 'unit_cost_price', Number(e.target.value))}
                  />
                  <Input
                    label="Unit MRP (₹)"
                    type="number"
                    step="0.01"
                    required
                    value={line.mrp}
                    onChange={(e) => updateLine(index, 'mrp', Number(e.target.value))}
                  />
                </div>
              ) : (
                <p className="text-xs text-success font-medium">Item completely received.</p>
              )}
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
};

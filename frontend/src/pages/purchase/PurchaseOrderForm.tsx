import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, ShoppingCart } from 'lucide-react';
import { purchaseOrdersApi, suppliersApi } from '../../api/purchaseOrders';
import { medicinesApi } from '../../api/medicines';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Topbar } from '../../components/ui/Topbar';

interface POLineItem {
  medicine_id: number;
  quantity_ordered: number;
  unit_price: number;
}

export const PurchaseOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [supplierId, setSupplierId] = useState<number>(0);
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [items, setItems] = useState<POLineItem[]>([
    { medicine_id: 0, quantity_ordered: 50, unit_price: 10.0 },
  ]);
  const [error, setError] = useState<string | null>(null);

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-select'],
    queryFn: () => suppliersApi.list({ page: 1, page_size: 100 }),
  });

  const { data: medicines } = useQuery({
    queryKey: ['medicines-select'],
    queryFn: () => medicinesApi.list({ page: 1, page_size: 100 }),
  });

  const createPOMutation = useMutation({
    mutationFn: purchaseOrdersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      navigate('/purchase/orders');
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to generate purchase order');
    },
  });

  const addItemRow = () => {
    setItems((prev) => [...prev, { medicine_id: 0, quantity_ordered: 50, unit_price: 10.0 }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof POLineItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const calculateSubtotal = () => {
    return items.reduce((acc, curr) => acc + (curr.quantity_ordered || 0) * (curr.unit_price || 0), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError('Please select a supplier for this order.');
      return;
    }

    const invalidItems = items.some((i) => !i.medicine_id || i.quantity_ordered <= 0);
    if (invalidItems) {
      setError('Please select valid medicines and quantities for all lines.');
      return;
    }

    createPOMutation.mutate({
      supplier_id: supplierId,
      order_date: orderDate,
      expected_date: expectedDate || null,
      items: items.map((i) => ({
        medicine_id: Number(i.medicine_id),
        quantity_ordered: Number(i.quantity_ordered),
        unit_price: Number(i.unit_price),
      })),
    });
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Topbar
        title="Create Purchase Order"
        subtitle="Order pharmaceutical stock directly from licensed distributors"
        actions={
          <Link to="/purchase/orders">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Orders
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="p-3 bg-danger-soft border border-danger/30 rounded text-danger text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card title="Purchase Order Header">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Select Supplier"
              required
              options={(suppliers?.items || []).map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              value={supplierId}
              onChange={(e) => setSupplierId(Number(e.target.value))}
              placeholder="Choose vendor..."
            />

            <Input
              label="Order Date"
              type="date"
              required
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />

            <Input
              label="Expected Delivery Date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>
        </Card>

        <Card
          title="Line Items"
          action={
            <Button type="button" size="sm" variant="secondary" onClick={addItemRow}>
              <Plus className="w-4 h-4 mr-1" /> Add Medicine Line
            </Button>
          }
        >
          <div className="space-y-3">
            {items.map((item, index) => {
              const lineTotal = (item.quantity_ordered || 0) * (item.unit_price || 0);
              return (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-center gap-3 p-3 border border-border rounded-md bg-surface"
                >
                  <div className="flex-1 w-full">
                    <Select
                      options={(medicines?.items || []).map((m) => ({
                        value: m.id,
                        label: `${m.name} (${m.unit})`,
                      }))}
                      value={item.medicine_id}
                      onChange={(e) => updateItem(index, 'medicine_id', Number(e.target.value))}
                      placeholder="Select medicine to order..."
                    />
                  </div>

                  <div className="w-full sm:w-36">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.quantity_ordered}
                      onChange={(e) => updateItem(index, 'quantity_ordered', Number(e.target.value))}
                    />
                  </div>

                  <div className="w-full sm:w-36">
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Unit Price (₹)"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                    />
                  </div>

                  <div className="w-24 text-right font-mono text-xs font-semibold text-text-primary">
                    ₹{lineTotal.toFixed(2)}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    disabled={items.length === 1}
                    className="p-2 text-text-secondary hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-text-secondary">{items.length} line item(s)</span>
            <div className="text-right">
              <span className="text-xs text-text-secondary mr-2">Estimated PO Total:</span>
              <span className="text-lg font-bold font-mono text-accent">
                ₹{calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Link to="/purchase/orders">
            <Button variant="ghost" size="md">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="md" isLoading={createPOMutation.isPending}>
            <Save className="w-4 h-4 mr-1.5" /> Place Purchase Order
          </Button>
        </div>
      </form>
    </div>
  );
};

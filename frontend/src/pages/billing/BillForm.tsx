import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Receipt, UserPlus, Search, Printer, CheckCircle } from 'lucide-react';
import { billsApi, patientsApi } from '../../api/bills';
import { medicinesApi } from '../../api/medicines';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Topbar } from '../../components/ui/Topbar';
import { BillPrintModal } from './BillPrintModal';
import { Patient, Medicine, Bill, PaymentMode } from '../../types';

interface BilledLineItem {
  medicine_id: number;
  quantity: number;
  medicine_name: string;
  unit: string;
  available_stock: number;
}

export const BillForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [patientId, setPatientId] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');

  const [items, setItems] = useState<BilledLineItem[]>([]);
  const [selectedMedId, setSelectedMedId] = useState<number>(0);
  const [selectedQty, setSelectedQty] = useState<number>(1);

  const [error, setError] = useState<string | null>(null);
  const [createdBill, setCreatedBill] = useState<Bill | null>(null);

  // Quick Patient Create Modal State
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [newPatientUhid, setNewPatientUhid] = useState(`UHID-${Date.now().toString().slice(-6)}`);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState<number>(30);
  const [newPatientGender, setNewPatientGender] = useState('Male');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientType, setNewPatientType] = useState<'OPD' | 'IPD'>('OPD');

  const { data: patients } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => patientsApi.list({ page: 1, page_size: 100 }),
  });

  const { data: medicines } = useQuery({
    queryKey: ['medicines-for-billing'],
    queryFn: () => medicinesApi.list({ page: 1, page_size: 100, is_active: true }),
  });

  const createPatientMutation = useMutation({
    mutationFn: patientsApi.create,
    onSuccess: (newPat) => {
      queryClient.invalidateQueries({ queryKey: ['patients-list'] });
      setPatientId(newPat.id);
      setIsPatientModalOpen(false);
      setNewPatientName('');
      setNewPatientPhone('');
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to register patient');
    },
  });

  const createBillMutation = useMutation({
    mutationFn: billsApi.create,
    onSuccess: (newBill) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setCreatedBill(newBill);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to process bill');
    },
  });

  const handleAddMedicineToCart = () => {
    if (!selectedMedId || selectedQty <= 0) return;
    const med = medicines?.items.find((m) => m.id === selectedMedId);
    if (!med) return;

    if ((med.total_stock || 0) < selectedQty) {
      setError(`Only ${med.total_stock || 0} units available for ${med.name}. Cannot dispense ${selectedQty}.`);
      return;
    }

    const existingIdx = items.findIndex((i) => i.medicine_id === selectedMedId);
    if (existingIdx >= 0) {
      setItems((prev) => {
        const next = [...prev];
        next[existingIdx].quantity += selectedQty;
        return next;
      });
    } else {
      setItems((prev) => [
        ...prev,
        {
          medicine_id: med.id,
          medicine_name: med.name,
          unit: med.unit,
          quantity: selectedQty,
          available_stock: med.total_stock || 0,
        },
      ]);
    }
    setError(null);
    setSelectedQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitBill = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientId) {
      setError('Please select or register a patient.');
      return;
    }
    if (!items.length) {
      setError('Cart is empty. Add at least one medicine.');
      return;
    }

    createBillMutation.mutate({
      patient_id: patientId,
      discount: Number(discount),
      tax: Number(tax),
      payment_mode: paymentMode,
      items: items.map((i) => ({
        medicine_id: i.medicine_id,
        quantity: i.quantity,
      })),
    });
  };

  const handleCreatePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientUhid.trim() || newPatientUhid.trim().length < 3) {
      setError('UHID must be at least 3 characters.');
      return;
    }
    if (!newPatientName.trim() || newPatientName.trim().length < 2) {
      setError('Patient name must be at least 2 characters.');
      return;
    }
    const cleanPhone = newPatientPhone.trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      setError('Patient mobile number must be exactly 10 digits (e.g. 9876543210).');
      return;
    }
    if (isNaN(newPatientAge) || newPatientAge < 0 || newPatientAge > 130) {
      setError('Patient age must be between 0 and 130.');
      return;
    }
    createPatientMutation.mutate({
      uhid: newPatientUhid.trim(),
      name: newPatientName.trim(),
      age: Number(newPatientAge),
      gender: newPatientGender,
      phone: cleanPhone,
      patient_type: newPatientType,
    });
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <Topbar
        title="Point of Sale (POS) — Patient Dispensing"
        subtitle="Automatic First-Expire-First-Out (FEFO) batch allocation and instant receipt printing"
        actions={
          <Link to="/billing">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-1" /> Bills History
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="p-3 bg-danger-soft border border-danger/30 rounded text-danger text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient & Cart Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Patient Card */}
          <Card
            title="1. Patient Demographics"
            action={
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setIsPatientModalOpen(true)}
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" /> New Patient
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Select Registered Patient"
                required
                options={(patients?.items || []).map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.uhid} - ${p.patient_type})`,
                }))}
                value={patientId}
                onChange={(e) => setPatientId(Number(e.target.value))}
                placeholder="Search patient by UHID / Name..."
              />

              <div className="flex items-center gap-2 pt-5">
                {patientId ? (
                  <Badge variant="accent" size="md">
                    Patient Selected
                  </Badge>
                ) : (
                  <span className="text-xs text-text-secondary">
                    Select existing or register walk-in patient
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Medicine Selector */}
          <Card title="2. Add Medicines (FEFO Auto-Selection)">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <Select
                  label="Search / Choose Medicine"
                  options={(medicines?.items || []).map((m) => ({
                    value: m.id,
                    label: `${m.name} [Avail: ${m.total_stock || 0} ${m.unit}s]`,
                  }))}
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(Number(e.target.value))}
                  placeholder="Select drug from formulary..."
                />
              </div>

              <div className="w-full sm:w-28">
                <Input
                  label="Dispense Qty"
                  type="number"
                  min={1}
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(Number(e.target.value))}
                />
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleAddMedicineToCart}
                disabled={!selectedMedId}
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>

            {/* Cart Items List */}
            <div className="mt-5 border border-border rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-alt border-b border-border text-text-secondary font-semibold">
                  <tr>
                    <th className="p-2.5">Medicine</th>
                    <th className="p-2.5">Form Unit</th>
                    <th className="p-2.5 text-right">Available</th>
                    <th className="p-2.5 text-right">Dispense Qty</th>
                    <th className="p-2.5 text-center">Batch Logic</th>
                    <th className="p-2.5 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!items.length ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-text-secondary">
                        No medicines added yet. Select a drug above to add to bill.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={item.medicine_id}>
                        <td className="p-2.5 font-semibold text-text-primary">{item.medicine_name}</td>
                        <td className="p-2.5 text-text-secondary">{item.unit}</td>
                        <td className="p-2.5 text-right font-mono text-text-secondary">
                          {item.available_stock}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-accent">
                          {item.quantity}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge variant="accent" size="sm">
                            Auto FEFO
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-text-secondary hover:text-danger"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Checkout & Billing Summary */}
        <div className="space-y-4">
          <Card title="3. Checkout & Payment">
            <form onSubmit={handleSubmitBill} className="space-y-4">
              <Select
                label="Payment Mode"
                required
                options={[
                  { value: 'CASH', label: 'Cash Payment' },
                  { value: 'CARD', label: 'Credit / Debit Card' },
                  { value: 'UPI', label: 'UPI / QR Code' },
                  { value: 'INSURANCE', label: 'Hospital TPA / Insurance' },
                ]}
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Discount (₹)"
                  type="number"
                  step="0.01"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
                <Input
                  label="GST / Tax (₹)"
                  type="number"
                  step="0.01"
                  min={0}
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value))}
                />
              </div>

              <div className="p-3 bg-surface border border-border rounded text-xs space-y-2">
                <div className="flex justify-between text-text-secondary">
                  <span>Selected Drugs:</span>
                  <span className="font-semibold">{items.length} item(s)</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Allocation Algorithm:</span>
                  <span className="font-semibold text-accent">Strict FEFO</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Immediate Deduction:</span>
                  <span className="text-success font-medium">Atomic ledger sync</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={createBillMutation.isPending}
                disabled={!patientId || !items.length}
              >
                <Receipt className="w-4 h-4 mr-1.5" /> Confirm & Dispense Bill
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Quick Patient Registration Modal */}
      <Modal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        title="Quick Register Walk-in Patient"
        subtitle="Generates unique hospital UHID and registers demographic profile"
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsPatientModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreatePatientSubmit}
              isLoading={createPatientMutation.isPending}
            >
              Register & Select
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreatePatientSubmit} className="space-y-4">
          <Input
            label="UHID (Unique Hospital ID)"
            required
            placeholder="e.g. UHID-2026-0042"
            value={newPatientUhid}
            onChange={(e) => setNewPatientUhid(e.target.value)}
          />

          <Input
            label="Patient Full Name"
            required
            placeholder="e.g. Ramesh Kumar"
            value={newPatientName}
            onChange={(e) => setNewPatientName(e.target.value)}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Age"
              type="number"
              required
              min={0}
              max={130}
              value={newPatientAge}
              onChange={(e) => setNewPatientAge(Number(e.target.value))}
            />
            <Select
              label="Gender"
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
              ]}
              value={newPatientGender}
              onChange={(e) => setNewPatientGender(e.target.value)}
            />
            <Select
              label="Patient Type"
              options={[
                { value: 'OPD', label: 'OPD' },
                { value: 'IPD', label: 'IPD' },
              ]}
              value={newPatientType}
              onChange={(e) => setNewPatientType(e.target.value as 'OPD' | 'IPD')}
            />
          </div>

          <Input
            label="Mobile Number (10 Digits)"
            required
            maxLength={10}
            placeholder="e.g. 9876543210"
            value={newPatientPhone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              setNewPatientPhone(val);
            }}
          />
        </form>
      </Modal>

      {/* Bill Success Print Modal */}
      <BillPrintModal
        isOpen={!!createdBill}
        onClose={() => {
          setCreatedBill(null);
          navigate('/billing');
        }}
        bill={createdBill}
      />
    </div>
  );
};

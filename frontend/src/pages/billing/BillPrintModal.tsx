import React from 'react';
import { Printer, Download, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Bill } from '../../types';

interface BillPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
}

export const BillPrintModal: React.FC<BillPrintModalProps> = ({ isOpen, onClose, bill }) => {
  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pharmacy Dispensing Tax Invoice"
      subtitle={`Invoice #${bill.bill_number} | Official Hospital Dispensing Receipt`}
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full no-print">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1.5" /> Print A4 Invoice
            </Button>
          </div>
        </div>
      }
    >
      <div id="printable-invoice" className="bg-white p-6 border border-border rounded text-xs space-y-6">
        {/* Hospital Header */}
        <div className="border-b border-border pb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary tracking-tight">HOSPITAL PHARMACY MANAGEMENT SYSTEM</h2>
            <p className="text-text-secondary mt-0.5">Central Pharmacy & Emergency Drug Dispensing Center</p>
            <p className="text-text-secondary">License: DL-PH-2026-99881 | GSTIN: 07AAAAA0000A1Z5</p>
            <p className="text-text-secondary">Phone: +91 (11) 2658-8500 | 24x7 Helpdesk</p>
          </div>
          <div className="text-right">
            <span className="font-mono text-sm font-bold text-accent block">{bill.bill_number}</span>
            <span className="text-text-secondary block mt-1">
              Date: {new Date(bill.bill_date).toLocaleDateString()} {new Date(bill.bill_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="inline-block mt-2 px-2 py-0.5 bg-accent-soft text-accent text-[11px] font-semibold rounded">
              {bill.payment_mode} • {bill.payment_status}
            </span>
          </div>
        </div>

        {/* Patient Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-surface border border-border rounded">
          <div>
            <span className="text-text-secondary block text-[11px]">Patient Name</span>
            <span className="font-semibold text-text-primary text-xs">{bill.patient_name || 'Walk-in Patient'}</span>
          </div>
          <div>
            <span className="text-text-secondary block text-[11px]">UHID / Registration #</span>
            <span className="font-mono font-semibold text-text-primary text-xs">{bill.patient_uhid || '-'}</span>
          </div>
          <div>
            <span className="text-text-secondary block text-[11px]">Contact Phone</span>
            <span className="text-text-primary text-xs">{bill.patient_phone || '-'}</span>
          </div>
          <div>
            <span className="text-text-secondary block text-[11px]">Dispensed By</span>
            <span className="text-text-primary text-xs">{bill.created_by_name || `Staff #${bill.created_by}`}</span>
          </div>
        </div>

        {/* Dispensed Items Table */}
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-alt border-b border-border text-text-secondary font-semibold">
              <tr>
                <th className="p-2.5">#</th>
                <th className="p-2.5">Medicine Description</th>
                <th className="p-2.5">Batch / Lot</th>
                <th className="p-2.5">Expiry</th>
                <th className="p-2.5 text-right">Qty</th>
                <th className="p-2.5 text-right">MRP (₹)</th>
                <th className="p-2.5 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bill.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="p-2.5 text-text-secondary">{idx + 1}</td>
                  <td className="p-2.5 font-medium text-text-primary">{item.medicine_name || `Medicine #${item.medicine_id}`}</td>
                  <td className="p-2.5 font-mono text-[11px]">{item.batch_number}</td>
                  <td className="p-2.5 font-mono text-[11px] text-text-secondary">{item.expiry_date || '-'}</td>
                  <td className="p-2.5 text-right font-mono font-semibold">{item.quantity}</td>
                  <td className="p-2.5 text-right font-mono">{item.unit_price.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-mono font-semibold">{item.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-text-secondary">
              <span>Gross Subtotal:</span>
              <span className="font-mono">₹{bill.subtotal.toFixed(2)}</span>
            </div>
            {bill.discount > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount Applied:</span>
                <span className="font-mono">- ₹{bill.discount.toFixed(2)}</span>
              </div>
            )}
            {bill.tax > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>GST / Hospital Tax:</span>
                <span className="font-mono">+ ₹{bill.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-text-primary border-t border-border pt-2 mt-2">
              <span>Net Payable Total:</span>
              <span className="font-mono text-accent">₹{bill.net_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Pharmacist Disclaimer */}
        <div className="pt-4 border-t border-border text-[11px] text-text-secondary leading-relaxed flex justify-between items-end">
          <div>
            <p>1. Prescribed medicines must be taken strictly as per physician's advice.</p>
            <p>2. Keep medicines out of reach of children. Store in a cool, dry place.</p>
            <p>3. This is a computer-generated tax invoice verified under FEFO regulations.</p>
          </div>
          <div className="text-center pt-8 border-t border-slate-300 w-36">
            <span className="font-semibold block text-text-primary">Authorized Pharmacist</span>
            <span className="text-[10px] text-text-secondary">Signature & Stamp</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const AccessDenied: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrator',
    PHARMACIST: 'Pharmacist',
    BILLING_STAFF: 'Billing Staff',
    DEPT_STAFF: 'Department Staff',
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
          <ShieldOff className="w-10 h-10 text-red-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text-primary">Access Denied</h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            Your role{' '}
            <span className="font-semibold text-accent">
              {user ? roleLabels[user.role] ?? user.role : ''}
            </span>{' '}
            does not have permission to view this page.
          </p>
        </div>

        <div className="border border-border rounded-lg p-4 bg-white text-left space-y-1 text-xs text-text-secondary">
          <p className="font-semibold text-text-primary mb-2">Your accessible modules:</p>
          {user?.role === 'PHARMACIST' && (
            <ul className="space-y-1 list-disc list-inside">
              <li>Dashboard</li>
              <li>Inventory (Medicines, Batches, Adjustments)</li>
              <li>Purchase Orders &amp; Suppliers</li>
              <li>Department Requisitions</li>
              <li>Reports</li>
            </ul>
          )}
          {user?.role === 'BILLING_STAFF' && (
            <ul className="space-y-1 list-disc list-inside">
              <li>Dashboard</li>
              <li>Medicines Catalog (view)</li>
              <li>Billing &amp; POS</li>
              <li>Reports</li>
            </ul>
          )}
          {user?.role === 'DEPT_STAFF' && (
            <ul className="space-y-1 list-disc list-inside">
              <li>Dashboard</li>
              <li>Department Requisitions &amp; Issues</li>
              <li>Reports</li>
            </ul>
          )}
          {user?.role === 'ADMIN' && (
            <p className="text-success font-medium">Full access to all modules.</p>
          )}
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';

import { Login } from '../pages/auth/Login';
import { AccessDenied } from '../pages/auth/AccessDenied';
import { Dashboard } from '../pages/dashboard/Dashboard';
import { MedicineList } from '../pages/inventory/MedicineList';
import { BatchList } from '../pages/inventory/BatchList';
import { StockAdjustList } from '../pages/inventory/StockAdjustList';
import { PurchaseOrderList } from '../pages/purchase/PurchaseOrderList';
import { PurchaseOrderForm } from '../pages/purchase/PurchaseOrderForm';
import { SupplierList } from '../pages/purchase/SupplierList';
import { BillList } from '../pages/billing/BillList';
import { BillForm } from '../pages/billing/BillForm';
import { DepartmentList } from '../pages/departments/DepartmentList';
import { IssueList } from '../pages/departments/IssueList';
import { ReportsHub } from '../pages/reports/ReportsHub';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ path: '', element: <Login /> }],
  },
  {
    path: '/access-denied',
    element: <AccessDenied />,
  },
  {
    path: '/',
    // Outer guard: just checks isAuthenticated
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },

          // ─── All roles ───────────────────────────────────────────────
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'reports',   element: <ReportsHub /> },

          // ─── Medicines catalog: ADMIN · PHARMACIST · BILLING_STAFF ───
          {
            element: <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST', 'BILLING_STAFF']} />,
            children: [
              { path: 'inventory/medicines', element: <MedicineList /> },
            ],
          },

          // ─── Full inventory ops: ADMIN · PHARMACIST ───────────────
          {
            element: <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST']} />,
            children: [
              { path: 'inventory/batches',      element: <BatchList /> },
              { path: 'inventory/adjustments',  element: <StockAdjustList /> },
              { path: 'purchase/orders',        element: <PurchaseOrderList /> },
              { path: 'purchase/new',           element: <PurchaseOrderForm /> },
              { path: 'purchase/suppliers',     element: <SupplierList /> },
            ],
          },

          // ─── Billing / POS: ADMIN · BILLING_STAFF ────────────────
          {
            element: <ProtectedRoute allowedRoles={['ADMIN', 'BILLING_STAFF']} />,
            children: [
              { path: 'billing',     element: <BillList /> },
              { path: 'billing/new', element: <BillForm /> },
            ],
          },

          // ─── Departments: ADMIN · PHARMACIST · DEPT_STAFF ─────────
          {
            element: <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST', 'DEPT_STAFF']} />,
            children: [
              { path: 'departments',        element: <DepartmentList /> },
              { path: 'departments/issues', element: <IssueList /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

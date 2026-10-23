import { apiClient } from './client';
import {
  DashboardKPIs,
  StockReportItem,
  ExpiryReportItem,
  SalesReportItem,
  PurchaseReportItem,
  ConsumptionReportItem,
  StockMovementLedgerItem,
} from '../types';

export const dashboardApi = {
  getStats: async (): Promise<DashboardKPIs> => {
    const response = await apiClient.get<DashboardKPIs>('/dashboard/stats');
    return response.data;
  },
};

export const reportsApi = {
  getStockReport: async (params?: { category?: string; medicine_id?: number }): Promise<StockReportItem[]> => {
    const response = await apiClient.get<StockReportItem[]>('/reports/stock', { params });
    return response.data;
  },

  getExpiryReport: async (params?: { days_window?: number }): Promise<ExpiryReportItem[]> => {
    const response = await apiClient.get<ExpiryReportItem[]>('/reports/expiry', { params });
    return response.data;
  },

  getSalesReport: async (params?: { start_date?: string; end_date?: string; payment_status?: string }): Promise<SalesReportItem[]> => {
    const response = await apiClient.get<SalesReportItem[]>('/reports/sales', { params });
    return response.data;
  },

  getPurchaseReport: async (params?: { supplier_id?: number; start_date?: string; end_date?: string }): Promise<PurchaseReportItem[]> => {
    const response = await apiClient.get<PurchaseReportItem[]>('/reports/purchase', { params });
    return response.data;
  },

  getConsumptionReport: async (params?: { department_id?: number }): Promise<ConsumptionReportItem[]> => {
    const response = await apiClient.get<ConsumptionReportItem[]>('/reports/consumption', { params });
    return response.data;
  },

  getLedger: async (params?: { medicine_id?: number; limit?: number }): Promise<StockMovementLedgerItem[]> => {
    const response = await apiClient.get<StockMovementLedgerItem[]>('/reports/ledger', { params });
    return response.data;
  },

  exportCsvUrl: (reportType: string, params?: Record<string, any>): string => {
    const query = new URLSearchParams({ ...params, format: 'csv' }).toString();
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseURL}/reports/${reportType}?${query}`;
  },
};

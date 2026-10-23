import { apiClient } from './client';
import { Batch, PaginatedResponse, StockAdjustment } from '../types';

export interface BatchFilters {
  page?: number;
  page_size?: number;
  medicine_id?: number;
  supplier_id?: number;
  available_only?: boolean;
  expiring_soon_only?: boolean;
  expired_only?: boolean;
  search?: string;
}

export const batchesApi = {
  list: async (params?: BatchFilters): Promise<PaginatedResponse<Batch>> => {
    const response = await apiClient.get<PaginatedResponse<Batch>>('/batches', { params });
    return response.data;
  },

  create: async (data: Partial<Batch>): Promise<Batch> => {
    const response = await apiClient.post<Batch>('/batches', data);
    return response.data;
  },
};

export const adjustmentsApi = {
  list: async (params?: { page?: number; page_size?: number; medicine_id?: number }): Promise<PaginatedResponse<StockAdjustment>> => {
    const response = await apiClient.get<PaginatedResponse<StockAdjustment>>('/stock-adjustments', { params });
    return response.data;
  },

  create: async (data: {
    medicine_id: number;
    batch_id: number;
    adjustment_type: string;
    quantity: number;
    reason: string;
  }): Promise<StockAdjustment> => {
    const response = await apiClient.post<StockAdjustment>('/stock-adjustments', data);
    return response.data;
  },
};

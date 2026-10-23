import { apiClient } from './client';
import { Medicine, PaginatedResponse } from '../types';

export interface MedicineFilters {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  manufacturer?: string;
  is_active?: boolean;
  low_stock_only?: boolean;
}

export const medicinesApi = {
  list: async (params?: MedicineFilters): Promise<PaginatedResponse<Medicine>> => {
    const response = await apiClient.get<PaginatedResponse<Medicine>>('/medicines', { params });
    return response.data;
  },

  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/medicines/categories');
    return response.data;
  },

  getById: async (id: number): Promise<Medicine> => {
    const response = await apiClient.get<Medicine>(`/medicines/${id}`);
    return response.data;
  },

  create: async (data: Partial<Medicine>): Promise<Medicine> => {
    const response = await apiClient.post<Medicine>('/medicines', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Medicine>): Promise<Medicine> => {
    const response = await apiClient.put<Medicine>(`/medicines/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/medicines/${id}`);
  },
};

import { apiClient } from './client';
import { Supplier, PaginatedResponse, PurchaseOrder, POStatus } from '../types';

export const suppliersApi = {
  list: async (params?: { page?: number; page_size?: number; search?: string; is_active?: boolean }): Promise<PaginatedResponse<Supplier>> => {
    const response = await apiClient.get<PaginatedResponse<Supplier>>('/suppliers', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Supplier> => {
    const response = await apiClient.get<Supplier>(`/suppliers/${id}`);
    return response.data;
  },

  create: async (data: Partial<Supplier>): Promise<Supplier> => {
    const response = await apiClient.post<Supplier>('/suppliers', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Supplier>): Promise<Supplier> => {
    const response = await apiClient.put<Supplier>(`/suppliers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },
};

export const purchaseOrdersApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    supplier_id?: number;
    status_filter?: POStatus;
    search?: string;
  }): Promise<PaginatedResponse<PurchaseOrder>> => {
    const response = await apiClient.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders', { params });
    return response.data;
  },

  getById: async (id: number): Promise<PurchaseOrder> => {
    const response = await apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`);
    return response.data;
  },

  create: async (data: {
    supplier_id: number;
    order_date: string;
    expected_date?: string | null;
    items: { medicine_id: number; quantity_ordered: number; unit_price: number }[];
  }): Promise<PurchaseOrder> => {
    const response = await apiClient.post<PurchaseOrder>('/purchase-orders', data);
    return response.data;
  },

  receive: async (
    poId: number,
    data: {
      items: {
        item_id: number;
        quantity_receiving: number;
        batch_number: string;
        manufacture_date: string;
        expiry_date: string;
        mrp: number;
        unit_cost_price?: number;
      }[];
    }
  ): Promise<PurchaseOrder> => {
    const response = await apiClient.post<PurchaseOrder>(`/purchase-orders/${poId}/receive`, data);
    return response.data;
  },

  cancel: async (poId: number): Promise<PurchaseOrder> => {
    const response = await apiClient.patch<PurchaseOrder>(`/purchase-orders/${poId}/cancel`);
    return response.data;
  },
};

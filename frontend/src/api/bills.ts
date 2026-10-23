import { apiClient } from './client';
import { Patient, PaginatedResponse, Bill, PaymentMode, PaymentStatus } from '../types';

export const patientsApi = {
  list: async (params?: { page?: number; page_size?: number; search?: string }): Promise<PaginatedResponse<Patient>> => {
    const response = await apiClient.get<PaginatedResponse<Patient>>('/patients', { params });
    return response.data;
  },

  create: async (data: Partial<Patient>): Promise<Patient> => {
    const response = await apiClient.post<Patient>('/patients', data);
    return response.data;
  },
};

export const billsApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    patient_id?: number;
    payment_status?: PaymentStatus;
    search?: string;
  }): Promise<PaginatedResponse<Bill>> => {
    const response = await apiClient.get<PaginatedResponse<Bill>>('/bills', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Bill> => {
    const response = await apiClient.get<Bill>(`/bills/${id}`);
    return response.data;
  },

  create: async (data: {
    patient_id: number;
    discount?: number;
    tax?: number;
    payment_mode: PaymentMode;
    payment_status?: PaymentStatus;
    items: { medicine_id: number; quantity: number; batch_id?: number; unit_price?: number }[];
  }): Promise<Bill> => {
    const response = await apiClient.post<Bill>('/bills', data);
    return response.data;
  },

  refund: async (id: number): Promise<Bill> => {
    const response = await apiClient.post<Bill>(`/bills/${id}/refund`);
    return response.data;
  },
};

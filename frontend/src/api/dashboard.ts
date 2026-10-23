import { apiClient } from './client';
import { DashboardKPIs } from '../types';

export const dashboardApi = {
  getStats: async (): Promise<DashboardKPIs> => {
    const response = await apiClient.get<DashboardKPIs>('/dashboard/stats');
    return response.data;
  },
};

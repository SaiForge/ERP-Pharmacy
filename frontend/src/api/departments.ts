import { apiClient } from './client';
import { Department, DepartmentIssue, PaginatedResponse, IssueStatus } from '../types';

export const departmentsApi = {
  list: async (params?: { page?: number; page_size?: number; search?: string }): Promise<PaginatedResponse<Department>> => {
    const response = await apiClient.get<PaginatedResponse<Department>>('/departments', { params });
    return response.data;
  },

  create: async (data: Partial<Department>): Promise<Department> => {
    const response = await apiClient.post<Department>('/departments', data);
    return response.data;
  },
};

export const departmentIssuesApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    department_id?: number;
    status_filter?: IssueStatus;
    search?: string;
  }): Promise<PaginatedResponse<DepartmentIssue>> => {
    const response = await apiClient.get<PaginatedResponse<DepartmentIssue>>('/department-issues', { params });
    return response.data;
  },

  getById: async (id: number): Promise<DepartmentIssue> => {
    const response = await apiClient.get<DepartmentIssue>(`/department-issues/${id}`);
    return response.data;
  },

  create: async (data: {
    department_id: number;
    requested_by: string;
    items: { medicine_id: number; quantity_requested: number; batch_id?: number }[];
  }): Promise<DepartmentIssue> => {
    const response = await apiClient.post<DepartmentIssue>('/department-issues', data);
    return response.data;
  },

  issue: async (id: number): Promise<DepartmentIssue> => {
    const response = await apiClient.post<DepartmentIssue>(`/department-issues/${id}/issue`);
    return response.data;
  },

  reject: async (id: number): Promise<DepartmentIssue> => {
    const response = await apiClient.post<DepartmentIssue>(`/department-issues/${id}/reject`);
    return response.data;
  },
};

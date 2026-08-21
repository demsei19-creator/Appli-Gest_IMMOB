import apiClient from '../api/apiClient';
import {
  MaintenanceRequest,
  MaintenancePriority,
  MaintenanceStatus,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

export interface MaintenanceCreatePayload {
  property: string;
  unit?: string;
  reported_by_tenant?: string;
  supplier?: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status?: MaintenanceStatus;
  estimated_cost?: string | number;
  actual_cost?: string | number;
  completed_date?: string;
}

export interface MaintenanceStats {
  total_requests: number;
  open_requests: number;
  urgent_open_requests: number;
  completed_this_month: number;
  total_actual_cost: string;
}

export const maintenanceService = {
  async getMaintenanceRequests(params?: {
    status?: string;
    priority?: string;
    property?: string;
    unit?: string;
    supplier?: string;
    search?: string;
  }): Promise<MaintenanceRequest[]> {
    const response = await apiClient.get<PaginatedResponse<MaintenanceRequest>>('/maintenance/', { params });
    return response.data.data;
  },

  async getMaintenanceStats(): Promise<MaintenanceStats> {
    const response = await apiClient.get<ApiResponse<MaintenanceStats>>('/maintenance/stats/');
    return response.data.data;
  },

  async getMaintenanceDetail(id: string): Promise<MaintenanceRequest> {
    const response = await apiClient.get<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}/`);
    return response.data.data;
  },

  async createMaintenanceRequest(payload: MaintenanceCreatePayload): Promise<MaintenanceRequest> {
    const response = await apiClient.post<ApiResponse<MaintenanceRequest>>('/maintenance/', payload);
    return response.data.data;
  },

  async updateMaintenanceRequest(id: string, payload: Partial<MaintenanceCreatePayload>): Promise<MaintenanceRequest> {
    const response = await apiClient.patch<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}/`, payload);
    return response.data.data;
  },

  async assignSupplier(id: string, supplier_id: string, estimated_cost?: string | number): Promise<MaintenanceRequest> {
    const response = await apiClient.post<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}/assign-supplier/`, {
      supplier_id,
      estimated_cost,
    });
    return response.data.data;
  },

  async updateStatus(
    id: string,
    status: MaintenanceStatus,
    actual_cost?: string | number,
    completed_date?: string,
    notes?: string
  ): Promise<MaintenanceRequest> {
    const response = await apiClient.post<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}/update-status/`, {
      status,
      actual_cost,
      completed_date,
      notes,
    });
    return response.data.data;
  },

  async deleteMaintenanceRequest(id: string): Promise<void> {
    await apiClient.delete(`/maintenance/${id}/`);
  },
};

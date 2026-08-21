import apiClient from '../api/apiClient';
import {
  Lease,
  Deposit,
  ApiResponse,
  PaginatedResponse,
  LeaseStatus,
  PaymentFrequency,
} from '@/types';

export interface LeaseCreatePayload {
  unit: string;
  tenant: string;
  start_date: string;
  end_date?: string;
  rent_amount: string | number;
  charges_amount?: string | number;
  deposit_amount?: string | number;
  payment_day_of_month?: number;
  payment_frequency?: PaymentFrequency;
  status?: LeaseStatus;
  terms_and_conditions?: string;
}

export interface DepositActionPayload {
  action: 'PAY' | 'REFUND' | 'RETAIN';
  amount?: string | number;
  payment_method?: string;
  receipt_reference?: string;
  reason?: string;
  date?: string;
}

export interface LeaseStats {
  total_leases: number;
  active_leases_count: number;
  draft_leases_count: number;
  terminated_leases_count: number;
  total_active_monthly_rent: string;
  total_deposits_collected: string;
}

export const leaseService = {
  async getLeases(params?: {
    status?: string;
    property?: string;
    tenant?: string;
    search?: string;
  }): Promise<Lease[]> {
    const response = await apiClient.get<PaginatedResponse<Lease>>('/leases/', { params });
    return response.data.data;
  },

  async getLeaseStats(): Promise<LeaseStats> {
    const response = await apiClient.get<ApiResponse<LeaseStats>>('/leases/stats/');
    return response.data.data;
  },

  async getLeaseDetail(id: string): Promise<Lease> {
    const response = await apiClient.get<ApiResponse<Lease>>(`/leases/${id}/`);
    return response.data.data;
  },

  async createLease(payload: LeaseCreatePayload): Promise<Lease> {
    const response = await apiClient.post<ApiResponse<Lease>>('/leases/', payload);
    return response.data.data;
  },

  async updateLease(id: string, payload: Partial<LeaseCreatePayload>): Promise<Lease> {
    const response = await apiClient.put<ApiResponse<Lease>>(`/leases/${id}/`, payload);
    return response.data.data;
  },

  async activateLease(id: string): Promise<Lease> {
    const response = await apiClient.post<ApiResponse<Lease>>(`/leases/${id}/activate/`);
    return response.data.data;
  },

  async terminateLease(
    id: string,
    payload: { termination_date: string; reason?: string; next_unit_status?: 'VACANT' | 'MAINTENANCE' }
  ): Promise<Lease> {
    const response = await apiClient.post<ApiResponse<Lease>>(`/leases/${id}/terminate/`, payload);
    return response.data.data;
  },

  async manageDeposit(id: string, payload: DepositActionPayload): Promise<Deposit> {
    const response = await apiClient.post<ApiResponse<Deposit>>(`/leases/${id}/deposit/`, payload);
    return response.data.data;
  },

  async deleteLease(id: string): Promise<void> {
    await apiClient.delete(`/leases/${id}/`);
  },
};

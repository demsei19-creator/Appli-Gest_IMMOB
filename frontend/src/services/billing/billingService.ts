import apiClient from '../api/apiClient';
import {
  RentInvoice,
  ApiResponse,
  PaginatedResponse,
  InvoiceStatus,
} from '@/types';

export interface RentInvoiceCreatePayload {
  lease: string;
  period_start: string;
  period_end: string;
  due_date?: string;
  rent_amount?: string | number;
  charges_amount?: string | number;
  notes?: string;
}

export interface BulkInvoiceGeneratePayload {
  month: number;
  year: number;
  property_id?: string;
}

export interface BulkInvoiceGenerateResult {
  generated_count: number;
  skipped_count: number;
  invoices: RentInvoice[];
  skipped_leases: Array<{
    lease_id: string;
    lease_number: string;
    tenant_name: string;
    reason: string;
  }>;
}

export interface BillingStats {
  total_invoices_count: number;
  paid_invoices_count: number;
  unpaid_invoices_count: number;
  overdue_invoices_count: number;
  total_expected_amount: string;
  total_paid_amount: string;
  total_unpaid_amount: string;
  recovery_rate: number;
}

export const billingService = {
  async getInvoices(params?: {
    status?: string;
    property?: string;
    tenant?: string;
    month?: number;
    year?: number;
    search?: string;
  }): Promise<RentInvoice[]> {
    const response = await apiClient.get<PaginatedResponse<RentInvoice>>('/billing/', { params });
    return response.data.data;
  },

  async getBillingStats(params?: { month?: number; year?: number }): Promise<BillingStats> {
    const response = await apiClient.get<ApiResponse<BillingStats>>('/billing/stats/', { params });
    return response.data.data;
  },

  async getInvoiceDetail(id: string): Promise<RentInvoice> {
    const response = await apiClient.get<ApiResponse<RentInvoice>>(`/billing/${id}/`);
    return response.data.data;
  },

  async createInvoice(payload: RentInvoiceCreatePayload): Promise<RentInvoice> {
    const response = await apiClient.post<ApiResponse<RentInvoice>>('/billing/', payload);
    return response.data.data;
  },

  async generateBulkInvoices(payload: BulkInvoiceGeneratePayload): Promise<BulkInvoiceGenerateResult> {
    const response = await apiClient.post<ApiResponse<BulkInvoiceGenerateResult>>('/billing/bulk-generate/', payload);
    return response.data.data;
  },

  async cancelInvoice(id: string, reason?: string): Promise<RentInvoice> {
    const response = await apiClient.post<ApiResponse<RentInvoice>>(`/billing/${id}/cancel/`, { reason });
    return response.data.data;
  },

  async deleteInvoice(id: string): Promise<void> {
    await apiClient.delete(`/billing/${id}/`);
  },
};

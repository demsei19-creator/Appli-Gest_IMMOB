import apiClient from '../api/apiClient';
import {
  PropertyTax,
  TaxType,
  TaxSimulationData,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

export interface TaxCreatePayload {
  property: string;
  tax_type: TaxType;
  fiscal_year: number;
  amount: string | number;
  due_date: string;
  paid_date?: string;
  is_paid?: boolean;
  reference_notice?: string;
  notes?: string;
}

export interface TaxStats {
  taxes_count: number;
  total_taxes_amount: string;
  paid_taxes_amount: string;
  pending_taxes_amount: string;
  overdue_taxes_count: number;
}

export const taxService = {
  async getTaxes(params?: {
    property?: string;
    tax_type?: string;
    fiscal_year?: number;
    is_paid?: boolean;
    search?: string;
  }): Promise<PropertyTax[]> {
    const response = await apiClient.get<PaginatedResponse<PropertyTax>>('/taxes/', { params });
    return response.data.data;
  },

  async getTaxStats(params?: { fiscal_year?: number }): Promise<TaxStats> {
    const response = await apiClient.get<ApiResponse<TaxStats>>('/taxes/stats/', { params });
    return response.data.data;
  },

  async getTaxSimulation(fiscal_year: number): Promise<TaxSimulationData> {
    const response = await apiClient.get<ApiResponse<TaxSimulationData>>('/taxes/simulation/', {
      params: { fiscal_year },
    });
    return response.data.data;
  },

  async getTaxDetail(id: string): Promise<PropertyTax> {
    const response = await apiClient.get<ApiResponse<PropertyTax>>(`/taxes/${id}/`);
    return response.data.data;
  },

  async createTax(payload: TaxCreatePayload): Promise<PropertyTax> {
    const response = await apiClient.post<ApiResponse<PropertyTax>>('/taxes/', payload);
    return response.data.data;
  },

  async updateTax(id: string, payload: Partial<TaxCreatePayload>): Promise<PropertyTax> {
    const response = await apiClient.patch<ApiResponse<PropertyTax>>(`/taxes/${id}/`, payload);
    return response.data.data;
  },

  async markTaxAsPaid(id: string, paid_date?: string): Promise<PropertyTax> {
    const response = await apiClient.post<ApiResponse<PropertyTax>>(`/taxes/${id}/mark-paid/`, { paid_date });
    return response.data.data;
  },

  async deleteTax(id: string): Promise<void> {
    await apiClient.delete(`/taxes/${id}/`);
  },
};

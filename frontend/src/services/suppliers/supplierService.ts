import apiClient from '../api/apiClient';
import {
  Supplier,
  SupplierCategory,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

export interface SupplierCreatePayload {
  name: string;
  category: SupplierCategory;
  contact_name?: string;
  phone_number: string;
  email?: string;
  address?: string;
  tax_id?: string;
  notes?: string;
}

export const supplierService = {
  async getSuppliers(params?: { category?: string; search?: string }): Promise<Supplier[]> {
    const response = await apiClient.get<PaginatedResponse<Supplier>>('/suppliers/', { params });
    return response.data.data;
  },

  async getSupplierDetail(id: string): Promise<Supplier> {
    const response = await apiClient.get<ApiResponse<Supplier>>(`/suppliers/${id}/`);
    return response.data.data;
  },

  async createSupplier(payload: SupplierCreatePayload): Promise<Supplier> {
    const response = await apiClient.post<ApiResponse<Supplier>>('/suppliers/', payload);
    return response.data.data;
  },

  async updateSupplier(id: string, payload: Partial<SupplierCreatePayload>): Promise<Supplier> {
    const response = await apiClient.patch<ApiResponse<Supplier>>(`/suppliers/${id}/`, payload);
    return response.data.data;
  },

  async deleteSupplier(id: string): Promise<void> {
    await apiClient.delete(`/suppliers/${id}/`);
  },
};

import apiClient from '../api/apiClient';
import {
  Tenant,
  ApiResponse,
  PaginatedResponse,
  TenantType,
  IdCardType,
  EmergencyContact,
} from '@/types';

export interface TenantCreatePayload {
  tenant_type: TenantType;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone_number: string;
  secondary_phone?: string;
  id_card_type?: IdCardType;
  id_card_number?: string;
  tax_id?: string;
  date_of_birth?: string;
  profession?: string;
  employer?: string;
  monthly_income?: string | number;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  emergency_contacts?: Array<{
    name: string;
    relationship?: string;
    phone_number: string;
  }>;
}

export interface TenantStats {
  total_tenants: number;
  active_occupants_count: number;
  former_tenants_count: number;
  total_unpaid_balance: string;
}

export const tenantService = {
  async getTenants(params?: {
    search?: string;
    is_active_occupant?: boolean;
    tenant_type?: string;
  }): Promise<Tenant[]> {
    const response = await apiClient.get<PaginatedResponse<Tenant>>('/tenants/', { params });
    return response.data.data;
  },

  async getTenantStats(): Promise<TenantStats> {
    const response = await apiClient.get<ApiResponse<TenantStats>>('/tenants/stats/');
    return response.data.data;
  },

  async getTenantDetail(id: string): Promise<Tenant> {
    const response = await apiClient.get<ApiResponse<Tenant>>(`/tenants/${id}/`);
    return response.data.data;
  },

  async createTenant(payload: TenantCreatePayload): Promise<Tenant> {
    const response = await apiClient.post<ApiResponse<Tenant>>('/tenants/', payload);
    return response.data.data;
  },

  async updateTenant(id: string, payload: Partial<TenantCreatePayload>): Promise<Tenant> {
    const response = await apiClient.put<ApiResponse<Tenant>>(`/tenants/${id}/`, payload);
    return response.data.data;
  },

  async deleteTenant(id: string): Promise<void> {
    await apiClient.delete(`/tenants/${id}/`);
  },

  async addEmergencyContact(
    tenantId: string,
    payload: { name: string; relationship?: string; phone_number: string }
  ): Promise<EmergencyContact> {
    const response = await apiClient.post<ApiResponse<EmergencyContact>>(
      `/tenants/${tenantId}/emergency-contacts/`,
      payload
    );
    return response.data.data;
  },
};

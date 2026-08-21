import apiClient from '../api/apiClient';
import { Property, Unit, ApiResponse, PaginatedResponse, PropertyType, UnitType, UnitStatus } from '@/types';

export interface PropertyCreatePayload {
  name: string;
  code?: string;
  property_type: PropertyType;
  address: string;
  city: string;
  postal_code?: string;
  country?: string;
  description?: string;
  notes?: string;
  purchase_price?: string | number;
  estimated_value?: string | number;
}

export interface UnitCreatePayload {
  property: string;
  unit_number: string;
  floor?: string;
  unit_type: UnitType;
  surface_area_sqm?: string | number;
  rooms_count?: number;
  bathrooms_count?: number;
  base_rent_amount: string | number;
  service_charges_amount?: string | number;
  water_meter_number?: string;
  electricity_meter_number?: string;
  description?: string;
  status?: UnitStatus;
}

export interface PropertyStats {
  total_properties: number;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  occupancy_rate_percent: number;
  total_monthly_revenue_potential: string;
  actual_monthly_revenue: string;
}

export const propertyService = {
  // Properties
  async getProperties(params?: { search?: string; property_type?: string; city?: string }): Promise<Property[]> {
    const response = await apiClient.get<PaginatedResponse<Property>>('/properties/', { params });
    return response.data.data;
  },

  async getPropertyStats(): Promise<PropertyStats> {
    const response = await apiClient.get<ApiResponse<PropertyStats>>('/properties/stats/');
    return response.data.data;
  },

  async getPropertyDetail(id: string): Promise<Property> {
    const response = await apiClient.get<ApiResponse<Property>>(`/properties/${id}/`);
    return response.data.data;
  },

  async createProperty(payload: PropertyCreatePayload): Promise<Property> {
    const response = await apiClient.post<ApiResponse<Property>>('/properties/', payload);
    return response.data.data;
  },

  async updateProperty(id: string, payload: Partial<PropertyCreatePayload>): Promise<Property> {
    const response = await apiClient.put<ApiResponse<Property>>(`/properties/${id}/`, payload);
    return response.data.data;
  },

  async deleteProperty(id: string): Promise<void> {
    await apiClient.delete(`/properties/${id}/`);
  },

  // Units
  async getUnits(params?: { property?: string; status?: string; unit_type?: string; search?: string }): Promise<Unit[]> {
    const response = await apiClient.get<PaginatedResponse<Unit>>('/units/', { params });
    return response.data.data;
  },

  async getUnitDetail(id: string): Promise<Unit> {
    const response = await apiClient.get<ApiResponse<Unit>>(`/units/${id}/`);
    return response.data.data;
  },

  async createUnit(payload: UnitCreatePayload): Promise<Unit> {
    const response = await apiClient.post<ApiResponse<Unit>>('/units/', payload);
    return response.data.data;
  },

  async updateUnit(id: string, payload: Partial<UnitCreatePayload>): Promise<Unit> {
    const response = await apiClient.put<ApiResponse<Unit>>(`/units/${id}/`, payload);
    return response.data.data;
  },

  async updateUnitStatus(id: string, status: UnitStatus, reason?: string): Promise<Unit> {
    const response = await apiClient.patch<ApiResponse<Unit>>(`/units/${id}/status/`, { status, reason });
    return response.data.data;
  },

  async deleteUnit(id: string): Promise<void> {
    await apiClient.delete(`/units/${id}/`);
  },
};

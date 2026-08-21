import apiClient from '../api/apiClient';
import { DashboardKPIs, FinancialReportData, ApiResponse } from '@/types';

export const dashboardService = {
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    const response = await apiClient.get<ApiResponse<DashboardKPIs>>('/reports/dashboard/');
    return response.data.data;
  },

  async getFinancialReport(params?: { year?: number; property?: string }): Promise<FinancialReportData> {
    const response = await apiClient.get<ApiResponse<FinancialReportData>>('/reports/financial-report/', {
      params,
    });
    return response.data.data;
  },
};

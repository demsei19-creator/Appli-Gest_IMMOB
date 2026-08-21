import apiClient from '../api/apiClient';
import {
  Expense,
  ExpenseCategory,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

export interface ExpenseCreatePayload {
  property: string;
  unit?: string;
  supplier?: string;
  category: ExpenseCategory;
  title: string;
  amount: string | number;
  expense_date: string;
  paid_to?: string;
  is_deductible?: boolean;
  notes?: string;
}

export interface ExpenseStats {
  expenses_count: number;
  total_amount: string;
  deductible_amount: string;
  non_deductible_amount: string;
  repairs_amount: string;
  maintenance_amount: string;
  insurance_amount: string;
  utilities_amount: string;
  management_amount: string;
  security_amount: string;
  mortgage_amount: string;
  other_amount: string;
}

export const expenseService = {
  async getExpenses(params?: {
    property?: string;
    unit?: string;
    category?: string;
    is_deductible?: boolean;
    month?: number;
    year?: number;
    search?: string;
  }): Promise<Expense[]> {
    const response = await apiClient.get<PaginatedResponse<Expense>>('/expenses/', { params });
    return response.data.data;
  },

  async getExpenseStats(params?: { month?: number; year?: number }): Promise<ExpenseStats> {
    const response = await apiClient.get<ApiResponse<ExpenseStats>>('/expenses/stats/', { params });
    return response.data.data;
  },

  async getExpenseDetail(id: string): Promise<Expense> {
    const response = await apiClient.get<ApiResponse<Expense>>(`/expenses/${id}/`);
    return response.data.data;
  },

  async createExpense(payload: ExpenseCreatePayload): Promise<Expense> {
    const response = await apiClient.post<ApiResponse<Expense>>('/expenses/', payload);
    return response.data.data;
  },

  async updateExpense(id: string, payload: Partial<ExpenseCreatePayload>): Promise<Expense> {
    const response = await apiClient.patch<ApiResponse<Expense>>(`/expenses/${id}/`, payload);
    return response.data.data;
  },

  async deleteExpense(id: string): Promise<void> {
    await apiClient.delete(`/expenses/${id}/`);
  },
};

import apiClient from '../api/apiClient';
import {
  Payment,
  ApiResponse,
  PaginatedResponse,
  PaymentMethod,
} from '@/types';

export interface PaymentCreatePayload {
  tenant: string;
  amount: string | number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  auto_allocate_fifo?: boolean;
  manual_allocations?: Array<{ invoice_id: string; amount: string | number }>;
}

export interface PaymentReceiptData {
  receipt_number: string;
  payment_number: string;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  amount: string;
  landlord: {
    name: string;
    email: string;
    phone: string;
  };
  tenant: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
  };
  allocations: Array<{
    invoice_number: string;
    period_start: string;
    period_end: string;
    property_name: string;
    unit_number: string;
    allocated_amount: string;
    invoice_status: string;
    remaining_balance: string;
  }>;
}

export interface PaymentStats {
  total_payments_count: number;
  total_collected_amount: string;
  bank_transfer_amount: string;
  cash_amount: string;
  check_amount: string;
  card_amount: string;
  other_amount: string;
}

export const paymentService = {
  async getPayments(params?: {
    tenant?: string;
    method?: string;
    month?: number;
    year?: number;
    search?: string;
  }): Promise<Payment[]> {
    const response = await apiClient.get<PaginatedResponse<Payment>>('/payments/', { params });
    return response.data.data;
  },

  async getPaymentStats(params?: { month?: number; year?: number }): Promise<PaymentStats> {
    const response = await apiClient.get<ApiResponse<PaymentStats>>('/payments/stats/', { params });
    return response.data.data;
  },

  async getPaymentDetail(id: string): Promise<Payment> {
    const response = await apiClient.get<ApiResponse<Payment>>(`/payments/${id}/`);
    return response.data.data;
  },

  async getPaymentReceipt(id: string): Promise<PaymentReceiptData> {
    const response = await apiClient.get<ApiResponse<PaymentReceiptData>>(`/payments/${id}/receipt/`);
    return response.data.data;
  },

  async createPayment(payload: PaymentCreatePayload): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<Payment>>('/payments/', payload);
    return response.data.data;
  },

  async cancelPayment(id: string, reason?: string): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<Payment>>(`/payments/${id}/cancel/`, { reason });
    return response.data.data;
  },
};

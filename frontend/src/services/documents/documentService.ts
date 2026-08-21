import apiClient from '../api/apiClient';
import {
  DocumentItem,
  DocumentType,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

export interface DocumentUploadPayload {
  title: string;
  document_type: DocumentType;
  file: File;
  property?: string;
  unit?: string;
  tenant?: string;
  lease?: string;
  description?: string;
}

export interface DocumentStats {
  total_documents: number;
  total_storage_bytes: number;
  storage_formatted: string;
  contracts_count: number;
  receipts_invoices_count: number;
  ids_count: number;
  photos_count: number;
}

export const documentService = {
  async getDocuments(params?: {
    document_type?: string;
    property?: string;
    unit?: string;
    tenant?: string;
    lease?: string;
    search?: string;
  }): Promise<DocumentItem[]> {
    const response = await apiClient.get<PaginatedResponse<DocumentItem>>('/documents/', { params });
    return response.data.data;
  },

  async getDocumentStats(): Promise<DocumentStats> {
    const response = await apiClient.get<ApiResponse<DocumentStats>>('/documents/stats/');
    return response.data.data;
  },

  async getDocumentDetail(id: string): Promise<DocumentItem> {
    const response = await apiClient.get<ApiResponse<DocumentItem>>(`/documents/${id}/`);
    return response.data.data;
  },

  async uploadDocument(payload: DocumentUploadPayload): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('document_type', payload.document_type);
    formData.append('file', payload.file);

    if (payload.property) formData.append('property', payload.property);
    if (payload.unit) formData.append('unit', payload.unit);
    if (payload.tenant) formData.append('tenant', payload.tenant);
    if (payload.lease) formData.append('lease', payload.lease);
    if (payload.description) formData.append('description', payload.description);

    const response = await apiClient.post<ApiResponse<DocumentItem>>('/documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}/`);
  },
};

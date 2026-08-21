import apiClient from '../api/apiClient';
import { User, ApiResponse } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  phone_number?: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface SubUserCreatePayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: 'MANAGER' | 'ACCOUNTANT';
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponseData {
  user: User;
  tokens: AuthTokens;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/auth/register/', payload);
    return response.data.data;
  },

  async login(payload: LoginPayload): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/auth/login/', payload);
    return response.data.data;
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await apiClient.post('/auth/auth/logout/', { refresh: refreshToken });
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/profile/');
    return response.data.data;
  },

  async updateProfile(payload: Partial<User>): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>('/auth/profile/', payload);
    return response.data.data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<string> {
    const response = await apiClient.post<ApiResponse<null>>('/auth/auth/change-password/', payload);
    return response.data.message || 'Mot de passe modifié avec succès.';
  },

  async getTeamMembers(): Promise<User[]> {
    const response = await apiClient.get<ApiResponse<User[]>>('/auth/team/');
    return response.data.data;
  },

  async createTeamMember(payload: SubUserCreatePayload): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>('/auth/team/', payload);
    return response.data.data;
  },

  async updateTeamMemberStatus(userId: string, isActive: boolean): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(`/auth/team/${userId}/status/`, {
      is_active: isActive,
    });
    return response.data.data;
  },
};

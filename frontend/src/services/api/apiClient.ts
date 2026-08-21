import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '@/app/config/env';
import { ApiErrorResponse } from '@/types';

export const apiClient = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request Interceptor: Attach JWT Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Extract error codes and message contract (Rule 37)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized & Token Refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${env.API_URL}/auth/refresh/`, { refresh: refreshToken });
          const newAccessToken = res.data.access;
          localStorage.setItem('access_token', newAccessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      }
    }

    // Format human-readable error from standardized API response
    const apiError = error.response?.data?.error;
    const customError = new Error(apiError?.message || error.message || 'Une erreur est survenue.');
    (customError as unknown as { code?: string; details?: unknown }).code = apiError?.code;
    (customError as unknown as { code?: string; details?: unknown }).details = apiError?.details;

    return Promise.reject(customError);
  }
);

export default apiClient;


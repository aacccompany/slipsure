// API Client with authentication and error handling
// Following Next.js best practices - client-side API calls only

import type {
  ApiResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyOTPRequest,
  AuthTokens,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  LineLoginRequest,
  UpdateProfileRequest,
  User,
  MerchantProfile,
  MerchantSettings,
  SubscriptionPlan,
  Subscription,
  CheckoutRequest,
  CheckoutResponse,
  QuotaStatus,
  Transaction,
  TransactionListResponse,
  Slip,
  SlipStatus,
  SlipListResponse,
  SlipStatsResponse,
  MerchantAnalyticsDashboard,
  MerchantAnalyticsUsage,
  LINEWebhookConfig,
  UpdateLINEWebhookRequest,
  LINEWebhookTestResponse,
  HealthStatus,
} from '@/types/api';

const normalizeApiBaseUrl = (url: string) => {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed.slice(0, -3) : trimmed;
};

const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
);

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthHeader(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthHeader();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred');
    }
  }

  private async requestWithFile<T>(
    endpoint: string,
    file: File,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthHeader();
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Upload failed');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred');
    }
  }

  private normalizeMerchantProfileResponse(
    response: ApiResponse<{ profile: MerchantProfile } | MerchantProfile>
  ): ApiResponse<{ profile: MerchantProfile }> {
    const data = response.data;

    if (data && 'profile' in data) {
      return response as ApiResponse<{ profile: MerchantProfile }>;
    }

    return {
      ...response,
      data: data ? { profile: data as MerchantProfile } : undefined,
    };
  }

  private normalizeLINEWebhookConfigResponse(
    response: ApiResponse<{ config: LINEWebhookConfig } | LINEWebhookConfig> & {
      config?: LINEWebhookConfig;
    }
  ): ApiResponse<{ config: LINEWebhookConfig }> {
    if (response.config) {
      return {
        ...response,
        success: response.success ?? true,
        data: { config: response.config },
      };
    }

    const data = response.data;

    if (data && 'config' in data) {
      return response as ApiResponse<{ config: LINEWebhookConfig }>;
    }

    return {
      ...response,
      success: response.success ?? Boolean(data),
      data: data ? { config: data as LINEWebhookConfig } : undefined,
    };
  }

  private normalizePlansResponse(
    response: ApiResponse<{ plans: SubscriptionPlan[] } | SubscriptionPlan[]>
  ): ApiResponse<{ plans: SubscriptionPlan[] }> {
    const data = response.data;

    if (Array.isArray(data)) {
      return {
        ...response,
        data: { plans: data },
      };
    }

    return response as ApiResponse<{ plans: SubscriptionPlan[] }>;
  }

  // Health Check
  async getHealth(): Promise<ApiResponse<HealthStatus>> {
    return this.request<HealthStatus>('/health');
  }

  // Auth Endpoints
  async register(data: RegisterRequest): Promise<ApiResponse<RegisterResponse>> {
    return this.request<RegisterResponse>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyOTP(data: VerifyOTPRequest): Promise<ApiResponse<AuthTokens>> {
    return this.request<AuthTokens>('/v1/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resendOTP(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v1/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async login(data: LoginRequest): Promise<ApiResponse<AuthTokens & { user: User }>> {
    return this.request('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async lineLogin(data: LineLoginRequest): Promise<ApiResponse<AuthTokens & { is_new_user: boolean; user: User }>> {
    return this.request('/v1/auth/line-login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/v1/auth/me');
  }

  async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<{ user: User }>> {
    return this.request('/v1/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async connectLine(data: LineLoginRequest): Promise<ApiResponse<{ message: string; user: User }>> {
    return this.request('/v1/auth/connect-line', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v1/auth/logout', {
      method: 'POST',
    });
  }

  // Plans
  async getPlans(): Promise<ApiResponse<{ plans: SubscriptionPlan[] }>> {
    const response = await this.request<{ plans: SubscriptionPlan[] } | SubscriptionPlan[]>('/v1/plans');
    return this.normalizePlansResponse(response);
  }

  // Checkout
  async createCheckout(data: CheckoutRequest): Promise<ApiResponse<CheckoutResponse>> {
    return this.request<CheckoutResponse>('/v1/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Merchant Profile
  async createMerchantProfile(data: Partial<MerchantProfile>): Promise<ApiResponse<{ profile: MerchantProfile }>> {
    const response = await this.request<{ profile: MerchantProfile } | MerchantProfile>('/v1/merchants/me/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return this.normalizeMerchantProfileResponse(response);
  }

  async getMerchantProfile(): Promise<ApiResponse<{ profile: MerchantProfile }>> {
    const response = await this.request<{ profile: MerchantProfile } | MerchantProfile>('/v1/merchants/me/profile');
    return this.normalizeMerchantProfileResponse(response);
  }

  async updateMerchantProfile(data: Partial<MerchantProfile>): Promise<ApiResponse<{ profile: MerchantProfile }>> {
    const response = await this.request<{ profile: MerchantProfile } | MerchantProfile>('/v1/merchants/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return this.normalizeMerchantProfileResponse(response);
  }

  async uploadLogo(file: File): Promise<ApiResponse<{ logo_url: string }>> {
    return this.requestWithFile('/v1/merchants/me/logo', file);
  }

  // Merchant Settings
  async getMerchantSettings(): Promise<ApiResponse<{ settings: MerchantSettings }>> {
    return this.request('/v1/merchants/me/settings');
  }

  async updateMerchantSettings(data: Partial<MerchantSettings>): Promise<ApiResponse<{ settings: MerchantSettings }>> {
    return this.request('/v1/merchants/me/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Subscription
  async getSubscription(): Promise<ApiResponse<{ subscription: Subscription }>> {
    return this.request('/v1/merchants/me/subscription');
  }

  async cancelSubscription(data: { cancel_immediately: boolean; reason: string }): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v1/merchants/me/subscription/cancel', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Quota
  async getQuota(): Promise<ApiResponse<QuotaStatus>> {
    return this.request('/v1/merchants/me/quota');
  }

  // Merchant Analytics
  async getMerchantAnalyticsDashboard(): Promise<ApiResponse<MerchantAnalyticsDashboard>> {
    return this.request('/v1/merchants/me/analytics/dashboard');
  }

  async getMerchantAnalyticsUsage(params?: { period?: '7d' | '30d' | '90d' }): Promise<ApiResponse<MerchantAnalyticsUsage>> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request(`/v1/merchants/me/analytics/usage${queryString ? `?${queryString}` : ''}`);
  }

  async exportMerchantAnalytics(params?: {
    format?: 'csv';
    start_date?: string;
    end_date?: string;
  }): Promise<Blob> {
    const queryString = new URLSearchParams({ format: 'csv', ...(params as any) }).toString();
    const token = this.getAuthHeader();
    const response = await fetch(`${this.baseURL}/v1/merchants/me/analytics/export?${queryString}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      throw new Error('Failed to export merchant analytics');
    }

    return response.blob();
  }

  // LINE Webhook Configuration
  async getLINEWebhookConfig(): Promise<ApiResponse<{ config: LINEWebhookConfig }>> {
    const response = await this.request<{ config: LINEWebhookConfig } | LINEWebhookConfig>('/v1/merchants/me/line-webhook') as ApiResponse<{ config: LINEWebhookConfig } | LINEWebhookConfig> & {
      config?: LINEWebhookConfig;
    };
    return this.normalizeLINEWebhookConfigResponse(response);
  }

  async updateLINEWebhookConfig(data: UpdateLINEWebhookRequest): Promise<ApiResponse<{ message: string; config: LINEWebhookConfig }>> {
    const response = await this.request<{ message: string; config: LINEWebhookConfig } | LINEWebhookConfig>('/v1/merchants/me/line-webhook', {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as ApiResponse<{ message: string; config: LINEWebhookConfig } | LINEWebhookConfig> & {
      config?: LINEWebhookConfig;
    };
    const normalized = this.normalizeLINEWebhookConfigResponse(response);
    return {
      ...normalized,
      data: normalized.data
        ? {
            message: response.message || ('message' in (response.data || {}) ? (response.data as { message?: string }).message || '' : ''),
            config: normalized.data.config,
          }
        : undefined,
    };
  }

  async deleteLINEWebhookConfig(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v1/merchants/me/line-webhook', {
      method: 'DELETE',
    });
  }

  async testLINEWebhook(): Promise<ApiResponse<{ result: LINEWebhookTestResponse }>> {
    const response = await this.request<{ result: LINEWebhookTestResponse }>('/v1/merchants/me/test', {
      method: 'POST',
    }) as ApiResponse<{ result: LINEWebhookTestResponse }> & {
      result?: LINEWebhookTestResponse;
    };

    if (response.result) {
      return {
        ...response,
        success: response.success ?? true,
        data: { result: response.result },
      };
    }

    return response;
  }

  async getWebhookURL(): Promise<ApiResponse<{ webhook_url: string; webhook_reference_id: string }>> {
    const response = await this.request<{ webhook_url: string; webhook_reference_id: string }>('/v1/merchants/me/webhook-url') as ApiResponse<{ webhook_url: string; webhook_reference_id: string }> & {
      webhook_url?: string;
      webhook_reference_id?: string;
    };

    if (response.webhook_url || response.webhook_reference_id) {
      return {
        ...response,
        success: response.success ?? true,
        data: {
          webhook_url: response.webhook_url || '',
          webhook_reference_id: response.webhook_reference_id || '',
        },
      };
    }

    return response;
  }

  // Slips
  async getSlip(slipId: string): Promise<ApiResponse<{ slip: Slip }>> {
    return this.request(`/v1/slips/${slipId}`);
  }

  async getSlips(params?: { page?: number; limit?: number; status?: SlipStatus }): Promise<ApiResponse<SlipListResponse>> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request(`/v1/slips${queryString ? `?${queryString}` : ''}`);
  }

  async getSlipStats(): Promise<ApiResponse<SlipStatsResponse>> {
    return this.request('/v1/slips/stats');
  }

  // Transactions
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<ApiResponse<TransactionListResponse>> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request(`/v1/transactions${queryString ? `?${queryString}` : ''}`);
  }

  async getTransaction(transactionId: string): Promise<ApiResponse<Transaction>> {
    return this.request(`/v1/transactions/${transactionId}`);
  }

  async exportTransactions(params?: {
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    format?: 'csv';
  }): Promise<Blob> {
    const queryString = new URLSearchParams({ format: 'csv', ...(params as any) }).toString();
    const token = this.getAuthHeader();
    const response = await fetch(`${this.baseURL}/v1/transactions/export?${queryString}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      throw new Error('Failed to export transactions');
    }

    return response.blob();
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Export token helpers
export const tokenManager = {
  setTokens: (tokens: AuthTokens) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    localStorage.setItem('expires_at', String(Date.now() + tokens.expires_in * 1000));
  },
  clearTokens: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
  },
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('access_token');
    const expiresAt = localStorage.getItem('expires_at');
    return !!token && (!!expiresAt ? Date.now() < parseInt(expiresAt) : true);
  },
};

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
  Slip,
  SlipUploadResponse,
  SlipListResponse,
  LINEWebhookConfig,
  UpdateLINEWebhookRequest,
  LINEWebhookTestResponse,
  HealthStatus,
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

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

    const headers: HeadersInit = {};
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

      const data = await response.json();

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
    return this.request('/v1/plans');
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
    return this.request('/v1/merchants/me/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMerchantProfile(): Promise<ApiResponse<{ profile: MerchantProfile }>> {
    return this.request('/v1/merchants/me/profile');
  }

  async updateMerchantProfile(data: Partial<MerchantProfile>): Promise<ApiResponse<{ profile: MerchantProfile }>> {
    return this.request('/v1/merchants/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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

  // LINE Webhook Configuration
  async getLINEWebhookConfig(): Promise<ApiResponse<{ config: LINEWebhookConfig }>> {
    return this.request('/v1/merchants/me/line-webhook');
  }

  async updateLINEWebhookConfig(data: UpdateLINEWebhookRequest): Promise<ApiResponse<{ message: string; config: LINEWebhookConfig }>> {
    return this.request('/v1/merchants/me/line-webhook', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLINEWebhookConfig(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v1/merchants/me/line-webhook', {
      method: 'DELETE',
    });
  }

  async testLINEWebhook(): Promise<ApiResponse<{ result: LINEWebhookTestResponse }>> {
    return this.request('/v1/merchants/me/test', {
      method: 'POST',
    });
  }

  async getWebhookURL(): Promise<ApiResponse<{ webhook_url: string; webhook_reference_id: string }>> {
    return this.request('/v1/merchants/me/webhook-url');
  }

  // Slips
  async uploadSlip(file: File): Promise<ApiResponse<SlipUploadResponse>> {
    return this.requestWithFile<SlipUploadResponse>('/v1/slips/upload', file);
  }

  async scanQR(data: ScanRequest): Promise<ApiResponse<any>> {
    return this.request('/v1/slips/scan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSlip(slipId: string): Promise<ApiResponse<{ slip: Slip }>> {
    return this.request(`/v1/slips/${slipId}`);
  }

  async reprocessSlip(slipId: string, data: { force_verify: boolean }): Promise<ApiResponse<{ slip_id: string; status: SlipStatus }>> {
    return this.request(`/v1/slips/${slipId}/reprocess`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSlips(params?: { page?: number; limit?: number; status?: SlipStatus }): Promise<ApiResponse<SlipListResponse>> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request(`/v1/slips${queryString ? `?${queryString}` : ''}`);
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

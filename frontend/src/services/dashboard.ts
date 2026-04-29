import axios from 'axios';
import { 
  UsageStats, 
  DailyUsage, 
  ApiKey, 
  WebhookEndpoint, 
  VerificationLog, 
  UserProfile 
} from '../types/dashboard';
import { mockDashboardData } from './mockDashboard';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'; // Set to false by default for production readiness

// Axios instance with auth header
const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const dashboardService = {
  // Stats & Charts
  getStats: async (): Promise<UsageStats> => {
    if (USE_MOCK) return mockDashboardData.stats();
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getDailyUsage: async (): Promise<DailyUsage[]> => {
    if (USE_MOCK) return mockDashboardData.dailyUsage();
    const response = await api.get('/dashboard/usage-daily');
    return response.data;
  },

  // API Keys
  getKeys: async (): Promise<ApiKey[]> => {
    if (USE_MOCK) return mockDashboardData.keys();
    const response = await api.get('/dashboard/keys');
    return response.data;
  },

  createKey: async (name: string): Promise<ApiKey> => {
    if (USE_MOCK) {
      const newKey: ApiKey = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        key: `sk_test_${Math.random().toString(36).substr(2, 20)}`,
        created_at: new Date().toISOString().split('T')[0],
        status: 'active'
      };
      return newKey;
    }
    const response = await api.post('/dashboard/keys', { name });
    return response.data;
  },

  deleteKey: async (id: string): Promise<void> => {
    if (USE_MOCK) return;
    await api.delete(`/dashboard/keys/${id}`);
  },

  // Webhooks
  getWebhooks: async (): Promise<WebhookEndpoint[]> => {
    if (USE_MOCK) return mockDashboardData.webhooks();
    const response = await api.get('/dashboard/webhooks');
    return response.data;
  },

  addWebhook: async (url: string, events: string[]): Promise<WebhookEndpoint> => {
    if (USE_MOCK) {
      return {
        id: Math.random().toString(36).substr(2, 9),
        url,
        events,
        status: 'healthy',
        last_sent: 'Never'
      };
    }
    const response = await api.post('/dashboard/webhooks', { url, events });
    return response.data;
  },

  // Logs
  getLogs: async (page = 1, search = ''): Promise<{ data: VerificationLog[], total: number }> => {
    if (USE_MOCK) return { data: mockDashboardData.logs(), total: 1248 };
    const response = await api.get('/dashboard/logs', { params: { page, search } });
    return response.data;
  },

  // Profile
  getProfile: async (): Promise<UserProfile> => {
    if (USE_MOCK) return mockDashboardData.profile();
    const response = await api.get('/dashboard/profile');
    return response.data;
  },

  updateProfile: async (profile: Partial<UserProfile>): Promise<UserProfile> => {
    if (USE_MOCK) return { ...mockDashboardData.profile(), ...profile };
    const response = await api.patch('/dashboard/profile', profile);
    return response.data;
  }
};

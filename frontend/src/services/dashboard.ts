import { 
  UsageStats, 
  DailyUsage, 
  ApiKey, 
  WebhookEndpoint, 
  VerificationLog, 
  UserProfile 
} from '../types/dashboard';
import { mockDashboardData } from './mockDashboard';

// STANDALONE MODE: Using Mock data as default since Backend is removed
const USE_MOCK = true; 

export const dashboardService = {
  // Stats & Charts
  getStats: async (): Promise<UsageStats> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    return mockDashboardData.stats();
  },

  getDailyUsage: async (): Promise<DailyUsage[]> => {
    return mockDashboardData.dailyUsage();
  },

  // API Keys
  getKeys: async (): Promise<ApiKey[]> => {
    return mockDashboardData.keys();
  },

  createKey: async (name: string): Promise<ApiKey> => {
    const newKey: ApiKey = {
      id: Math.random().toString(36).slice(2, 11),
      name,
      key: `sk_live_${Math.random().toString(36).slice(2, 22)}`,
      created_at: new Date().toISOString().split('T')[0],
      status: 'active'
    };
    return newKey;
  },

  deleteKey: async (id: string): Promise<void> => {
    return;
  },

  // Webhooks
  getWebhooks: async (): Promise<WebhookEndpoint[]> => {
    return mockDashboardData.webhooks();
  },

  addWebhook: async (url: string, events: string[]): Promise<WebhookEndpoint> => {
    return {
      id: Math.random().toString(36).slice(2, 11),
      url,
      events,
      status: 'healthy',
      last_sent: 'Never'
    };
  },

  // Logs
  getLogs: async (page = 1, search = ''): Promise<{ data: VerificationLog[], total: number }> => {
    return { data: mockDashboardData.logs(), total: 1248 };
  },

  // Profile
  getProfile: async (): Promise<UserProfile> => {
    return mockDashboardData.profile();
  },

  updateProfile: async (profile: Partial<UserProfile>): Promise<UserProfile> => {
    return { ...mockDashboardData.profile(), ...profile };
  }
};

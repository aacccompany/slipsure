import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface QuotaStatus {
  quota_limit: number;
  used: number;
  remaining: number;
  reset_date: string;
  is_blocked: boolean;
}

export interface MerchantSubscription {
  plan_id: string;
  status: string;
  billing_cycle: string;
  expires_at?: string;
  plan?: { name: string; quota_per_month: number };
}

export interface MerchantProfile {
  id: string;
  shop_name: string;
  logo_url?: string;
  contact_email?: string;
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  email_verified: boolean;
  line_linked: boolean;
}

export interface SlipLog {
  id: string;
  status: string;
  amount: number;
  sender_name: string;
  receiver_bank: string;
  transaction_ref: string;
  created_at: string;
}

export const dashboardApi = {
  getQuota: async (): Promise<QuotaStatus> => {
    const res = await api.get('/merchants/me/quota');
    return res.data.data;
  },

  getSubscription: async (): Promise<MerchantSubscription | null> => {
    try {
      const res = await api.get('/merchants/me/subscription');
      return res.data.data?.subscription ?? res.data.data;
    } catch {
      return null;
    }
  },

  getMerchantProfile: async (): Promise<MerchantProfile | null> => {
    try {
      const res = await api.get('/merchants/me/profile');
      return res.data.data?.profile ?? res.data.data;
    } catch {
      return null;
    }
  },

  getUserProfile: async (): Promise<UserProfile> => {
    const res = await api.get('/auth/me');
    return res.data.data;
  },

  getSlips: async (page = 1): Promise<{ data: SlipLog[]; total: number }> => {
    try {
      const res = await api.get(`/slips?page=${page}&limit=10`);
      return { data: res.data.data?.slips || [], total: res.data.data?.pagination?.total || 0 };
    } catch {
      return { data: [], total: 0 };
    }
  },
};

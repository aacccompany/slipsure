import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  merchant_id?: string;
  line_linked: boolean;
  email_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}

export const authApi = {
  register: async (data: { name: string; email: string; password: string; phone?: string }) => {
    const res = await api.post('/register', data);
    return res.data as { success: boolean; message: string; data: { email: string; otp_sent_to: boolean; message: string } };
  },

  login: async (email: string, password: string) => {
    const res = await api.post('/login', { email, password });
    return res.data as { success: boolean; data: AuthResponse };
  },

  verifyOTP: async (email: string, otp: string) => {
    const res = await api.post('/verify-otp', { email, otp });
    return res.data as { success: boolean; message: string; data: { access_token: string; refresh_token: string; expires_in: number; message: string } };
  },

  resendOTP: async (email: string) => {
    const res = await api.post('/resend-otp', { email });
    return res.data as { success: boolean; message: string };
  },

  forgotPassword: async (email: string) => {
    const res = await api.post('/forgot-password', { email });
    return res.data as { success: boolean; message: string };
  },

  resetPassword: async (email: string, otp: string, new_password: string) => {
    const res = await api.post('/reset-password', { email, otp, new_password });
    return res.data as { success: boolean; message: string };
  },

  updateProfile: async (data: { name: string; phone?: string }) => {
    const res = await api.put('/profile', data);
    return res.data as { success: boolean; message: string };
  },

  logout: async () => {
    const res = await api.post('/logout');
    return res.data as { success: boolean; message: string };
  },
};

export function saveAuthSession(data: AuthResponse) {
  localStorage.setItem('accessToken', data.access_token);
  localStorage.setItem('refreshToken', data.refresh_token);
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('user', JSON.stringify(data.user));
}

export function clearAuthSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('user');
  localStorage.removeItem('hasCompletedOnboarding');
}

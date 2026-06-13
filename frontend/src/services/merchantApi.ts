import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1';

const api = axios.create({
  baseURL: `${API_BASE_URL}/merchants/me`,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const merchantApi = {
  createProfile: async (data: {
    shop_name: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    strict_mode: boolean;
  }) => {
    const res = await api.post('/profile', data);
    return res.data as { success: boolean; message: string; data: { id: string } };
  },

  updateProfile: async (data: {
    shop_name: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
  }) => {
    const res = await api.put('/profile', data);
    return res.data as { success: boolean; message: string };
  },

  uploadLogo: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post('/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as { success: boolean; message: string; data: { logo_url: string } };
  },
};

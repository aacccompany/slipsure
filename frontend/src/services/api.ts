import axios from 'axios';
import { SlipVerificationResult } from '../types/slip';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const verifySlip = async (file: File, apiKey?: string): Promise<SlipVerificationResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const headers: any = {
    'Content-Type': 'multipart/form-data',
  };

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/verify-slip`, formData, {
      headers,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error verifying slip:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
    };
  }
};

import axios from 'axios';
import { SlipVerificationResult } from '../types/slip';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const verifySlip = async (file: File, apiKey?: string): Promise<SlipVerificationResult> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // MOCK SUCCESS RESPONSE for Frontend-only demo
  return {
    success: true,
    data: {
      amount: 1250.00,
      transRef: 'KB' + Math.floor(Date.now() / 1000),
      transDate: new Date().toISOString().split('T')[0],
      transTime: new Date().toLocaleTimeString('th-TH', { hour12: false }),
      sendingBank: 'KBANK',
      receivingBank: 'SCB',
      sender: { displayName: 'สมชาย ใจดี' },
      receiver: { displayName: 'บจก. สลิปชัวร์' }
    }
  };
};

import axios from 'axios';
import { SlipVerificationResult } from '../types/slip';
import { scanQRCode } from '../lib/qr-scanner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const verifySlip = async (file: File, apiKey?: string): Promise<SlipVerificationResult> => {
  // 1. First, scan the QR code locally in the browser
  const scanResult = await scanQRCode(file);
  
  if (!scanResult.success) {
    return {
      success: false,
      message: scanResult.error || 'ไม่พบรหัส QR ในรูปภาพสลิปของคุณ กรุณาตรวจสอบว่ารูปภาพมีความชัดเจน'
    };
  }

  // 2. Simulate processing delay for the "bank verification" step
  await new Promise(resolve => setTimeout(resolve, 2000));

  // MOCK SUCCESS RESPONSE based on a successful scan
  // In production, we would send scanResult.data to our backend here
  return {
    success: true,
    data: {
      amount: 1250.00,
      paidLocalAmount: 1250.00,
      paidLocalCurrency: 'THB',
      countryCode: 'TH',
      transRef: 'KB' + Math.floor(Date.now() / 1000),
      transDate: new Date().toISOString().split('T')[0],
      transTime: new Date().toLocaleTimeString('th-TH', { hour12: false }),
      sendingBank: 'KBANK',
      receivingBank: 'SCB',
      sender: { 
        displayName: 'สมชาย ใจดี',
        name: 'MR. SOMCHAI JAIDEE'
      },
      receiver: { 
        displayName: 'บจก. โฟลว์สลิป',
        name: 'FLOWSLIP CO., LTD.'
      }
    }
  };
};

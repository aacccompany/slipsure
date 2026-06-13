import { api, tokenManager } from '@/lib/api-client';
import { scanQRCode } from '@/lib/qr-scanner';
import type { SlipVerificationResult } from '@/types/slip';
import type { Slip } from '@/types/api';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatDatePart = (value?: string) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const formatTimePart = (value?: string) => {
  if (!value) return new Date().toLocaleTimeString('th-TH', { hour12: false });
  return new Date(value).toLocaleTimeString('th-TH', { hour12: false });
};

const toVerificationResult = (slip: Slip): SlipVerificationResult => {
  const transaction = slip.transaction;

  if (!transaction || slip.status !== 'verified') {
    return {
      success: false,
      message: slip.fail_reason || 'Slip verification failed. Please try another image.',
    };
  }

  return {
    success: true,
    data: {
      transRef: transaction.reference_no,
      sendingBank: transaction.sender_bank,
      receivingBank: transaction.receiver_bank,
      transDate: formatDatePart(transaction.transaction_time || transaction.transaction_date),
      transTime: formatTimePart(transaction.transaction_time),
      sender: {
        displayName: transaction.sender_account,
        name: transaction.sender_account,
      },
      receiver: {
        displayName: transaction.receiver_account,
        name: transaction.receiver_account,
      },
      amount: transaction.amount,
      paidLocalAmount: transaction.amount,
      paidLocalCurrency: 'THB',
      countryCode: 'TH',
    },
  };
};

export const verifySlip = async (file: File): Promise<SlipVerificationResult> => {
  const scanResult = await scanQRCode(file);

  if (!scanResult.success) {
    return {
      success: false,
      message: scanResult.error || 'No QR code was found in this slip image. Please upload a clearer image.',
    };
  }

  if (!tokenManager.isAuthenticated()) {
    return {
      success: false,
      message: 'Please sign in before verifying slips. The bank verification API requires a merchant account.',
    };
  }

  const uploadResponse = await api.uploadSlip(file);
  const slipId = uploadResponse.data?.slip_id;

  if (!uploadResponse.success || !slipId) {
    return {
      success: false,
      message: uploadResponse.error || uploadResponse.message || 'Upload failed. Please try again.',
    };
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slipResponse = await api.getSlip(slipId);
    const slip = slipResponse.data?.slip;

    if (slip && (slip.status === 'verified' || slip.status === 'failed')) {
      return toVerificationResult(slip);
    }

    await sleep(1500);
  }

  return {
    success: false,
    message: 'Slip is still processing. Check your dashboard again in a moment.',
  };
};

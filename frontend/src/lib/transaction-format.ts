import type { TransactionStatus } from '@/types/api';

export const STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  success: 'Success',
  failed: 'Failed',
};

export const FAIL_LABEL: Record<string, string> = {
  DUPLICATE_SLIP: 'Duplicate slip',
  AMOUNT_MISMATCH: 'Amount mismatch',
  TIMEOUT: 'Timed out',
  INVALID_QR: 'Invalid QR',
  BANK_ERROR: 'Bank error',
  EXPIRED_SLIP: 'Expired slip',
};

export function statusStyle(status: TransactionStatus) {
  switch (status) {
    case 'success':
      return { bg: '#ECFDF5', text: '#047857', dot: '#10B981' };
    case 'failed':
      return { bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' };
    case 'processing':
      return { bg: '#EFF6FF', text: '#1D4ED8', dot: '#2563EB' };
    default:
      return { bg: '#F8FAFC', text: '#64748B', dot: '#94A3B8' };
  }
}

export function formatTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

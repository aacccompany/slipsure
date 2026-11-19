import type { TransactionStatus } from '@/types/api';

export const STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: 'รอดำเนินการ',
  processing: 'กำลังตรวจสอบ',
  success: 'สำเร็จ',
  failed: 'ไม่สำเร็จ',
};

export const FAIL_LABEL: Record<string, string> = {
  DUPLICATE_SLIP: 'สลิปซ้ำ',
  AMOUNT_MISMATCH: 'ยอดเงินไม่ตรง',
  TIMEOUT: 'หมดเวลาตรวจสอบ',
  INVALID_QR: 'QR ไม่ถูกต้อง',
  BANK_ERROR: 'ธนาคารขัดข้อง',
  EXPIRED_SLIP: 'สลิปหมดอายุ',
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
  return new Date(value).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

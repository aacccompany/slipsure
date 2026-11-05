export const REASON_LABELS: Record<string, string> = {
  amount_mismatch: 'ยอดเงินไม่ตรง',
  duplicate_slip: 'สลิปซ้ำ',
  invalid_qr: 'QR ไม่ถูกต้อง',
  unknown: 'ไม่ทราบสาเหตุ',
  failed: 'ตรวจไม่ผ่าน',
  pending: 'รอตรวจสอบ',
  processing: 'กำลังตรวจสอบ',
};

export function formatReasonLabel(value?: string) {
  if (!value) return 'ไม่ทราบสาเหตุ';
  const key = value.toLowerCase();
  if (REASON_LABELS[key]) return REASON_LABELS[key];
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatSlipStatus(value?: string) {
  if (value === 'verified') return 'สำเร็จ';
  if (value === 'failed') return 'ไม่สำเร็จ';
  if (value === 'duplicate') return 'สลิปซ้ำ';
  if (value === 'pending') return 'รอตรวจสอบ';
  if (value === 'processing') return 'กำลังตรวจสอบ';
  return value || '-';
}

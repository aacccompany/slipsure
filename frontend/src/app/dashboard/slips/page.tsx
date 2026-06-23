'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Loader2, Upload, RefreshCw, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Slip, SlipStatus, FailReason } from '@/types/api';

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<SlipStatus, string> = {
  pending:    'รอดำเนินการ',
  processing: 'กำลังตรวจสอบ',
  verified:   'ยืนยันแล้ว',
  failed:     'ไม่ผ่าน',
};

const FAIL_LABEL: Record<FailReason, string> = {
  DUPLICATE_SLIP:  'สลิปซ้ำ',
  AMOUNT_MISMATCH: 'ยอดเงินไม่ตรง',
  TIMEOUT:         'หมดเวลา',
  INVALID_QR:      'QR Code ไม่ถูกต้อง',
  BANK_ERROR:      'ธนาคารผิดพลาด',
  EXPIRED_SLIP:    'สลิปหมดอายุ',
};

function statusColor(status: SlipStatus): { bg: string; text: string; dot: string } {
  switch (status) {
    case 'verified':   return { bg: '#ECFDF5', text: '#059669', dot: '#10B981' };
    case 'failed':     return { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' };
    case 'processing': return { bg: 'var(--blue-pale)', text: 'var(--blue)', dot: 'var(--blue)' };
    default:           return { bg: 'var(--bg-subtle)', text: 'var(--text-muted)', dot: 'var(--border-strong)' };
  }
}

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Result Card ────────────────────────────────────────────────────────────

function ResultCard({ slip }: { slip: Slip }) {
  const ok = slip.status === 'verified';
  const tx = slip.transaction;

  return (
    <div
      className="mb-8"
      style={{
        border: `1px solid ${ok ? '#A7F3D0' : '#FECACA'}`,
        background: ok ? '#F0FDF4' : '#FEF2F2',
      }}
    >
      {/* Header strip */}
      <div
        className="px-5 py-3 flex items-center gap-3"
        style={{ background: ok ? '#059669' : '#DC2626' }}
      >
        <span className="text-white text-base font-bold">{ok ? '✓' : '✗'}</span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-white">
          {ok ? 'ยืนยันสลิปสำเร็จ' : `ตรวจสอบไม่ผ่าน${slip.fail_reason ? ` · ${FAIL_LABEL[slip.fail_reason]}` : ''}`}
        </span>
      </div>

      <div className="p-5">
        {ok && tx ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['ยอดเงิน',     `฿${Number(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`],
              ['โอนจาก',      tx.sender_bank || '—'],
              ['ไปยัง',       tx.receiver_bank || '—'],
              ['เลขอ้างอิง',  tx.reference_no || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: '#059669' }}>{label}</p>
                <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#DC2626' }}>
            ไม่สามารถยืนยันสลิปได้ กรุณาตรวจสอบภาพสลิปและลองอีกครั้ง
          </p>
        )}
      </div>
    </div>
  );
}

// ── Upload Zone ────────────────────────────────────────────────────────────

function UploadZone({ onUpload }: { onUpload: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) onUpload(file);
    else toast.error('กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น');
  }, [onUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className="cursor-pointer transition-all"
      style={{
        border: `2px dashed ${dragging ? 'var(--blue)' : 'var(--border)'}`,
        background: dragging ? 'var(--blue-pale)' : '#fff',
        padding: '3rem',
      }}
    >
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} className="hidden" />
      <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
        <div className="w-12 h-12 flex items-center justify-center" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <Upload className="w-5 h-5" style={{ color: 'var(--blue)' }} />
        </div>
        <div>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--navy)' }}>
            วางไฟล์ที่นี่ หรือคลิกเพื่อเลือก
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            JPG · PNG · WEBP · ขนาดไม่เกิน 10MB
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Slip Row ───────────────────────────────────────────────────────────────

function SlipRow({ slip, onReprocess }: { slip: Slip; onReprocess: (id: string) => void }) {
  const colors = statusColor(slip.status);
  const tx = slip.transaction;

  return (
    <div
      className="grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[120px_1fr_160px_120px_80px] gap-4 items-center px-5 py-4 transition-colors hover:bg-[var(--bg-subtle)]"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Status */}
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colors.dot }} />
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: colors.text }}>
          {STATUS_LABEL[slip.status]}
        </span>
      </div>

      {/* Slip info */}
      <div className="min-w-0">
        {tx ? (
          <div>
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--navy)' }}>
              ฿{Number(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              <span className="font-normal text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                {tx.sender_bank} → {tx.receiver_bank}
              </span>
            </p>
            <p className="font-mono text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {tx.reference_no || slip.id.slice(0, 16)}
            </p>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>
              {slip.fail_reason ? FAIL_LABEL[slip.fail_reason] : 'ไม่มีข้อมูลธุรกรรม'}
            </p>
            <p className="font-mono text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {slip.id.slice(0, 16)}...
            </p>
          </div>
        )}
      </div>

      {/* Time — hidden on mobile */}
      <p className="font-mono text-[10px] hidden md:block" style={{ color: 'var(--text-muted)' }}>
        {formatTime(slip.created_at)}
      </p>

      {/* Duplicate badge — hidden on mobile */}
      <div className="hidden md:block">
        {tx?.is_duplicate && (
          <span className="font-mono text-[9px] px-2 py-1 uppercase tracking-widest"
            style={{ background: '#FFF7ED', color: '#D97706', border: '1px solid #FCD34D' }}>
            ซ้ำ
          </span>
        )}
      </div>

      {/* Reprocess button */}
      <div className="flex justify-end">
        {slip.status === 'failed' && (
          <button
            onClick={() => onReprocess(slip.id)}
            className="p-1.5 transition-colors"
            title="ตรวจสอบใหม่"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--blue)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SlipsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [latestSlip, setLatestSlip] = useState<Slip | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['slips', page],
    queryFn: () => api.getSlips({ page, limit: 15 }),
    refetchInterval: latestSlip?.status === 'processing' ? 2000 : false,
  });

  const slips = listData?.data?.slips ?? [];
  const pagination = listData?.data?.pagination;

  // Poll a specific slip until terminal status
  const pollSlip = useCallback(async (slipId: string) => {
    if (pollRef.current) clearTimeout(pollRef.current);

    const check = async (attempts: number) => {
      if (attempts >= 12) {
        setUploading(false);
        toast.error('ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
        return;
      }
      try {
        const res = await api.getSlip(slipId);
        const slip = res.data?.slip;
        if (!slip) return;

        if (slip.status === 'verified' || slip.status === 'failed') {
          setLatestSlip(slip);
          setUploading(false);
          queryClient.invalidateQueries({ queryKey: ['slips'] });
          queryClient.invalidateQueries({ queryKey: ['slip-stats'] });
          queryClient.invalidateQueries({ queryKey: ['quota'] });
        } else {
          pollRef.current = setTimeout(() => check(attempts + 1), 1500);
        }
      } catch {
        pollRef.current = setTimeout(() => check(attempts + 1), 1500);
      }
    };
    check(0);
  }, [queryClient]);

  const handleUpload = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    setLatestSlip(null);

    try {
      const res = await api.uploadSlip(file);
      if (!res.success || !res.data?.slip_id) {
        throw new Error(res.message || 'อัพโหลดไม่สำเร็จ');
      }
      pollSlip(res.data.slip_id);
    } catch (err) {
      setUploading(false);
      toast.error(err instanceof Error ? err.message : 'อัพโหลดไม่สำเร็จ');
    }
  };

  const handleReprocess = async (slipId: string) => {
    try {
      await api.reprocessSlip(slipId);
      toast.success('เพิ่มคิวตรวจสอบใหม่แล้ว');
      queryClient.invalidateQueries({ queryKey: ['slips'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="p-6 md:p-8" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
          / ตรวจสอบสลิป
        </p>
        <h1 className="font-bold tracking-tight" style={{ fontSize: '1.75rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
          ตรวจสอบสลิป
        </h1>
      </div>

      {/* Upload zone */}
      {uploading ? (
        <div
          className="flex flex-col items-center justify-center gap-3 mb-8"
          style={{ border: '2px dashed var(--blue)', background: 'var(--blue-pale)', padding: '3rem' }}
        >
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--blue)' }} />
          <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>กำลังตรวจสอบสลิป...</p>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            กรุณารอสักครู่
          </p>
        </div>
      ) : (
        <div className="mb-8">
          <UploadZone onUpload={handleUpload} />
        </div>
      )}

      {/* Result */}
      {latestSlip && !uploading && <ResultCard slip={latestSlip} />}

      {/* History */}
      <div className="bg-white" style={{ border: '1px solid var(--border)' }}>

        {/* Table header */}
        <div
          className="hidden md:grid grid-cols-[120px_1fr_160px_120px_80px] gap-4 px-5 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
        >
          {['สถานะ', 'รายละเอียด', 'เวลา', '', ''].map((h, i) => (
            <p key={i} className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</p>
          ))}
        </div>

        {/* Section label row */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            ประวัติสลิป
          </span>
          {pagination && (
            <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
              ทั้งหมด {pagination.total.toLocaleString()} รายการ
            </span>
          )}
        </div>

        {/* List */}
        {listLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
          </div>
        ) : slips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 flex items-center justify-center" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <ImageIcon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>ยังไม่มีสลิป</p>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              อัพโหลดสลิปด้านบนเพื่อเริ่มตรวจสอบ
            </p>
          </div>
        ) : (
          slips.map((slip) => (
            <SlipRow key={slip.id} slip={slip} onReprocess={handleReprocess} />
          ))
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 transition-all disabled:opacity-30"
              style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
            >
              ← ก่อนหน้า
            </button>
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              หน้า {page} / {pagination.total_pages}
            </span>
            <button
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 transition-all disabled:opacity-30"
              style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
            >
              ถัดไป →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

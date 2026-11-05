'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

type ReportPeriod = 'all' | 'today' | '7d' | '30d' | 'month' | 'selectedMonth' | 'custom';

export function AdminReportExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [period, setPeriod] = useState<ReportPeriod>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPeriod('all');
      setStartDate('');
      setEndDate('');
      setSelectedMonth(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).format(new Date()));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  const download = async () => {
    if (period === 'custom' && (!startDate || !endDate || startDate > endDate)) {
      toast.error('กรุณาเลือกช่วงวันที่ให้ถูกต้อง');
      return;
    }
    if (period === 'selectedMonth' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)) {
      toast.error('กรุณาเลือกเดือนและปี');
      return;
    }
    setBusy(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthEnd = period === 'selectedMonth' ? new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) : '';
      const blob = await api.exportAdminReport({
        report_period: period === 'selectedMonth' ? 'custom' : period,
        export_type: 'full',
        format: 'xlsx',
        timezone: 'Asia/Bangkok',
        ...(period === 'custom' ? { start_date: startDate, end_date: endDate } : {}),
        ...(period === 'selectedMonth' ? { start_date: `${selectedMonth}-01`, end_date: monthEnd } : {}),
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const digits = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }).format(new Date()).replace(/[-: ]/g, '');
      anchor.download = `FlowSlip_รายงานแอดมิน_${digits.slice(0, 8)}_${digits.slice(8)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="admin-report-title" className="w-full max-w-md border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="admin-report-title" className="text-lg font-bold text-[var(--ink)]">ดาวน์โหลดรายงานแพลตฟอร์ม</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">ร้านค้าทั้งหมด · Excel (.xlsx)</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="ปิด" className="p-1 text-[var(--text-muted)] hover:text-[var(--ink)]"><X className="h-5 w-5" /></button>
        </div>
        <label htmlFor="admin-report-period" className="mb-1 block text-xs font-semibold text-[var(--text)]">ช่วงเวลารายงาน</label>
        <select id="admin-report-period" value={period} onChange={(event) => setPeriod(event.target.value as ReportPeriod)} className="w-full border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--ink)]">
          <option value="all">ทั้งหมด</option>
          <option value="today">วันนี้</option>
          <option value="7d">7 วันที่ผ่านมา</option>
          <option value="30d">30 วันที่ผ่านมา</option>
          <option value="month">เดือนนี้</option>
          <option value="selectedMonth">เลือกเดือน/ปี</option>
          <option value="custom">กำหนดช่วงวันที่</option>
        </select>
        {period === 'selectedMonth' && <div className="mt-3">
          <label htmlFor="admin-report-month" className="mb-1 block text-xs text-[var(--text)]">เดือนและปี</label>
          <input id="admin-report-month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="w-full min-w-0 border border-[var(--border-strong)] bg-[var(--bg-card)] px-2 py-2 text-sm text-[var(--ink)]" />
        </div>}
        {period === 'custom' && <div className="mt-3 grid grid-cols-2 gap-3">
          <div><label htmlFor="admin-report-start" className="mb-1 block text-xs text-[var(--text)]">วันที่เริ่ม</label><input id="admin-report-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full min-w-0 border border-[var(--border-strong)] bg-[var(--bg-card)] px-2 py-2 text-sm text-[var(--ink)]" /></div>
          <div><label htmlFor="admin-report-end" className="mb-1 block text-xs text-[var(--text)]">วันที่สิ้นสุด</label><input id="admin-report-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full min-w-0 border border-[var(--border-strong)] bg-[var(--bg-card)] px-2 py-2 text-sm text-[var(--ink)]" /></div>
        </div>}
        <p className="mt-5 text-xs font-semibold text-[var(--text)]">รายงานฉบับเต็ม (6 ชีต)</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text)]">ยกเลิก</button>
          <button type="button" onClick={download} disabled={busy} className="inline-flex items-center gap-2 bg-[var(--navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} ดาวน์โหลด XLSX
          </button>
        </div>
      </div>
    </div>
  );
}

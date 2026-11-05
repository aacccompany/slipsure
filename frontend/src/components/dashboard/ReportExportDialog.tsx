'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

type Period = 'today' | '7d' | '30d' | 'month' | 'custom' | 'all';
type ReportType = 'full' | 'slips' | 'summary';

function dateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function datesForPeriod(period: Period, customStart: string, customEnd: string) {
  const now = new Date();
  const today = dateKey(now);
  if (period === 'all') return { start_date: undefined, end_date: undefined };
  if (period === 'custom') return { start_date: customStart, end_date: customEnd };
  if (period === 'today') return { start_date: today, end_date: today };
  if (period === 'month') return { start_date: `${today.slice(0, 7)}-01`, end_date: today };
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (period === '7d' ? 6 : 29));
  return { start_date: start.toISOString().slice(0, 10), end_date: today };
}

export function ReportExportDialog({ open, onClose, startDate = '', endDate = '', initialPeriod = 'all' }: {
  open: boolean;
  onClose: () => void;
  startDate?: string;
  endDate?: string;
  initialPeriod?: Period;
}) {
  const [period, setPeriod] = useState<Period>('all');
  const [reportType, setReportType] = useState<ReportType>('full');
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomStart(startDate);
      setCustomEnd(endDate);
      setPeriod(startDate && endDate ? 'custom' : initialPeriod);
      setReportType('full');
    }
  }, [open, startDate, endDate, initialPeriod]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, busy, onClose]);

  if (!open) return null;

  const download = async () => {
    const dates = datesForPeriod(period, customStart, customEnd);
    if ((dates.start_date && !dates.end_date) || (!dates.start_date && dates.end_date) ||
        (period === 'custom' && (!dates.start_date || !dates.end_date)) ||
        (dates.start_date && dates.end_date && dates.start_date > dates.end_date)) {
      toast.error('กรุณาเลือกวันเริ่มต้นและวันสิ้นสุดให้ถูกต้อง');
      return;
    }
    setBusy(true);
    try {
      const blob = await api.exportMerchantReport({ ...dates, type: reportType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FlowSlip_รายงานร้านค้า_${dateKey(new Date())}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message.includes('25,000')
        ? 'รายงานมีมากกว่า 25,000 รายการ กรุณาเลือกช่วงวันที่สั้นลง'
        : 'ดาวน์โหลดรายงานไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="report-export-title" className="w-full max-w-md border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="report-export-title" className="text-lg font-bold text-slate-950">ดาวน์โหลดรายงาน</h2>
            <p className="mt-1 text-xs text-slate-500">ไฟล์ Excel (.xlsx)</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="ปิด" className="p-1 text-slate-500 hover:text-slate-950"><X className="h-5 w-5" /></button>
        </div>
        <label htmlFor="report-period" className="mb-1 block text-xs font-semibold text-slate-700">ช่วงเวลาของรายงาน</label>
        <select id="report-period" value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950">
          <option value="today">วันนี้</option>
          <option value="7d">7 วันที่ผ่านมา</option>
          <option value="30d">30 วันที่ผ่านมา</option>
          <option value="month">เดือนนี้</option>
          <option value="custom">กำหนดช่วงวันที่เอง</option>
          <option value="all">ทั้งหมด</option>
        </select>
        {period === 'custom' && <div className="mt-3 grid grid-cols-2 gap-3">
          <div><label htmlFor="report-start" className="mb-1 block text-xs text-slate-700">วันที่เริ่มต้น</label><input id="report-start" type="date" lang="th-TH" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="w-full min-w-0 border border-slate-300 px-2 py-2 text-sm" /></div>
          <div><label htmlFor="report-end" className="mb-1 block text-xs text-slate-700">วันที่สิ้นสุด</label><input id="report-end" type="date" lang="th-TH" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="w-full min-w-0 border border-slate-300 px-2 py-2 text-sm" /></div>
        </div>}
        <label htmlFor="report-type" className="mb-1 mt-5 block text-xs font-semibold text-slate-700">ประเภทรายงาน</label>
        <select id="report-type" value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)} className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950">
          <option value="full">รายงานทั้งหมด (4 ชีต)</option>
          <option value="slips">รายการตรวจสลิปและสรุปผล</option>
          <option value="summary">สรุปผลเท่านั้น</option>
        </select>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="border border-slate-300 px-4 py-2 text-sm text-slate-700">ยกเลิก</button>
          <button type="button" onClick={download} disabled={busy} className="inline-flex items-center gap-2 bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} ดาวน์โหลด Excel
          </button>
        </div>
      </div>
    </div>
  );
}

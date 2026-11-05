'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

type ExportPeriod = 'all' | 'last7' | 'thisMonth' | 'selectedMonth' | 'custom';
export type AdminCSVExportKind = 'transactions' | 'users' | 'merchants' | 'billing';

type ExportFilters = {
  status: string;
  search: string;
  startDate: string;
  endDate: string;
};

function bangkokToday() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function dateShift(date: string, days: number) {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

const exportTitles: Record<AdminCSVExportKind, string> = {
  transactions: 'ส่งออกประวัติการตรวจสลิป',
  users: 'ส่งออกรายชื่อผู้ใช้',
  merchants: 'ส่งออกรายชื่อร้านค้า',
  billing: 'ส่งออกรายการชำระเงิน',
};

const statusOptions: Record<AdminCSVExportKind, { value: string; label: string }[]> = {
  transactions: [
    { value: 'verified', label: 'สำเร็จ' }, { value: 'failed', label: 'ไม่สำเร็จ' },
    { value: 'duplicate', label: 'สลิปซ้ำ' }, { value: 'pending', label: 'รอตรวจสอบ' },
    { value: 'processing', label: 'กำลังตรวจสอบ' },
  ],
  users: [
    { value: 'active', label: 'ใช้งาน' }, { value: 'blocked', label: 'ถูกระงับ' },
    { value: 'verified', label: 'ยืนยันอีเมลแล้ว' }, { value: 'unverified', label: 'ยังไม่ยืนยันอีเมล' },
    { value: 'line_linked', label: 'เชื่อมต่อ LINE แล้ว' }, { value: 'line_unlinked', label: 'ยังไม่เชื่อมต่อ LINE' },
  ],
  merchants: [
    { value: 'active', label: 'ใช้งาน' }, { value: 'inactive', label: 'ไม่ใช้งาน' },
    { value: 'trial', label: 'ทดลองใช้' }, { value: 'pending', label: 'รอดำเนินการ' },
    { value: 'suspended', label: 'ระงับ' }, { value: 'cancelled', label: 'ยกเลิก' },
    { value: 'expired', label: 'หมดอายุ' },
  ],
  billing: [
    { value: 'success', label: 'สำเร็จ' }, { value: 'pending', label: 'รอดำเนินการ' },
    { value: 'failed', label: 'ไม่สำเร็จ' }, { value: 'refunded', label: 'คืนเงินแล้ว' },
  ],
};

export function AdminCSVExportDialog({
  kind, onClose, initialFilters,
}: { kind: AdminCSVExportKind; onClose: () => void; initialFilters: ExportFilters }) {
  const [period, setPeriod] = useState<ExportPeriod>(initialFilters.startDate || initialFilters.endDate ? 'custom' : 'all');
  const [status, setStatus] = useState(initialFilters.status);
  const [search, setSearch] = useState(initialFilters.search);
  const [role, setRole] = useState('merchant');
  const [month, setMonth] = useState(() => bangkokToday().slice(0, 7));
  const [startDate, setStartDate] = useState(initialFilters.startDate);
  const [endDate, setEndDate] = useState(initialFilters.endDate);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  const download = async () => {
    if (period === 'custom' && startDate && endDate && startDate > endDate) {
      toast.error('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม');
      return;
    }
    if (period === 'selectedMonth' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      toast.error('กรุณาเลือกเดือนและปี');
      return;
    }

    const today = bangkokToday();
    let from = '';
    let to = '';
    if (period === 'last7') {
      from = dateShift(today, -6);
      to = today;
    } else if (period === 'thisMonth') {
      from = `${today.slice(0, 7)}-01`;
      to = today;
    } else if (period === 'selectedMonth') {
      const [year, selectedMonth] = month.split('-').map(Number);
      from = `${month}-01`;
      to = new Date(Date.UTC(year, selectedMonth, 0)).toISOString().slice(0, 10);
    } else if (period === 'custom') {
      from = startDate;
      to = endDate;
    }

    setBusy(true);
    try {
      const dateParams = { start_date: from || undefined, end_date: to || undefined };
      const selectedStatus = status || undefined;
      const keyword = search.trim() || undefined;
      let blob: Blob;
      switch (kind) {
        case 'users':
          blob = await api.exportAdminUsers({ role: role || undefined, status: selectedStatus, search: keyword, ...dateParams });
          break;
        case 'merchants':
          blob = await api.exportAdminMerchants({ status: selectedStatus, search: keyword, ...dateParams });
          break;
        case 'billing':
          blob = await api.exportAdminPayments({ status: selectedStatus, ...dateParams });
          break;
        case 'transactions':
          blob = await api.exportAdminSlipHistory({ status: selectedStatus, search: keyword, ...dateParams });
          break;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `FlowSlip_${kind}_${today}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ส่งออกไฟล์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'h-10 w-full min-w-0 border border-slate-300 bg-white px-3 text-sm text-slate-950';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="admin-transactions-export-title" className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto border border-zinc-200 bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="admin-transactions-export-title" className="text-lg font-bold text-slate-950">{exportTitles[kind]}</h2>
            <p className="mt-1 text-xs text-slate-500">CSV · ข้อมูลทั้งหมดตามตัวกรอง</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="ปิด" className="p-1 text-slate-500 hover:text-slate-950 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="admin-transactions-export-period" className="mb-1 block text-xs font-semibold text-slate-700">ช่วงเวลา</label>
            <select id="admin-transactions-export-period" value={period} onChange={(event) => setPeriod(event.target.value as ExportPeriod)} className={inputClass}>
              <option value="all">ทั้งหมด</option>
              <option value="last7">7 วันที่ผ่านมา</option>
              <option value="thisMonth">เดือนนี้</option>
              <option value="selectedMonth">เลือกเดือน/ปี</option>
              <option value="custom">กำหนดวันที่</option>
            </select>
          </div>
          {period === 'selectedMonth' && (
            <div>
              <label htmlFor="admin-transactions-export-month" className="mb-1 block text-xs font-semibold text-slate-700">เดือนและปี</label>
              <input id="admin-transactions-export-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className={inputClass} />
            </div>
          )}
          {period === 'custom' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="admin-transactions-export-start" className="mb-1 block text-xs font-semibold text-slate-700">วันที่เริ่ม</label>
                <input id="admin-transactions-export-start" type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="admin-transactions-export-end" className="mb-1 block text-xs font-semibold text-slate-700">วันที่สิ้นสุด</label>
                <input id="admin-transactions-export-end" type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className={inputClass} />
              </div>
            </div>
          )}
          {kind === 'users' && (
            <div>
              <label htmlFor="admin-csv-export-role" className="mb-1 block text-xs font-semibold text-slate-700">ประเภทผู้ใช้</label>
              <select id="admin-csv-export-role" value={role} onChange={(event) => setRole(event.target.value)} className={inputClass}>
                <option value="merchant">ผู้ใช้ร้านค้า</option>
                <option value="admin">ผู้ดูแลระบบ</option>
                <option value="">ทั้งหมด</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="admin-transactions-export-status" className="mb-1 block text-xs font-semibold text-slate-700">สถานะ</label>
            <select id="admin-transactions-export-status" value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
              <option value="">ทั้งหมด</option>
              {statusOptions[kind].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          {kind !== 'billing' && <div>
            <label htmlFor="admin-transactions-export-search" className="mb-1 block text-xs font-semibold text-slate-700">คำค้นหา</label>
            <input id="admin-transactions-export-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} />
          </div>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-10 border border-slate-300 px-4 text-sm text-slate-700 disabled:opacity-50">ยกเลิก</button>
          <button type="button" onClick={download} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            ดาวน์โหลด CSV
          </button>
        </div>
      </div>
    </div>
  );
}

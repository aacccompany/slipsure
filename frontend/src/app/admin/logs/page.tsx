'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAuth } from '@/contexts/auth-context';
import { api, type AdminAuditLogFilters } from '@/lib/api-client';
import type { AdminAuditLog } from '@/types/api';

const actions: Record<string, string> = {
  ADMIN_LOGIN: 'เข้าสู่ระบบ', ADMIN_LINE_LOGIN: 'เข้าสู่ระบบด้วย LINE', ADMIN_LOGOUT: 'ออกจากระบบ',
  ADMIN_ACCESS_DENIED: 'ถูกปฏิเสธการเข้าถึง', UPDATE_USER_STATUS: 'เปลี่ยนสถานะผู้ใช้',
  ADJUST_MERCHANT_QUOTA: 'ปรับโควต้าร้านค้า', UPDATE_ALERT_RECIPIENT: 'เปลี่ยนผู้รับแจ้งเตือน',
  VIEW_MERCHANT_DETAIL: 'ดูข้อมูลร้านค้า', VIEW_PAYMENT_DETAIL: 'ดูข้อมูลการชำระเงิน',
  VIEW_AUDIT_DETAIL: 'ดูรายละเอียดบันทึก', EXPORT_USERS: 'ส่งออกผู้ใช้',
  EXPORT_MERCHANTS: 'ส่งออกร้านค้า', EXPORT_PAYMENTS: 'ส่งออกการชำระเงิน',
  EXPORT_SLIPS: 'ส่งออกรายการสลิป', EXPORT_PLATFORM_REPORT: 'ส่งออกรายงานระบบ',
  EXPORT_AUDIT_LOGS: 'ส่งออกบันทึกผู้ดูแล', ADMIN_MUTATION: 'เปลี่ยนข้อมูลระบบ',
};
const categories: Record<string, string> = {
  authentication: 'การเข้าสู่ระบบ', security: 'ความปลอดภัย', user: 'ผู้ใช้',
  merchant: 'ร้านค้า', subscription: 'แพ็กเกจและโควต้า', payment: 'การชำระเงิน',
  configuration: 'การตั้งค่า', export: 'การส่งออก',
};
const fieldNames: Record<string, string> = {
  name: 'ชื่อ', email: 'อีเมล', role: 'บทบาท', is_active: 'สถานะใช้งาน',
  plan: 'แพ็กเกจ', quota_extra: 'โควต้าเพิ่มเติม', extra_expires_at: 'หมดอายุโควต้าเพิ่มเติม',
  custom_recipient_configured: 'กำหนดผู้รับแจ้งเตือน', shop_name: 'ชื่อร้าน',
};

function dateTime(value: string) {
  return new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'ใช่' : 'ไม่';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function AuditDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery({ queryKey: ['admin-audit-detail', id], queryFn: () => api.getAdminLog(id) });
  const item = query.data?.data;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg bg-[var(--bg-card)] p-5 shadow-xl sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <h2 id="audit-detail-title" className="text-lg font-semibold text-[var(--ink)]">รายละเอียดบันทึกผู้ดูแล</h2>
          <button type="button" onClick={onClose} title="ปิด" aria-label="ปิด" className="rounded p-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"><X className="h-4 w-4" /></button>
        </div>
        {query.isLoading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : query.isError || !item ? (
          <p className="py-8 text-sm text-[var(--err-ink)]">โหลดรายละเอียดไม่สำเร็จ</p>
        ) : (
          <div className="space-y-5 pt-5 text-sm text-[var(--ink)]">
            <div className="flex flex-wrap items-center gap-3">
              <strong>{actions[item.action] ?? item.action}</strong>
              <span className={item.status === 'success' ? 'text-[var(--ok-ink)]' : 'text-[var(--err-ink)]'}>{item.status === 'success' ? 'สำเร็จ' : 'ไม่สำเร็จ'}</span>
            </div>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {[
                ['วันเวลา', dateTime(item.created_at)], ['ผู้ดูแล', item.admin_email || '-'],
                ['หมวดหมู่', categories[item.category] ?? item.category], ['เป้าหมาย', item.target_name || item.target_id || '-'],
                ['การกระทำ', item.action], ['IP', item.ip_address || '-'],
                ['สถานะ HTTP', valueText(item.metadata?.http_status)], ['อุปกรณ์', item.user_agent || '-'],
              ].map(([label, value]) => <div key={label} className="min-w-0 border-b border-[var(--border)] pb-2"><dt className="text-xs text-[var(--text-muted)]">{label}</dt><dd className="mt-1 break-all">{value}</dd></div>)}
            </dl>
            {(item.old_values || item.new_values) && <div>
              <h3 className="mb-3 font-semibold">ข้อมูลที่เปลี่ยน</h3>
              <div className="overflow-x-auto border border-[var(--border)]">
                <table className="w-full min-w-[420px] text-left text-xs sm:text-sm">
                  <thead className="bg-[var(--bg-subtle)]"><tr><th className="p-2">ข้อมูล</th><th className="p-2">ก่อน</th><th className="p-2">หลัง</th></tr></thead>
                  <tbody>{Array.from(new Set([...Object.keys(item.old_values ?? {}), ...Object.keys(item.new_values ?? {})])).map((key) => (
                    <tr key={key} className="border-t border-[var(--border)]"><th className="p-2 font-medium">{fieldNames[key] ?? key}</th><td className="break-all p-2">{valueText(item.old_values?.[key])}</td><td className="break-all p-2">{valueText(item.new_values?.[key])}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass = 'h-9 w-full min-w-0 rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--ink)]';

export default function AdminLogsPage() {
  const { user, isLoading } = useAuth();
  const [filters, setFilters] = useState<AdminAuditLogFilters>({});
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [adminID, setAdminID] = useState('');
  const [targetID, setTargetID] = useState('');
  const [page, setPage] = useState(1);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const enabled = !isLoading && user?.role === 'admin';
  const query = useQuery({
    queryKey: ['admin-audit-logs', filters, page],
    queryFn: () => api.getAdminLogs({ ...filters, page, limit: 20 }),
    enabled,
  });
  const items = query.data?.data?.items ?? [];
  const pagination = query.data?.data?.pagination;
  const updateFilter = (key: keyof AdminAuditLogFilters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value || undefined }));
    setPage(1);
  };
  const download = async () => {
    setExporting(true);
    try {
      const blob = await api.exportAdminLogs(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ส่งออกไม่สำเร็จ');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!enabled) return <div className="p-6 text-sm text-[var(--err-ink)]">ไม่มีสิทธิ์ดูบันทึกผู้ดูแล</div>;

  return <AdminShell>
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <h1 className="text-xl font-semibold text-[var(--ink)]">บันทึกผู้ดูแล</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => query.refetch()} title="รีเฟรช" aria-label="รีเฟรช" className="rounded border border-[var(--border)] p-2 text-[var(--ink)]"><RefreshCw className="h-4 w-4" /></button>
          <button type="button" onClick={download} disabled={exporting} className="inline-flex items-center gap-2 rounded bg-[var(--navy)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><Download className="h-4 w-4" />ส่งออก CSV</button>
        </div>
      </header>
      <form onSubmit={(event) => { event.preventDefault(); setFilters((previous) => ({ ...previous, search: search.trim() || undefined, action: action.trim() || undefined, admin_id: adminID.trim() || undefined, target_id: targetID.trim() || undefined })); setPage(1); }} className="grid gap-3 border-b border-[var(--border)] pb-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-[var(--text-muted)]">ค้นหา<input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ผู้ดูแล เป้าหมาย การกระทำ" /></label>
        <label className="text-xs text-[var(--text-muted)]">หมวดหมู่<select className={inputClass} value={filters.category ?? ''} onChange={(event) => updateFilter('category', event.target.value)}><option value="">ทั้งหมด</option>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs text-[var(--text-muted)]">สถานะ<select className={inputClass} value={filters.status ?? ''} onChange={(event) => updateFilter('status', event.target.value)}><option value="">ทั้งหมด</option><option value="success">สำเร็จ</option><option value="failed">ไม่สำเร็จ</option></select></label>
        <label className="text-xs text-[var(--text-muted)]">การกระทำ<input className={inputClass} value={action} onChange={(event) => setAction(event.target.value)} placeholder="เช่น ADJUST_MERCHANT_QUOTA" /></label>
        <label className="text-xs text-[var(--text-muted)]">วันที่เริ่ม<input type="date" className={inputClass} value={filters.start_date ?? ''} max={filters.end_date} onChange={(event) => updateFilter('start_date', event.target.value)} /></label>
        <label className="text-xs text-[var(--text-muted)]">วันที่สิ้นสุด<input type="date" className={inputClass} value={filters.end_date ?? ''} min={filters.start_date} onChange={(event) => updateFilter('end_date', event.target.value)} /></label>
        <label className="text-xs text-[var(--text-muted)]">รหัสผู้ดูแล<input className={inputClass} value={adminID} onChange={(event) => setAdminID(event.target.value)} placeholder="UUID" /></label>
        <label className="text-xs text-[var(--text-muted)]">รหัสเป้าหมาย<input className={inputClass} value={targetID} onChange={(event) => setTargetID(event.target.value)} placeholder="UUID" /></label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="inline-flex items-center gap-2 rounded bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white"><Search className="h-4 w-4" />ค้นหา</button>
          <button type="button" onClick={() => { setSearch(''); setAction(''); setAdminID(''); setTargetID(''); setFilters({}); setPage(1); }} className="rounded border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)]">ล้างตัวกรอง</button>
        </div>
      </form>
      <div className="overflow-x-auto border border-[var(--border)]">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-[var(--bg-subtle)] text-xs text-[var(--text-muted)]"><tr><th className="p-3">วันเวลา</th><th className="p-3">ผู้ดูแล</th><th className="p-3">การกระทำ</th><th className="p-3">หมวดหมู่</th><th className="p-3">เป้าหมาย</th><th className="p-3">สถานะ</th><th className="p-3">IP</th><th className="p-3"><span className="sr-only">รายละเอียด</span></th></tr></thead>
          <tbody>{query.isLoading ? <tr><td colSpan={8} className="p-8 text-center">กำลังโหลด...</td></tr> : query.isError ? <tr><td colSpan={8} className="p-8 text-center text-[var(--err-ink)]">โหลดข้อมูลไม่สำเร็จ</td></tr> : items.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">ไม่พบบันทึก</td></tr> : items.map((item: AdminAuditLog) => <tr key={item.id} className="border-t border-[var(--border)] text-[var(--ink)]">
            <td className="whitespace-nowrap p-3 text-xs">{dateTime(item.created_at)}</td><td className="max-w-40 truncate p-3" title={item.admin_email}>{item.admin_email || '-'}</td><td className="p-3">{actions[item.action] ?? item.action}</td><td className="p-3">{categories[item.category] ?? item.category}</td><td className="max-w-40 truncate p-3" title={item.target_name}>{item.target_name || item.target_id || '-'}</td><td className={`p-3 font-medium ${item.status === 'success' ? 'text-[var(--ok-ink)]' : 'text-[var(--err-ink)]'}`}>{item.status === 'success' ? 'สำเร็จ' : 'ไม่สำเร็จ'}</td><td className="p-3 font-mono text-xs">{item.ip_address || '-'}</td><td className="p-3"><button type="button" onClick={() => setSelectedID(item.id)} title="ดูรายละเอียด" aria-label="ดูรายละเอียด" className="rounded border border-[var(--border)] p-2"><Eye className="h-4 w-4" /></button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm text-[var(--text-muted)]"><span>ทั้งหมด {pagination?.total ?? 0} รายการ</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-[var(--border)] px-3 py-1.5 disabled:opacity-40">ก่อนหน้า</button><span>{page} / {Math.max(1, pagination?.total_pages ?? 1)}</span><button type="button" disabled={page >= (pagination?.total_pages ?? 1)} onClick={() => setPage(page + 1)} className="rounded border border-[var(--border)] px-3 py-1.5 disabled:opacity-40">ถัดไป</button></div></div>
    </div>
    {selectedID && <AuditDetail id={selectedID} onClose={() => setSelectedID(null)} />}
  </AdminShell>;
}

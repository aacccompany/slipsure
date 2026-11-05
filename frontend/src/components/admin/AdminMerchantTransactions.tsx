'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Code2, Eye, RefreshCw, Search, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { AdminSlipHistoryItem, Slip, Transaction } from '@/types/api';
import { formatReasonLabel, formatSlipStatus } from '@/lib/admin-format';
import { TableSkeleton } from '@/components/ui/Skeleton';

type Props = {
  merchantId: string;
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(value?: number) {
  return `฿${(value ?? 0).toLocaleString('en-US')}`;
}

function DetailLine({ label, value }: { label: string; value?: string | number | boolean | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-2.5 text-sm last:border-b-0">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="max-w-[240px] break-words text-right font-semibold" style={{ color: 'var(--ink)' }}>
        {value === undefined || value === null || value === '' ? '-' : typeof value === 'boolean' ? (value ? 'ใช่' : 'ไม่ใช่') : String(value)}
      </span>
    </div>
  );
}

export function TransactionDetailModal({
  transaction,
  onClose,
}: {
  transaction: Transaction;
  onClose: () => void;
}) {
  const rawResponse = transaction.provider_response
    ? JSON.stringify(transaction.provider_response, null, 2)
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[1.75rem] shadow-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-7 py-5">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              รายละเอียดธุรกรรม
            </p>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
              {transaction.reference_no || transaction.id}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border)] p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)]"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-89px)] overflow-y-auto p-7">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--border)] p-5">
              <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--ink)' }}>ผลจาก HaveSLIP</h3>
              <DetailLine label="ผู้ให้บริการ" value={transaction.provider || 'haveslip'} />
              <DetailLine label="รหัสการตรวจ (UUID)" value={transaction.provider_verification_id} />
              <DetailLine label="สถานะจากผู้ให้บริการ" value={transaction.provider_status} />
              <DetailLine label="ถูกต้อง" value={transaction.provider_valid} />
              <DetailLine label="ใช้ผลจากแคช" value={transaction.provider_cached} />
              <DetailLine label="เครดิต HaveSLIP ที่ใช้" value={transaction.provider_charged_credits ?? 0} />
              <DetailLine label="ผู้ให้บริการระบุว่าซ้ำ" value={transaction.is_duplicate} />
            </section>

            <section className="rounded-2xl border border-[var(--border)] p-5">
              <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--ink)' }}>ข้อมูลธุรกรรม</h3>
              <DetailLine label="ยอดเงิน" value={formatAmount(transaction.amount)} />
              <DetailLine label="เครดิตแพ็กเกจที่ใช้" value={1} />
              <DetailLine label="สถานะ" value={formatSlipStatus(transaction.status)} />
              <DetailLine label="วันที่ทำรายการ" value={formatDate(transaction.transfer_at || transaction.transaction_time || transaction.created_at)} />
              <DetailLine label="เลขอ้างอิง" value={transaction.reference_no} />
              <DetailLine label="รหัสสลิป" value={transaction.slip_id} />
            </section>

            <section className="rounded-2xl border border-[var(--border)] p-5">
              <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--ink)' }}>ผู้โอน</h3>
              <DetailLine label="ชื่อ" value={transaction.sender_name} />
              <DetailLine label="ธนาคาร" value={transaction.sender_bank} />
              <DetailLine label="เลขบัญชี" value={transaction.sender_account} />
            </section>

            <section className="rounded-2xl border border-[var(--border)] p-5">
              <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--ink)' }}>ผู้รับ</h3>
              <DetailLine label="ชื่อ" value={transaction.receiver_name} />
              <DetailLine label="ธนาคาร" value={transaction.receiver_bank} />
              <DetailLine label="เลขบัญชี" value={transaction.receiver_account} />
            </section>
          </div>

          {rawResponse && (
            <section className="mt-6 rounded-2xl border border-[var(--border)] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Code2 className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <h3 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>ข้อมูลดิบจาก HaveSLIP</h3>
              </div>
              <pre className="max-h-80 overflow-auto rounded-2xl bg-zinc-950 p-4 text-xs text-zinc-100">
                {rawResponse}
              </pre>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function RejectedSlipDetailModal({ slip, onClose }: { slip: Slip; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[1.75rem] shadow-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-7 py-5">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>รายละเอียดสลิป</p>
            <h2 className="break-all text-lg font-semibold" style={{ color: 'var(--ink)' }}>{slip.id}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-full border border-[var(--border)] p-2 text-[var(--text-muted)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-7">
          <DetailLine label="สถานะ" value={formatSlipStatus(slip.status)} />
          <DetailLine label="สาเหตุ" value={slip.fail_reason ? formatReasonLabel(slip.fail_reason) : '-'} />
          <DetailLine label="เครดิตแพ็กเกจที่ใช้" value={1} />
          <DetailLine label="ส่งเมื่อ" value={formatDate(slip.created_at)} />
          <DetailLine label="ตรวจเสร็จเมื่อ" value={formatDate(slip.processing_completed_at)} />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            ไม่มีธุรกรรมที่บันทึกไว้สำหรับสลิปนี้
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminMerchantTransactions({ merchantId }: Props) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<AdminSlipHistoryItem | null>(null);

  const transactionsQuery = useQuery({
    queryKey: ['admin-merchant-slip-history', merchantId, page, status, startDate, endDate, search],
    queryFn: () => api.getAdminMerchantSlipHistory(merchantId, {
      page,
      limit: 20,
      status: status || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      search: search.trim() || undefined,
    }),
    enabled: Boolean(merchantId),
  });

  const transactions = transactionsQuery.data?.data?.items ?? [];
  const pagination = transactionsQuery.data?.data?.pagination;

  const resetFilters = () => {
    setStatus('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPage(1);
  };

  const refreshTransactions = () => {
    setPage(1);
    transactionsQuery.refetch();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>ตัวกรองประวัติ</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              กรองจากสถานะ วันที่ และคำค้นหา เพื่อค้นหารายการที่ต้องการ
            </p>
          </div>
          {pagination && (
            <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
              รวม {pagination.total} รายการ (โหลดมาแล้ว {transactions.length} รายการ)
            </span>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <label className="block">
            <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>สถานะ</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="mt-1 h-10 w-full rounded-xl px-3 text-sm outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--bg-card)' }}
            >
              <option value="">ทั้งหมด</option>
              <option value="verified">สำเร็จ</option>
              <option value="pending">รอตรวจสอบ</option>
              <option value="failed">ไม่สำเร็จ</option>
              <option value="duplicate">สลิปซ้ำ</option>
              <option value="processing">กำลังประมวลผล</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>วันที่เริ่ม</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
              }}
              className="mt-1 h-10 w-full rounded-xl px-3 text-sm outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>วันที่สิ้นสุด</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
              className="mt-1 h-10 w-full rounded-xl px-3 text-sm outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="block lg:w-[420px]">
            <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>คำค้นหา (UUID / ผู้รับ / ธนาคาร)</span>
            <div className="mt-1 flex h-10 items-center gap-2 rounded-xl px-3" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') refreshTransactions();
                }}
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--ink)' }}
                placeholder="เช่น 1234-uuid หรือ ชื่อร้าน"
              />
            </div>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-full px-5 py-2 text-sm font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--bg-card)' }}
              onClick={resetFilters}
            >
              ล้างตัวกรอง
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white"
              style={{ background: 'var(--blue)' }}
              onClick={refreshTransactions}
            >
              <RefreshCw className={`h-4 w-4 ${transactionsQuery.isFetching ? 'animate-spin' : ''}`} />
              รีเฟรชข้อมูล
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>ประวัติสลิปของร้าน</h2>
          {pagination && (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              หน้า {pagination.page} / {Math.max(1, pagination.total_pages)} · ทั้งหมด {pagination.total} รายการ
            </span>
          )}
        </div>
        {transactionsQuery.isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : transactionsQuery.isError ? (
          <p role="alert" className="p-6 text-sm" style={{ color: 'var(--err-ink)' }}>โหลดประวัติสลิปไม่สำเร็จ กรุณารีเฟรชแล้วลองใหม่</p>
        ) : transactions.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: 'var(--text-muted)' }}>ยังไม่มีสลิปที่ส่งเข้ามา</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead style={{ borderBottom: '1px solid var(--border)' }}>
                <tr>
                  {['สถานะ', 'ยอดเงิน', 'ต้นทาง - ปลายทาง', 'เครดิตแพ็กเกจ', 'วันที่', 'ดำเนินการ'].map((header, index) => (
                    <th key={header} className={`px-5 py-3 text-sm font-medium ${index === 5 ? 'w-44 text-right' : ''}`} style={{ color: 'var(--text-muted)' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => {
                  const { slip, transaction } = item;
                  const isDuplicate = slip.status === 'failed' && slip.fail_reason === 'DUPLICATE_SLIP';
                  const displayStatus = isDuplicate && slip.status === 'failed' ? 'duplicate' : slip.status;
                  return (
                  <tr key={slip.id} className="transition-colors hover:bg-[var(--bg-subtle)]" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium" style={{ background: slip.status === 'verified' ? 'var(--ok-pale)' : isDuplicate ? 'var(--warn-pale)' : slip.status === 'failed' ? 'var(--err-pale)' : 'var(--warn-pale)', color: slip.status === 'verified' ? 'var(--ok-ink)' : isDuplicate ? 'var(--warn-ink)' : slip.status === 'failed' ? 'var(--err-ink)' : 'var(--warn-ink)' }}>
                        {displayStatus === 'duplicate' ? 'สลิปซ้ำ' : displayStatus === 'verified' ? 'สำเร็จ' : displayStatus === 'failed' ? 'ไม่สำเร็จ' : displayStatus === 'pending' ? 'รอตรวจสอบ' : 'กำลังตรวจสอบ'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-base font-semibold" style={{ color: 'var(--ink)' }}>{transaction ? formatAmount(transaction.amount) : '-'}</td>
                    <td className="px-5 py-4">
                      <p className="max-w-[340px] truncate font-medium" style={{ color: 'var(--ink)' }}>
                        {transaction ? `${transaction.sender_name || transaction.sender_bank || '-'} → ${transaction.receiver_name || transaction.receiver_bank || '-'}` : (slip.fail_reason ? formatReasonLabel(slip.fail_reason) : '-')}
                      </p>
                      <p className="tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>{transaction?.reference_no || slip.id}</p>
                    </td>
                    <td className="px-5 py-4 font-semibold" style={{ color: 'var(--ink)' }}>1</td>
                    <td className="px-5 py-4 tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(slip.created_at)}</td>
                    <td className="w-44 px-5 py-4 text-right">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex h-9 w-36 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors hover:bg-[var(--bg-subtle)]"
                          style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--bg-card)' }}
                        >
                          <Eye className="h-4 w-4" />
                          ดูรายละเอียด
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination && (
          <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              ก่อนหน้า
            </button>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              หน้า {pagination.page} / {pagination.total_pages}
            </span>
            <button
              disabled={page >= Math.max(1, pagination.total_pages)}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              ถัดไป
            </button>
          </div>
        )}
      </section>

      {selectedItem?.transaction && (
        <TransactionDetailModal
          transaction={selectedItem.transaction}
          onClose={() => setSelectedItem(null)}
        />
      )}
      {selectedItem && !selectedItem.transaction && (
        <RejectedSlipDetailModal slip={selectedItem.slip} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

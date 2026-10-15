'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Code2, Eye, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Transaction, TransactionStatus } from '@/types/api';

type Props = {
  merchantId: string;
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
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
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-2 text-sm">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="max-w-[240px] break-words text-right font-semibold" style={{ color: 'var(--navy)' }}>
        {value === undefined || value === null || value === '' ? '-' : String(value)}
      </span>
    </div>
  );
}

function TransactionDetailModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Transaction detail
            </p>
            <h2 className="text-xl font-bold" style={{ color: 'var(--navy)' }}>
              {transaction.reference_no || transaction.id}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-200 p-2 text-zinc-500 transition-colors hover:text-zinc-900"
            aria-label="Close transaction detail"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-81px)] overflow-y-auto p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-zinc-200 p-4">
              <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--navy)' }}>HaveSLIP Result</h3>
              <DetailLine label="Provider" value={transaction.provider || 'haveslip'} />
              <DetailLine label="Verification UUID" value={transaction.provider_verification_id} />
              <DetailLine label="Provider status" value={transaction.provider_status} />
              <DetailLine label="Valid" value={transaction.provider_valid} />
              <DetailLine label="Cached" value={transaction.provider_cached} />
              <DetailLine label="HaveSLIP charged credits" value={transaction.provider_charged_credits ?? 0} />
              <DetailLine label="Duplicate" value={transaction.is_duplicate} />
            </section>

            <section className="rounded-lg border border-zinc-200 p-4">
              <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--navy)' }}>Transaction Data</h3>
              <DetailLine label="Amount" value={formatAmount(transaction.amount)} />
              <DetailLine label="SlipSure plan credits" value={1} />
              <DetailLine label="Status" value={transaction.status} />
              <DetailLine label="Transaction date" value={formatDate(transaction.transfer_at || transaction.transaction_time || transaction.created_at)} />
              <DetailLine label="Reference no." value={transaction.reference_no} />
              <DetailLine label="Slip ID" value={transaction.slip_id} />
            </section>

            <section className="rounded-lg border border-zinc-200 p-4">
              <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--navy)' }}>Sender</h3>
              <DetailLine label="Name" value={transaction.sender_name} />
              <DetailLine label="Bank" value={transaction.sender_bank} />
              <DetailLine label="Account" value={transaction.sender_account} />
            </section>

            <section className="rounded-lg border border-zinc-200 p-4">
              <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--navy)' }}>Receiver</h3>
              <DetailLine label="Name" value={transaction.receiver_name} />
              <DetailLine label="Bank" value={transaction.receiver_bank} />
              <DetailLine label="Account" value={transaction.receiver_account} />
            </section>
          </div>

          {rawResponse && (
            <section className="mt-6 rounded-lg border border-zinc-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Code2 className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <h3 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Raw HaveSLIP Response</h3>
              </div>
              <pre className="max-h-80 overflow-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-100">
                {rawResponse}
              </pre>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminMerchantTransactions({ merchantId }: Props) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | TransactionStatus>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const transactionsQuery = useQuery({
    queryKey: ['admin-merchant-transactions', merchantId, page, status, startDate, endDate, search],
    queryFn: () => api.getAdminMerchantTransactions(merchantId, {
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
      <section className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-black" style={{ color: 'var(--navy)' }}>ตัวกรองประวัติ</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              กรองจากสถานะ วันที่ และคำค้นหา เพื่อค้นหารายการที่ต้องการ
            </p>
          </div>
          {pagination && (
            <span className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
              รวม {pagination.total} รายการ (โหลดมาแล้ว {transactions.length} รายการ)
            </span>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <label className="block">
            <span className="text-xs font-bold" style={{ color: 'var(--navy)' }}>สถานะ</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as '' | TransactionStatus);
                setPage(1);
              }}
              className="mt-1 h-10 w-full px-3 text-sm outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--navy)', background: '#fff' }}
            >
              <option value="">ทั้งหมด</option>
              <option value="success">สำเร็จ</option>
              <option value="pending">รอตรวจสอบ</option>
              <option value="failed">ไม่สำเร็จ</option>
              <option value="processing">กำลังประมวลผล</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold" style={{ color: 'var(--navy)' }}>วันที่เริ่ม</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
              }}
              className="mt-1 h-10 w-full px-3 text-sm outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold" style={{ color: 'var(--navy)' }}>วันที่สิ้นสุด</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
              className="mt-1 h-10 w-full px-3 text-sm outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="block lg:w-[420px]">
            <span className="text-xs font-bold" style={{ color: 'var(--navy)' }}>คำค้นหา (UUID / ผู้รับ / ธนาคาร)</span>
            <div className="mt-1 flex h-10 items-center gap-2 px-3" style={{ border: '1px solid var(--border)', background: '#fff' }}>
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
                style={{ color: 'var(--navy)' }}
                placeholder="เช่น 1234-uuid หรือ ชื่อร้าน"
              />
            </div>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 text-sm font-bold"
              style={{ border: '1px solid var(--border)', color: 'var(--navy)', background: '#fff' }}
              onClick={resetFilters}
            >
              ล้างตัวกรอง
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white"
              style={{ background: 'var(--blue)' }}
              onClick={refreshTransactions}
            >
              <RefreshCw className={`h-4 w-4 ${transactionsQuery.isFetching ? 'animate-spin' : ''}`} />
              รีเฟรชข้อมูล
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Slip History</h2>
          {pagination && (
            <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Page {pagination.page} / {Math.max(1, pagination.total_pages)} · {pagination.total} total
            </span>
          )}
        </div>
        {transactionsQuery.isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--blue)' }} />
          </div>
        ) : transactions.length === 0 ? (
          <p className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>No transaction logs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <tr>
                  {['สถานะ', 'ยอดเงิน', 'ต้นทาง - ปลายทาง', 'เครดิตแพ็กเกจ', 'วันที่', 'ดำเนินการ'].map((header) => (
                    <th key={header} className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase" style={{ background: transaction.status === 'success' ? '#DCFCE7' : transaction.status === 'failed' ? '#FEE2E2' : '#FEF3C7', color: transaction.status === 'success' ? '#047857' : transaction.status === 'failed' ? '#DC2626' : '#D97706' }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: transaction.status === 'success' ? '#10B981' : transaction.status === 'failed' ? '#EF4444' : '#F59E0B' }} />
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-base font-black" style={{ color: 'var(--navy)' }}>฿{transaction.amount.toLocaleString('en-US')}</td>
                    <td className="px-4 py-3">
                      <p className="max-w-[340px] truncate font-bold" style={{ color: 'var(--navy)' }}>
                        {transaction.sender_name || transaction.sender_bank || '-'} → {transaction.receiver_name || transaction.receiver_bank || '-'}
                      </p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{transaction.reference_no || transaction.id}</p>
                    </td>
                    <td className="px-4 py-3 font-black" style={{ color: 'var(--navy)' }}>1</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(transaction.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTransaction(transaction)}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold"
                          style={{ border: '1px solid var(--border)', color: 'var(--navy)', background: '#fff' }}
                        >
                          <Eye className="h-4 w-4" />
                          ดูรายละเอียด
                        </button>
                        {transaction.is_duplicate && (
                          <span className="inline-flex items-center px-3 py-2 text-xs font-bold" style={{ border: '1px solid #F59E0B', color: '#D97706' }}>
                            Duplicate
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination && (
          <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 disabled:opacity-30"
            >
              Previous
            </button>
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Page {pagination.page} / {pagination.total_pages}
            </span>
            <button
              disabled={page >= Math.max(1, pagination.total_pages)}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </section>

      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}

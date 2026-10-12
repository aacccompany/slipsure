'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Code2, Download, Eye, ImageIcon, Loader2, MessageSquare, RefreshCw, Search, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Transaction, TransactionStatus } from '@/types/api';

const STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  success: 'Success',
  failed: 'Failed',
};

const FAIL_LABEL: Record<string, string> = {
  DUPLICATE_SLIP: 'Duplicate slip',
  AMOUNT_MISMATCH: 'Amount mismatch',
  TIMEOUT: 'Timed out',
  INVALID_QR: 'Invalid QR',
  BANK_ERROR: 'Bank error',
  EXPIRED_SLIP: 'Expired slip',
};

type FilterState = {
  status: '' | TransactionStatus;
  channel: '' | 'line';
  startDate: string;
  endDate: string;
  search: string;
};

const EMPTY_FILTERS: FilterState = {
  status: '',
  channel: '',
  startDate: '',
  endDate: '',
  search: '',
};

function statusStyle(status: TransactionStatus) {
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

function formatTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(value: number) {
  return `฿${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function partyLabel(name?: string, bank?: string, account?: string) {
  const displayName = name || account || '-';
  return bank ? `${displayName} (${bank})` : displayName;
}

function transactionQueryParams(filters: FilterState) {
  return {
    status: filters.status || undefined,
    start_date: filters.startDate || undefined,
    end_date: filters.endDate || undefined,
    search: filters.search.trim() || undefined,
  };
}

function DetailLine({ label, value }: { label: string; value?: string | number | boolean | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-2 text-sm">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-right font-semibold" style={{ color: 'var(--navy)' }}>
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
              <DetailLine label="Charged credits" value={transaction.provider_charged_credits ?? 1} />
              <DetailLine label="Duplicate" value={transaction.is_duplicate} />
            </section>

            <section className="rounded-lg border border-zinc-200 p-4">
              <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--navy)' }}>Transaction Data</h3>
              <DetailLine label="Amount" value={formatAmount(transaction.amount)} />
              <DetailLine label="Status" value={STATUS_LABEL[transaction.status]} />
              <DetailLine label="Transaction date" value={formatTime(transaction.transfer_at || transaction.transaction_time || transaction.created_at)} />
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

function TransactionRow({
  transaction,
  onView,
  isDetailLoading,
}: {
  transaction: Transaction;
  onView: (transaction: Transaction) => Promise<void> | void;
  isDetailLoading: boolean;
}) {
  const colors = statusStyle(transaction.status);

  return (
    <div
      className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 md:grid-cols-[140px_120px_1fr_80px_160px_170px] md:items-center"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors.dot }} />
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: colors.bg, color: colors.text }}
        >
          {STATUS_LABEL[transaction.status]}
        </span>
      </div>

      <p className="font-bold" style={{ color: 'var(--navy)' }}>
        {formatAmount(transaction.amount)}
      </p>

      <div className="min-w-0">
        {transaction.reference_no ? (
          <>
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--navy)' }}>
              {partyLabel(transaction.sender_name, transaction.sender_bank, transaction.sender_account)}
              <span className="mx-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>→</span>
              {partyLabel(transaction.receiver_name, transaction.receiver_bank, transaction.receiver_account)}
            </p>
            <p className="mt-0.5 truncate font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {transaction.reference_no || transaction.id}
            </p>
          </>
        ) : (
          <>
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--navy)' }}>
              {transaction.fail_reason ? FAIL_LABEL[transaction.fail_reason] ?? transaction.fail_reason : 'No transaction data'}
            </p>
            <p className="mt-0.5 truncate font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {transaction.id}
            </p>
          </>
        )}
      </div>

      <p className="hidden text-center font-bold md:block" style={{ color: 'var(--navy)' }}>
        {transaction.provider_charged_credits ?? 1}
      </p>

      <p className="hidden font-mono text-[10px] md:block" style={{ color: 'var(--text-muted)' }}>
        {formatTime(transaction.transfer_at || transaction.created_at)}
      </p>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onView(transaction)}
          disabled={isDetailLoading}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-xs font-bold transition-colors hover:border-zinc-900 disabled:cursor-wait disabled:opacity-60"
          style={{ color: 'var(--navy)' }}
        >
          {isDetailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          ดูรายละเอียด
        </button>
        {transaction.slip?.image_url && (
          <a
            href={transaction.slip.image_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-zinc-200 px-2.5 py-1 text-[10px] font-semibold text-zinc-600 hover:border-zinc-900 hover:text-zinc-900"
          >
            Image
          </a>
        )}
        {transaction.is_duplicate && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
            Duplicate
          </span>
        )}
      </div>
    </div>
  );
}

export default function SlipsPage() {
  const [page, setPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);

  const { data: listData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['transactions', page, appliedFilters],
    queryFn: () => api.getTransactions({ page, limit: 15, ...transactionQueryParams(appliedFilters) }),
  });

  const transactions = listData?.data?.items ?? [];
  const pagination = listData?.data?.pagination;
  const totalPages = Math.max(1, pagination?.total_pages ?? 1);

  const downloadTransactions = async () => {
    try {
      const blob = await api.exportTransactions({ format: 'csv', ...transactionQueryParams(appliedFilters) });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export transactions');
    }
  };

  const applyFilters = () => {
    const nextFilters = { ...filters, search: filters.search.trim() };

    setPage(1);
    setAppliedFilters(nextFilters);

    if (page === 1 && JSON.stringify(nextFilters) === JSON.stringify(appliedFilters)) {
      void refetch();
    }
  };

  const clearFilters = () => {
    setPage(1);
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const updateFilters = (nextFilters: FilterState, applyNow = true) => {
    setFilters(nextFilters);

    if (!applyNow) return;

    setPage(1);
    setAppliedFilters({ ...nextFilters, search: nextFilters.search.trim() });
  };

  const openTransactionDetail = async (transaction: Transaction) => {
    setDetailLoadingId(transaction.id);

    try {
      const response = await api.getTransaction(transaction.id);

      if (response.success && response.data) {
        setSelectedTransaction(response.data);
        return;
      }

      setSelectedTransaction(transaction);
      toast.error(response.error || 'Could not load full transaction detail');
    } catch (error) {
      setSelectedTransaction(transaction);
      toast.error(error instanceof Error ? error.message : 'Could not load full transaction detail');
    } finally {
      setDetailLoadingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8" style={{ background: 'var(--bg)' }}>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            / Transaction history
          </p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--navy)' }}>
            Transactions
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={downloadTransactions}
            className="inline-flex items-center gap-2 border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/merchant/line"
            className="inline-flex items-center gap-2 bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            <MessageSquare className="h-4 w-4" />
            LINE setup
          </Link>
        </div>
      </div>

      <div
        className="mb-6 flex items-start gap-3 bg-white p-4"
        style={{ border: '1px solid var(--border)' }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-emerald-50">
          <MessageSquare className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
            Verification now runs through your merchant LINE bot.
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Customers send slips in LINE, SlipSure verifies them, then the result is returned in that same chat.
          </p>
        </div>
      </div>

      <form
        className="mb-6 rounded-lg bg-white p-5"
        style={{ border: '1px solid var(--border)' }}
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
              ตัวกรองประวัติ
            </h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              กรองจากสถานะ วันที่ และคำค้นหา เพื่อค้นหารายการที่ต้องการ
            </p>
          </div>
          <p className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>
            รวม {pagination?.total.toLocaleString() ?? 0} รายการ (โหลดมาแล้ว {transactions.length.toLocaleString()} รายการ)
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <label className="space-y-1 text-xs font-bold" style={{ color: 'var(--navy)' }}>
            สถานะ
            <select
              value={filters.status}
              onChange={(event) => updateFilters({ ...filters, status: event.target.value as FilterState['status'] })}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium outline-none transition-colors focus:border-blue-500"
            >
              <option value="">ทั้งหมด</option>
              <option value="success">สำเร็จ</option>
              <option value="failed">ล้มเหลว</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="processing">กำลังตรวจสอบ</option>
            </select>
          </label>

          <label className="space-y-1 text-xs font-bold" style={{ color: 'var(--navy)' }}>
            ช่องทาง
            <select
              value={filters.channel}
              onChange={(event) => updateFilters({ ...filters, channel: event.target.value as FilterState['channel'] })}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium outline-none transition-colors focus:border-blue-500"
            >
              <option value="">ทั้งหมด</option>
              <option value="line">LINE bot</option>
            </select>
          </label>

          <label className="space-y-1 text-xs font-bold" style={{ color: 'var(--navy)' }}>
            วันที่เริ่ม
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => updateFilters({ ...filters, startDate: event.target.value })}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium outline-none transition-colors focus:border-blue-500"
            />
          </label>

          <label className="space-y-1 text-xs font-bold" style={{ color: 'var(--navy)' }}>
            วันที่สิ้นสุด
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => updateFilters({ ...filters, endDate: event.target.value })}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium outline-none transition-colors focus:border-blue-500"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-end">
          <label className="max-w-md space-y-1 text-xs font-bold" style={{ color: 'var(--navy)' }}>
            คำค้นหา (UUID / ผู้รับ / ธนาคาร)
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={filters.search}
                onChange={(event) => updateFilters({ ...filters, search: event.target.value }, false)}
                placeholder="เช่น 1234-uuid หรือ ชื่อร้าน"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500"
              />
            </span>
          </label>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 rounded-md border border-zinc-200 bg-white px-4 text-sm font-bold transition-colors hover:border-zinc-900"
              style={{ color: 'var(--navy)' }}
            >
              ล้างตัวกรอง
            </button>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700"
              style={{ background: 'var(--blue)' }}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              รีเฟรชข้อมูล
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          ตัวกรองสถานะและวันที่จะโหลดข้อมูลใหม่ทันที ส่วนคำค้นหาให้กด Enter หรือรีเฟรชข้อมูล
        </p>
      </form>

      <div className="bg-white" style={{ border: '1px solid var(--border)' }}>
        <div
          className="hidden grid-cols-[140px_120px_1fr_80px_160px_170px] gap-4 px-5 py-3 md:grid"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
        >
          {['สถานะ', 'ยอดเงิน', 'ต้นทาง → ปลายทาง', 'เครดิต', 'วันที่', 'ดำเนินการ'].map((header) => (
            <p key={header} className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {header}
            </p>
          ))}
        </div>

        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Slip history
          </span>
          {pagination && (
            <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {pagination.total.toLocaleString()} total
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--blue)' }} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <ImageIcon className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
              No slips yet
            </p>
            <p className="max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
              Once a customer sends a slip to your connected LINE bot, it will appear here.
            </p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              onView={openTransactionDetail}
              isDetailLoading={detailLoadingId === transaction.id}
            />
          ))
        )}

        {pagination && (
          <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            >
              Previous
            </button>
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Page {pagination.page ?? page} / {totalPages}
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {pagination.total.toLocaleString()} total transactions
              </p>
            </div>
            <button
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}

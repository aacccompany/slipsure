'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ImageIcon, Loader2, MessageSquare, RefreshCw, Search } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Transaction, TransactionStatus } from '@/types/api';
import { STATUS_LABEL, FAIL_LABEL, statusStyle, formatTime } from '@/lib/transaction-format';

const STATUS_OPTIONS: { value: TransactionStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: STATUS_LABEL.pending },
  { value: 'processing', label: STATUS_LABEL.processing },
  { value: 'success', label: STATUS_LABEL.success },
  { value: 'failed', label: STATUS_LABEL.failed },
];

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const colors = statusStyle(transaction.status);

  return (
    <div
      className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 md:grid-cols-[140px_1fr_160px_120px] md:items-center"
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

      <div className="min-w-0">
        {transaction.reference_no ? (
          <>
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--navy)' }}>
              THB {Number(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                {transaction.sender_bank || '-'} to {transaction.receiver_bank || '-'}
              </span>
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

      <p className="hidden font-mono text-[10px] md:block" style={{ color: 'var(--text-muted)' }}>
        {formatTime(transaction.transfer_at || transaction.created_at)}
      </p>

      <div className="hidden items-center justify-end gap-2 md:flex">
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
  const [status, setStatus] = useState<TransactionStatus | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const filters = {
    status: status || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    search: search.trim() || undefined,
  };
  const hasActiveFilters = Boolean(status || startDate || endDate || search.trim());

  const { data: listData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['transactions', page, status, startDate, endDate, search.trim()],
    queryFn: () => api.getTransactions({ page, limit: 15, ...filters }),
  });

  const transactions = listData?.data?.items ?? [];
  const pagination = listData?.data?.pagination;
  const totalPages = Math.max(1, pagination?.total_pages ?? 1);

  const clearFilters = () => {
    setStatus('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPage(1);
  };

  const downloadTransactions = async () => {
    setIsExporting(true);
    try {
      const blob = await api.exportTransactions({ format: 'csv', ...filters });
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
    } finally {
      setIsExporting(false);
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
            disabled={isExporting}
            className="inline-flex items-center gap-2 border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
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

      <div
        className="mb-6 flex flex-col gap-3 bg-white p-3 lg:flex-row lg:items-center lg:justify-between"
        style={{ border: '1px solid var(--border)' }}
      >
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <label
            className="flex min-h-11 flex-1 items-center gap-2 px-3 text-sm lg:max-w-xs"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search reference no..."
              className="w-full bg-transparent outline-none placeholder:opacity-60"
              style={{ color: 'var(--navy)' }}
            />
          </label>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as TransactionStatus | '');
              setPage(1);
            }}
            className="min-h-11 px-3 text-sm outline-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--navy)' }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
              }}
              max={endDate || undefined}
              className="min-h-11 px-3 text-sm outline-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--navy)' }}
            />
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
              min={startDate || undefined}
              className="min-h-11 px-3 text-sm outline-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--navy)' }}
            />
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="font-mono text-[10px] uppercase tracking-widest transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-white" style={{ border: '1px solid var(--border)' }}>
        <div
          className="hidden grid-cols-[140px_1fr_160px_120px] gap-4 px-5 py-3 md:grid"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
        >
          {['Status', 'Details', 'Time', 'Flags'].map((header) => (
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
              {hasActiveFilters ? 'No matching slips' : 'No slips yet'}
            </p>
            <p className="max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
              {hasActiveFilters
                ? 'Try widening the date range or clearing filters.'
                : 'Once a customer sends a slip to your connected LINE bot, it will appear here.'}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-1 font-mono text-[10px] uppercase tracking-widest transition-colors"
                style={{ color: 'var(--blue)' }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)
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
    </div>
  );
}

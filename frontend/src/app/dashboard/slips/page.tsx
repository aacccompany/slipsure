'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ImageIcon, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
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

  const { data: listData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['transactions', page],
    queryFn: () => api.getTransactions({ page, limit: 15 }),
  });

  const transactions = listData?.data?.items ?? [];
  const pagination = listData?.data?.pagination;
  const totalPages = Math.max(1, pagination?.total_pages ?? 1);

  const downloadTransactions = async () => {
    try {
      const blob = await api.exportTransactions({ format: 'csv' });
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
              No slips yet
            </p>
            <p className="max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
              Once a customer sends a slip to your connected LINE bot, it will appear here.
            </p>
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

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ImageIcon } from 'lucide-react';
import { SlipListSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api-client';
import { STATUS_LABEL, FAIL_LABEL, statusStyle, formatTime } from '@/lib/transaction-format';

export function RecentSlips() {
  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => api.getTransactions({ page: 1, limit: 5 }),
  });

  const transactions = data?.data?.items ?? [];

  return (
    <div className="bg-white" style={{ border: '1px solid var(--border)' }}>
      <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Recent Slips
        </p>
        <Link
          href="/dashboard/slips"
          className="font-mono text-[9px] uppercase tracking-widest transition-colors hover:opacity-70"
          style={{ color: 'var(--blue)' }}
        >
          View all →
        </Link>
      </div>

      {isLoading ? (
        <SlipListSkeleton rows={5} />
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <ImageIcon className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--border-strong)' }}>
            No slips yet
          </p>
        </div>
      ) : (
        <div>
          {transactions.map((transaction) => {
            const colors = statusStyle(transaction.status);
            return (
              <div
                key={transaction.id}
                className="grid grid-cols-[90px_1fr_auto] items-center gap-4 px-6 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colors.dot }} />
                  <span
                    className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {STATUS_LABEL[transaction.status]}
                  </span>
                </span>

                <div className="min-w-0">
                  {transaction.reference_no ? (
                    <>
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                        THB {Number(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="truncate font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {transaction.sender_bank || '-'} to {transaction.receiver_bank || '-'}
                      </p>
                    </>
                  ) : (
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                      {transaction.fail_reason ? FAIL_LABEL[transaction.fail_reason] ?? transaction.fail_reason : 'No transaction data'}
                    </p>
                  )}
                </div>

                <p className="whitespace-nowrap font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {formatTime(transaction.transfer_at || transaction.created_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

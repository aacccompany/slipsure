'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, ReceiptText, Store, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { AdminShell } from '@/components/admin/AdminShell';

type DetailTab = 'overview' | 'usage' | 'billing' | 'transactions';

const detailTabs: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'usage', label: 'Usage' },
  { id: 'billing', label: 'Billing' },
  { id: 'transactions', label: 'Transactions' },
];

function formatMoney(value?: number) {
  return `THB ${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

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

function formatShortDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatPercent(used: number, total: number) {
  if (!total) return '0.0%';
  return `${((used / total) * 100).toFixed(1)}%`;
}

export default function AdminMerchantDetailPage() {
  const params = useParams<{ id: string }>();
  const merchantId = params.id;
  const { user, isLoading } = useAuth();
  const [txnPage, setTxnPage] = useState(1);
  const [tab, setTab] = useState<DetailTab>('overview');
  const [planRevenuePage, setPlanRevenuePage] = useState(1);

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/login';
      return;
    }
    if (!isLoading && user?.role !== 'admin') {
      window.location.href = '/dashboard';
    }
  }, [isLoading, user]);

  const detailQuery = useQuery({
    queryKey: ['admin-merchant-detail', merchantId],
    queryFn: () => api.getAdminMerchantDetail(merchantId),
    enabled: Boolean(merchantId) && user?.role === 'admin',
  });

  const transactionsQuery = useQuery({
    queryKey: ['admin-merchant-transactions', merchantId, txnPage],
    queryFn: () => api.getAdminMerchantTransactions(merchantId, { page: txnPage, limit: 20 }),
    enabled: Boolean(merchantId) && user?.role === 'admin',
  });

  if (isLoading || !user || user.role !== 'admin' || detailQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
      </div>
    );
  }

  const detail = detailQuery.data?.data;
  const transactions = transactionsQuery.data?.data?.items ?? [];
  const pagination = transactionsQuery.data?.data?.pagination;

  if (!detail) {
    return (
      <AdminShell title="Merchant Detail">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <ArrowLeft className="h-4 w-4" />
          Back to admin
        </Link>
        <p className="mt-8 text-sm text-zinc-500">Merchant not found.</p>
      </AdminShell>
    );
  }

  const usage = detail.usage;
  const billing = detail.billing;
  const planRevenueLimit = 5;
  const planRevenueTotalPages = Math.max(1, Math.ceil(billing.revenue_by_plan.length / planRevenueLimit));
  const visiblePlanRevenue = billing.revenue_by_plan.slice(
    (planRevenuePage - 1) * planRevenueLimit,
    planRevenuePage * planRevenueLimit
  );

  return (
    <AdminShell title={detail.merchant.shop_name} eyebrow="Merchant Detail">
      <div className="mb-6">
        <Link href="/admin" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950">
          <ArrowLeft className="h-4 w-4" />
          Back to admin
        </Link>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mt-1 text-sm text-zinc-500">{detail.merchant.contact_email || 'No contact email'} · {detail.merchant.contact_phone || 'No phone'}</p>
            </div>
            <span className={detail.line_connected ? 'text-sm font-bold text-emerald-700' : 'text-sm font-bold text-rose-600'}>
              LINE {detail.line_connected ? 'connected' : 'not connected'}
            </span>
          </div>
      </div>
        <div className="mb-4 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
          {detailTabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${
                tab === item.id
                  ? 'bg-zinc-950 text-white'
                  : 'bg-white text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {(tab === 'overview' || tab === 'usage') && (
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="border border-zinc-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-zinc-500">
              <Store className="h-4 w-4" />
              <span className="font-mono text-[10px] uppercase tracking-widest">Current Plan</span>
            </div>
            <p className="text-xl font-black text-zinc-950">{detail.subscription?.plan?.name || detail.subscription?.plan_id || 'No plan'}</p>
            <p className="mt-1 text-xs text-zinc-500">{detail.subscription?.status || 'none'}</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-zinc-500">
              <ReceiptText className="h-4 w-4" />
              <span className="font-mono text-[10px] uppercase tracking-widest">Lifetime Usage</span>
            </div>
            <p className="text-xl font-black text-zinc-950">{detail.usage.lifetime}</p>
            <p className="mt-1 text-xs text-zinc-500">{detail.usage.total_transactions} transactions</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-zinc-500">
              <ReceiptText className="h-4 w-4" />
              <span className="font-mono text-[10px] uppercase tracking-widest">Total Amount</span>
            </div>
            <p className="text-xl font-black text-zinc-950">{formatMoney(detail.usage.total_amount)}</p>
            <p className="mt-1 text-xs text-zinc-500">{detail.usage.verified_slips} verified slips</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-zinc-500">
              <Users className="h-4 w-4" />
              <span className="font-mono text-[10px] uppercase tracking-widest">Users</span>
            </div>
            <p className="text-xl font-black text-zinc-950">{detail.users.length}</p>
            <p className="mt-1 text-xs text-zinc-500">attached to merchant</p>
          </div>
        </div>
        )}

        {tab === 'usage' && (
        <div className="mb-6 grid gap-3 md:grid-cols-5">
          <div className="border border-zinc-200 bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Current Usage</p>
            <p className="mt-2 text-xl font-black text-zinc-950">{usage.this_month} / {usage.quota}</p>
            <p className="mt-1 text-xs text-zinc-500">{formatPercent(usage.this_month, usage.quota)} of plan quota</p>
          </div>
          <div className="border border-zinc-200 bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Remaining</p>
            <p className="mt-2 text-xl font-black text-zinc-950">{usage.remaining}</p>
            <p className="mt-1 text-xs text-zinc-500">credits left</p>
          </div>
          <div className="border border-zinc-200 bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Total Slips</p>
            <p className="mt-2 text-xl font-black text-zinc-950">{usage.total_slips}</p>
            <p className="mt-1 text-xs text-zinc-500">{usage.verified_slips} verified / {usage.failed_slips} failed</p>
          </div>
          <div className="border border-zinc-200 bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Duplicates</p>
            <p className="mt-2 text-xl font-black text-zinc-950">{usage.duplicate_slips}</p>
            <p className="mt-1 text-xs text-zinc-500">blocked by strict checks</p>
          </div>
          <div className="border border-zinc-200 bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Reset Window</p>
            <p className="mt-2 text-sm font-black text-zinc-950">{formatShortDate(usage.next_reset)}</p>
            <p className="mt-1 text-xs text-zinc-500">from {formatShortDate(usage.current_period_start)}</p>
          </div>
        </div>
        )}

        {tab === 'billing' && (
        <div className="mb-6 grid gap-3 md:grid-cols-5">
          <div className="border border-zinc-200 bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Plan Activations</p>
            <p className="mt-2 text-xl font-black text-zinc-950">{billing.plan_activations}</p>
            <p className="mt-1 text-xs text-zinc-500">free + paid activations</p>
          </div>
          <div className="border border-zinc-200 bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Paid Activations</p>
            <p className="mt-2 text-xl font-black text-zinc-950">{billing.paid_activations}</p>
            <p className="mt-1 text-xs text-zinc-500">{billing.successful_payments} successful payments</p>
          </div>
          <div className="border border-zinc-200 bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Collected</p>
            <p className="mt-2 text-xl font-black text-zinc-950">{formatMoney(billing.total_revenue)}</p>
            <p className="mt-1 text-xs text-zinc-500">from this merchant</p>
          </div>
          <div className="border border-zinc-200 bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Free Plan</p>
            <p className="mt-2 text-xl font-black text-zinc-950">{billing.free_plan_used ? 'Used' : 'Not used'}</p>
            <p className="mt-1 text-xs text-zinc-500">one-time free activation</p>
          </div>
          <div className="border border-zinc-200 bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Last Paid</p>
            <p className="mt-2 text-sm font-black text-zinc-950">{billing.last_paid_at ? formatShortDate(billing.last_paid_at) : '-'}</p>
            <p className="mt-1 text-xs text-zinc-500">{billing.failed_payments} failed payments</p>
          </div>
        </div>
        )}

        {tab === 'overview' && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <section className="border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-bold text-zinc-950">Merchant Users</h2>
            </div>
            <div className="divide-y divide-zinc-100">
              {detail.users.length === 0 ? (
                <p className="p-5 text-sm text-zinc-500">No users attached.</p>
              ) : detail.users.map((item) => (
                <div key={item.id} className="px-5 py-4">
                  <p className="font-semibold text-zinc-950">{item.name}</p>
                  <p className="text-xs text-zinc-500">{item.email} · {item.role}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-bold text-zinc-950">Recent Payments</h2>
            </div>
            <div className="divide-y divide-zinc-100">
              {detail.payments.length === 0 ? (
                <p className="p-5 text-sm text-zinc-500">No payments yet.</p>
              ) : detail.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-semibold text-zinc-950">{formatMoney(payment.amount)}</p>
                    <p className="text-xs text-zinc-500">{payment.gateway_reference_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-700">{payment.status}</p>
                    <p className="text-xs text-zinc-500">{formatDate(payment.paid_at || payment.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        )}

        {tab === 'billing' && (
        <section className="mb-6 border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <h2 className="text-sm font-bold text-zinc-950">Plan Revenue & Activations</h2>
            <span className="font-mono text-[10px] text-zinc-500">{billing.plan_activations} total activations</span>
          </div>
          {billing.revenue_by_plan.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500">No plan activations recorded yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Activations</th>
                  <th className="px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {visiblePlanRevenue.map((item) => (
                  <tr key={item.plan_id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-950">{item.plan}</p>
                      <p className="font-mono text-[10px] text-zinc-400">{item.plan_id}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-800">{item.activations}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-950">{formatMoney(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-4">
            <button
              disabled={planRevenuePage <= 1}
              onClick={() => setPlanRevenuePage((page) => page - 1)}
              className="border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Page {planRevenuePage} / {planRevenueTotalPages}
            </span>
            <button
              disabled={planRevenuePage >= planRevenueTotalPages}
              onClick={() => setPlanRevenuePage((page) => page + 1)}
              className="border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </section>
        )}

        {tab === 'transactions' && (
        <section className="border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <h2 className="text-sm font-bold text-zinc-950">Transaction Logs</h2>
            {pagination && (
              <span className="font-mono text-[10px] text-zinc-500">
                Page {pagination.page} / {Math.max(1, pagination.total_pages)} · {pagination.total} total
              </span>
            )}
          </div>
          {transactionsQuery.isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500">No transaction logs yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Banks</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-zinc-950">{transaction.reference_no || transaction.id}</p>
                      {transaction.is_duplicate && <p className="mt-1 text-xs text-amber-700">Duplicate</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-950">{formatMoney(transaction.amount)}</td>
                    <td className="px-4 py-3 text-zinc-700">{transaction.status}</td>
                    <td className="px-4 py-3 text-zinc-600">{transaction.sender_bank || '-'} to {transaction.receiver_bank || '-'}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatDate(transaction.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {pagination && (
            <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-4">
              <button
                disabled={txnPage <= 1}
                onClick={() => setTxnPage((page) => page - 1)}
                className="border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Page {pagination.page} / {pagination.total_pages}
              </span>
              <button
                disabled={txnPage >= Math.max(1, pagination.total_pages)}
                onClick={() => setTxnPage((page) => page + 1)}
                className="border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
        )}
    </AdminShell>
  );
}

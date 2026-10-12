'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, ReceiptText, Store, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

function StatBox({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
      <div className="mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
        <Icon className="h-4 w-4" style={{ color: 'var(--blue)' }} />
        <span className="font-mono text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-xl font-bold tracking-tight" style={{ color: 'var(--navy)' }}>{value}</p>
      {hint && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
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
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  const detail = detailQuery.data?.data;
  const transactions = transactionsQuery.data?.data?.items ?? [];
  const pagination = transactionsQuery.data?.data?.pagination;

  if (!detail) {
    return (
      <AdminShell activeTab="merchants">
        <div className="p-6" style={{ background: 'var(--bg)' }}>
          <Link href="/admin?tab=merchants" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="h-4 w-4" />
            Back to admin
          </Link>
          <p className="mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>Merchant not found.</p>
        </div>
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
    <AdminShell activeTab="merchants">
      <div className="p-6 space-y-6" style={{ background: 'var(--bg)' }}>
        <div className="pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <Link
            href="/admin?tab=merchants"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--navy)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to admin
          </Link>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                / Merchant Detail
              </p>
              <h1 className="font-bold tracking-tight" style={{ fontSize: '1.4rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
                {detail.merchant.shop_name}
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {detail.merchant.contact_email || 'No contact email'} · {detail.merchant.contact_phone || 'No phone'}
              </p>
            </div>
            <span className="text-sm font-bold" style={{ color: detail.line_connected ? '#047857' : '#DC2626' }}>
              LINE {detail.line_connected ? 'connected' : 'not connected'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          {detailTabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="px-3 py-2 text-sm font-semibold transition-colors"
              style={
                tab === item.id
                  ? { background: 'var(--navy)', color: '#fff' }
                  : { background: '#fff', color: 'var(--text-muted)', border: '1px solid var(--border)' }
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {(tab === 'overview' || tab === 'usage') && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatBox
              icon={Store}
              label="Current Plan"
              value={detail.subscription?.plan?.name || detail.subscription?.plan_id || 'No plan'}
              hint={detail.subscription?.status || 'none'}
            />
            <StatBox
              icon={ReceiptText}
              label="Lifetime Usage"
              value={detail.usage.lifetime}
              hint={`${detail.usage.total_transactions} transactions`}
            />
            <StatBox
              icon={ReceiptText}
              label="Total Amount"
              value={formatMoney(detail.usage.total_amount)}
              hint={`${detail.usage.verified_slips} verified slips`}
            />
            <StatBox icon={Users} label="Users" value={detail.users.length} hint="attached to merchant" />
          </div>
        )}

        {tab === 'usage' && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatBox icon={ReceiptText} label="Current Usage" value={`${usage.this_month} / ${usage.quota}`} hint={`${formatPercent(usage.this_month, usage.quota)} of plan quota`} />
            <StatBox icon={ReceiptText} label="Remaining" value={usage.remaining} hint="credits left" />
            <StatBox icon={ReceiptText} label="Total Slips" value={usage.total_slips} hint={`${usage.verified_slips} verified / ${usage.failed_slips} failed`} />
            <StatBox icon={ReceiptText} label="Duplicates" value={usage.duplicate_slips} hint="blocked by strict checks" />
            <StatBox icon={ReceiptText} label="Reset Window" value={formatShortDate(usage.next_reset)} hint={`from ${formatShortDate(usage.current_period_start)}`} />
          </div>
        )}

        {tab === 'billing' && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatBox icon={ReceiptText} label="Plan Activations" value={billing.plan_activations} hint="free + paid activations" />
            <StatBox icon={ReceiptText} label="Paid Activations" value={billing.paid_activations} hint={`${billing.successful_payments} successful payments`} />
            <StatBox icon={ReceiptText} label="Collected" value={formatMoney(billing.total_revenue)} hint="from this merchant" />
            <StatBox icon={ReceiptText} label="Free Plan" value={billing.free_plan_used ? 'Used' : 'Not used'} hint="one-time free activation" />
            <StatBox icon={ReceiptText} label="Last Paid" value={billing.last_paid_at ? formatShortDate(billing.last_paid_at) : '-'} hint={`${billing.failed_payments} failed payments`} />
          </div>
        )}

        {tab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="bg-white" style={{ border: '1px solid var(--border)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Merchant Users</h2>
              </div>
              <div>
                {detail.users.length === 0 ? (
                  <p className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>No users attached.</p>
                ) : detail.users.map((item) => (
                  <div key={item.id} className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p className="font-semibold" style={{ color: 'var(--navy)' }}>{item.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.email} · {item.role}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white" style={{ border: '1px solid var(--border)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Recent Payments</h2>
              </div>
              <div>
                {detail.payments.length === 0 ? (
                  <p className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>No payments yet.</p>
                ) : detail.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--navy)' }}>{formatMoney(payment.amount)}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{payment.gateway_reference_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{payment.status}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(payment.paid_at || payment.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'billing' && (
          <section className="bg-white" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Plan Revenue & Activations</h2>
              <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{billing.plan_activations} total activations</span>
            </div>
            {billing.revenue_by_plan.length === 0 ? (
              <p className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>No plan activations recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  <tr>
                    {['Plan', 'Activations', 'Revenue'].map((header) => (
                      <th key={header} className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visiblePlanRevenue.map((item) => (
                    <tr key={item.plan_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3">
                        <p className="font-semibold" style={{ color: 'var(--navy)' }}>{item.plan}</p>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.plan_id}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--navy)' }}>{item.activations}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--navy)' }}>{formatMoney(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                disabled={planRevenuePage <= 1}
                onClick={() => setPlanRevenuePage((page) => page - 1)}
                className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 disabled:opacity-30"
              >
                Previous
              </button>
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Page {planRevenuePage} / {planRevenueTotalPages}
              </span>
              <button
                disabled={planRevenuePage >= planRevenueTotalPages}
                onClick={() => setPlanRevenuePage((page) => page + 1)}
                className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </section>
        )}

        {tab === 'transactions' && (
          <section className="bg-white" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Transaction Logs</h2>
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
                    {['Reference', 'Amount', 'Status', 'Banks', 'Created'].map((header) => (
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
                        <p className="font-mono text-xs" style={{ color: 'var(--navy)' }}>{transaction.reference_no || transaction.id}</p>
                        {transaction.is_duplicate && <p className="mt-1 text-xs text-amber-700">Duplicate</p>}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--navy)' }}>{formatMoney(transaction.amount)}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--navy)' }}>{transaction.status}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{transaction.sender_bank || '-'} to {transaction.receiver_bank || '-'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(transaction.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
            {pagination && (
              <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  disabled={txnPage <= 1}
                  onClick={() => setTxnPage((page) => page - 1)}
                  className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Page {pagination.page} / {pagination.total_pages}
                </span>
                <button
                  disabled={txnPage >= Math.max(1, pagination.total_pages)}
                  onClick={() => setTxnPage((page) => page + 1)}
                  className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </AdminShell>
  );
}

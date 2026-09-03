'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, Bot, CheckCircle2, CreditCard, Loader2, ReceiptText, Search, Store, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { AdminShell } from '@/components/admin/AdminShell';
import { StatCard } from '@/components/dashboard/StatCard';
import type { AdminAnalyticsDashboard, AdminMerchantPerformanceAnalytics, AdminRevenueAnalytics } from '@/types/api';

type Tab = 'merchants' | 'users' | 'billing' | 'analytics';

const TAB_META: Record<Tab, { crumb: string; title: string }> = {
  analytics: { crumb: '/ Overview', title: 'Operations' },
  merchants: { crumb: '/ Merchants', title: 'Merchants' },
  users: { crumb: '/ Users', title: 'Users' },
  billing: { crumb: '/ Billing', title: 'Billing' },
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMoney(value?: number) {
  return `THB ${(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function formatPercent(value?: number) {
  return `${(value ?? 0).toFixed(1)}%`;
}

function AdminAnalyticsOverview({
  dashboard,
  revenue,
  performance,
  isLoading,
}: {
  dashboard?: AdminAnalyticsDashboard;
  revenue?: AdminRevenueAnalytics;
  performance?: AdminMerchantPerformanceAnalytics;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  const maxPlanRevenue = Math.max(1, ...(revenue?.revenue_by_plan ?? []).map((item) => item.revenue));
  const errorRatePositive = (dashboard?.system_error_rate ?? 0) <= 5;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Revenue" value={formatMoney(dashboard?.total_revenue)} change="All time" isPositive icon={CreditCard} />
        <StatCard
          title="Total Transactions"
          value={(dashboard?.total_transactions ?? 0).toLocaleString()}
          change="All time"
          isPositive
          icon={ReceiptText}
        />
        <StatCard
          title="Active Merchants"
          value={`${dashboard?.active_merchants ?? 0} / ${dashboard?.total_merchants ?? 0}`}
          change="Active / total"
          isPositive
          icon={Store}
        />
        <StatCard
          title="Error Rate"
          value={formatPercent(dashboard?.system_error_rate)}
          change={errorRatePositive ? 'Healthy' : 'Above threshold'}
          isPositive={errorRatePositive}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="lg:col-span-8 bg-white" style={{ border: '1px solid var(--border)' }}>
          <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Revenue By Plan
            </p>
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: 'var(--navy)' }}>{formatMoney(revenue?.mrr)}</p>
              <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>MRR</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {(revenue?.revenue_by_plan ?? []).length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No paid revenue yet.</p>
            ) : revenue?.revenue_by_plan.map((item) => (
              <div key={item.plan}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--navy)' }}>{item.plan}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {formatMoney(item.revenue)}
                  </span>
                </div>
                <div className="h-2 w-full" style={{ background: 'var(--border)' }}>
                  <div
                    className="h-full transition-all"
                    style={{ width: `${Math.max(4, (item.revenue / maxPlanRevenue) * 100)}%`, background: 'var(--blue)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-4 bg-white p-6" style={{ border: '1px solid var(--border)' }}>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            Health
          </p>
          <div className="space-y-4">
            {[
              { label: 'Growth', value: formatPercent(revenue?.growth_percent), icon: TrendingUp },
              { label: 'Renewal Rate', value: formatPercent(revenue?.renewal_rate), icon: CheckCircle2 },
              { label: 'Connected Bots', value: `${dashboard?.connected_bots ?? 0}`, icon: Bot },
              { label: 'Total Scans', value: `${dashboard?.total_scans ?? 0}`, icon: Activity },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between pb-3 last:pb-0"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" style={{ color: 'var(--blue)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                </div>
                <span className="font-bold" style={{ color: 'var(--navy)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-white" style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Top Active Merchants</h3>
          </div>
          <div>
            {(performance?.top_active ?? []).length === 0 ? (
              <p className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>No merchant activity yet.</p>
            ) : performance?.top_active.map((merchant) => (
              <div
                key={merchant.merchant_id}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div>
                  <p className="font-semibold" style={{ color: 'var(--navy)' }}>{merchant.shop_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatPercent(merchant.quota_percent)} of quota</p>
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: 'var(--navy)' }}>{merchant.scans} scans</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white" style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Low Usage Merchants</h3>
          </div>
          <div>
            {(performance?.low_usage ?? []).length === 0 ? (
              <p className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>No low-usage merchants.</p>
            ) : performance?.low_usage.map((merchant) => (
              <div
                key={merchant.merchant_id}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div>
                  <p className="font-semibold" style={{ color: 'var(--navy)' }}>{merchant.shop_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {merchant.last_scan ? `Last scan ${formatDate(merchant.last_scan)}` : 'No scans yet'}
                  </p>
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: 'var(--navy)' }}>{merchant.scans} scans</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminBackofficeContent() {
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const requestedTab = searchParams.get('tab');
  const normalizedTab = requestedTab === 'payments' ? 'billing' : requestedTab;
  const initialTab: Tab = normalizedTab && ['merchants', 'users', 'billing', 'analytics'].includes(normalizedTab)
    ? normalizedTab as Tab
    : 'analytics';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [billingPage, setBillingPage] = useState(1);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch]);

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/login';
      return;
    }
    if (!isLoading && user?.role !== 'admin') {
      window.location.href = '/dashboard';
    }
  }, [isLoading, user]);

  const merchantsQuery = useQuery({
    queryKey: ['admin-merchants'],
    queryFn: () => api.getAdminMerchants({ page: 1, limit: 50 }),
    enabled: user?.role === 'admin' && tab === 'merchants',
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users', userSearch.trim(), userPage],
    queryFn: () => api.getAdminUsers({
      page: userPage,
      limit: 20,
      search: userSearch.trim() || undefined,
      role: 'merchant',
    }),
    enabled: user?.role === 'admin' && tab === 'users',
  });

  const adminAnalyticsQuery = useQuery({
    queryKey: ['admin-analytics-dashboard'],
    queryFn: () => api.getAdminAnalyticsDashboard(),
    enabled: user?.role === 'admin' && tab === 'analytics',
  });

  const adminRevenueQuery = useQuery({
    queryKey: ['admin-analytics-revenue', 'monthly'],
    queryFn: () => api.getAdminRevenueAnalytics({ period: 'monthly' }),
    enabled: user?.role === 'admin' && tab === 'analytics',
  });

  const adminPerformanceQuery = useQuery({
    queryKey: ['admin-analytics-performance'],
    queryFn: () => api.getAdminMerchantPerformance(),
    enabled: user?.role === 'admin' && tab === 'analytics',
  });

  const paymentsQuery = useQuery({
    queryKey: ['admin-payments', billingPage],
    queryFn: () => api.getAdminPayments({ page: billingPage, limit: 20 }),
    enabled: user?.role === 'admin' && tab === 'billing',
  });

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  const merchants = merchantsQuery.data?.data?.items ?? [];
  const users = usersQuery.data?.data?.items ?? [];
  const usersPagination = usersQuery.data?.data?.pagination;
  const payments = paymentsQuery.data?.data?.items ?? [];
  const paymentsPagination = paymentsQuery.data?.data;
  const isTableLoading = tab === 'merchants' ? merchantsQuery.isLoading : usersQuery.isLoading;
  const meta = TAB_META[tab];

  return (
    <AdminShell activeTab={tab}>
      <div className="p-6 space-y-6" style={{ background: 'var(--bg)' }}>
        <div className="pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            {meta.crumb}
          </p>
          <h1 className="font-bold tracking-tight" style={{ fontSize: '1.4rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
            {meta.title}
          </h1>
        </div>

        {tab === 'users' ? (
          <div className="flex flex-col gap-3 bg-white p-3 md:flex-row md:items-center md:justify-between" style={{ border: '1px solid var(--border)' }}>
            <label
              className="flex min-h-11 flex-1 items-center gap-2 px-3 text-sm md:max-w-md"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <Search className="h-4 w-4" />
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search name, email, merchant..."
                className="w-full bg-transparent outline-none placeholder:opacity-60"
                style={{ color: 'var(--navy)' }}
              />
            </label>
          </div>
        ) : null}

        <div className="overflow-hidden bg-white" style={{ border: '1px solid var(--border)' }}>
          {tab === 'billing' ? (
            paymentsQuery.isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--blue)' }} />
              </div>
            ) : (
              <>
                <table className="w-full text-left text-sm">
                  <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                    <tr>
                      {['Merchant', 'Amount', 'Gateway', 'Reference', 'Status', 'Paid'].map((header) => (
                        <th key={header} className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                          No billing records yet.
                        </td>
                      </tr>
                    ) : payments.map((payment) => (
                      <tr key={payment.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-4 py-3">
                          <Link href={`/admin/merchants/${payment.merchant_id}`} className="font-bold hover:opacity-70" style={{ color: 'var(--navy)' }}>
                            {payment.merchant_name || payment.merchant_id}
                          </Link>
                          <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{payment.merchant_id}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--navy)' }}>{formatMoney(payment.amount)}</td>
                        <td className="px-4 py-3 capitalize" style={{ color: 'var(--navy)' }}>{payment.gateway}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{payment.gateway_reference_id || '-'}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--navy)' }}>{payment.status}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(payment.paid_at || payment.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setBillingPage((page) => Math.max(1, page - 1))}
                    disabled={billingPage <= 1 || paymentsQuery.isFetching}
                    className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Page {paymentsPagination?.page ?? billingPage} / {Math.max(1, paymentsPagination?.total_pages ?? 1)} - {paymentsPagination?.total ?? 0} total
                  </span>
                  <button
                    type="button"
                    onClick={() => setBillingPage((page) => page + 1)}
                    disabled={billingPage >= (paymentsPagination?.total_pages ?? 1) || paymentsQuery.isFetching}
                    className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </>
            )
          ) : tab === 'analytics' ? (
            <div className="p-5">
              <AdminAnalyticsOverview
                dashboard={adminAnalyticsQuery.data?.data}
                revenue={adminRevenueQuery.data?.data}
                performance={adminPerformanceQuery.data?.data}
                isLoading={adminAnalyticsQuery.isLoading || adminRevenueQuery.isLoading || adminPerformanceQuery.isLoading}
              />
            </div>
          ) : isTableLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--blue)' }} />
            </div>
          ) : tab === 'merchants' ? (
            <table className="w-full text-left text-sm">
              <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <tr>
                  {['Merchant', 'Owner', 'Plan', 'Usage', 'LINE', 'Created'].map((header) => (
                    <th key={header} className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {merchants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No merchants yet.
                    </td>
                  </tr>
                ) : merchants.map((merchant) => (
                  <tr key={merchant.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/merchants/${merchant.id}`} className="font-bold hover:opacity-70" style={{ color: 'var(--navy)' }}>
                        {merchant.shop_name}
                      </Link>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{merchant.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--navy)' }}>{merchant.owner_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{merchant.owner_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold" style={{ color: 'var(--navy)' }}>{merchant.plan}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{merchant.subscription_status}</p>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--navy)' }}>
                      {merchant.total_scans} scans / {merchant.total_transactions} txns
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: merchant.line_connected ? '#047857' : 'var(--text-muted)' }}>
                        {merchant.line_connected ? 'Connected' : 'Missing'}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(merchant.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <>
              <table className="w-full text-left text-sm">
                <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  <tr>
                    {['User', 'Role', 'Merchant', 'LINE', 'Email', 'Created'].map((header) => (
                      <th key={header} className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        No users found.
                      </td>
                    </tr>
                  ) : users.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3">
                        <p className="font-bold" style={{ color: 'var(--navy)' }}>{item.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.email}</p>
                      </td>
                      <td className="px-4 py-3 capitalize" style={{ color: 'var(--navy)' }}>{item.role}</td>
                      <td className="px-4 py-3">
                        {item.merchant_id ? (
                          <Link href={`/admin/merchants/${item.merchant_id}`} className="font-medium hover:underline" style={{ color: 'var(--blue)' }}>
                            {item.merchant_name || item.merchant_id}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>No merchant</span>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--navy)' }}>{item.line_linked ? 'Linked' : 'Not linked'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--navy)' }}>{item.email_verified ? 'Verified' : 'Unverified'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(item.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setUserPage((page) => Math.max(1, page - 1))}
                  disabled={userPage <= 1 || usersQuery.isFetching}
                  className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Page {usersPagination?.page ?? userPage} / {Math.max(1, usersPagination?.total_pages ?? 1)} - {usersPagination?.total ?? 0} total
                </span>
                <button
                  type="button"
                  onClick={() => setUserPage((page) => page + 1)}
                  disabled={userPage >= (usersPagination?.total_pages ?? 1) || usersQuery.isFetching}
                  className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

export default function AdminBackofficePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--blue)' }} />
        </div>
      }
    >
      <AdminBackofficeContent />
    </Suspense>
  );
}

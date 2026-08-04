'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, Bot, CheckCircle2, CreditCard, Loader2, ReceiptText, Search, Store, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { AdminShell } from '@/components/admin/AdminShell';
import type { AdminAnalyticsDashboard, AdminMerchantPerformanceAnalytics, AdminRevenueAnalytics } from '@/types/api';

type Tab = 'merchants' | 'users' | 'payments' | 'analytics';

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
        <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
      </div>
    );
  }

  const maxPlanRevenue = Math.max(1, ...(revenue?.revenue_by_plan ?? []).map((item) => item.revenue));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'Total Revenue', value: formatMoney(dashboard?.total_revenue), icon: CreditCard, tone: 'text-emerald-700' },
          { label: 'Total Transactions', value: (dashboard?.total_transactions ?? 0).toLocaleString(), icon: ReceiptText, tone: 'text-blue-700' },
          { label: 'Active Merchants', value: `${dashboard?.active_merchants ?? 0} / ${dashboard?.total_merchants ?? 0}`, icon: Store, tone: 'text-zinc-700' },
          { label: 'Error Rate', value: formatPercent(dashboard?.system_error_rate), icon: AlertTriangle, tone: (dashboard?.system_error_rate ?? 0) > 5 ? 'text-rose-700' : 'text-emerald-700' },
        ].map((item) => (
          <div key={item.label} className="border border-zinc-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <item.icon className={`h-4 w-4 ${item.tone}`} />
              <span className="font-mono text-[10px] uppercase tracking-widest">{item.label}</span>
            </div>
            <p className="text-2xl font-black text-zinc-950">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="border border-zinc-200 bg-white p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Revenue By Plan</p>
              <h3 className="text-lg font-black text-zinc-950">Billing Overview</h3>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-zinc-950">{formatMoney(revenue?.mrr)}</p>
              <p className="text-xs text-zinc-500">MRR</p>
            </div>
          </div>
          <div className="space-y-4">
            {(revenue?.revenue_by_plan ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500">No paid revenue yet.</p>
            ) : revenue?.revenue_by_plan.map((item) => (
              <div key={item.plan}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-zinc-800">{item.plan}</span>
                  <span className="font-mono text-xs text-zinc-500">{formatMoney(item.revenue)}</span>
                </div>
                <div className="h-2 bg-zinc-100">
                  <div className="h-full bg-blue-700" style={{ width: `${Math.max(4, (item.revenue / maxPlanRevenue) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-zinc-200 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Health</p>
          <div className="mt-5 space-y-4">
            {[
              { label: 'Growth', value: formatPercent(revenue?.growth_percent), icon: TrendingUp },
              { label: 'Renewal Rate', value: formatPercent(revenue?.renewal_rate), icon: CheckCircle2 },
              { label: 'Connected Bots', value: `${dashboard?.connected_bots ?? 0}`, icon: Bot },
              { label: 'Total Scans', value: `${dashboard?.total_scans ?? 0}`, icon: Activity },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-0">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm text-zinc-600">{item.label}</span>
                </div>
                <span className="font-bold text-zinc-950">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-4 py-3">
            <h3 className="text-sm font-bold text-zinc-950">Top Active Merchants</h3>
          </div>
          <div className="divide-y divide-zinc-100">
            {(performance?.top_active ?? []).length === 0 ? (
                <p className="p-4 text-sm text-zinc-500">No merchant activity yet.</p>
            ) : performance?.top_active.map((merchant) => (
              <div key={merchant.merchant_id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-semibold text-zinc-950">{merchant.shop_name}</p>
                  <p className="text-xs text-zinc-500">{formatPercent(merchant.quota_percent)} of quota</p>
                </div>
                <span className="font-mono text-sm font-bold text-zinc-800">{merchant.scans} scans</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-4 py-3">
            <h3 className="text-sm font-bold text-zinc-950">Low Usage Merchants</h3>
          </div>
          <div className="divide-y divide-zinc-100">
            {(performance?.low_usage ?? []).length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">No low-usage merchants.</p>
            ) : performance?.low_usage.map((merchant) => (
              <div key={merchant.merchant_id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-semibold text-zinc-950">{merchant.shop_name}</p>
                  <p className="text-xs text-zinc-500">{merchant.last_scan ? `Last scan ${formatDate(merchant.last_scan)}` : 'No scans yet'}</p>
                </div>
                <span className="font-mono text-sm font-bold text-zinc-800">{merchant.scans} scans</span>
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
  const requestedTab = searchParams.get('tab') as Tab | null;
  const initialTab: Tab = requestedTab && ['merchants', 'users', 'payments', 'analytics'].includes(requestedTab)
    ? requestedTab
    : 'analytics';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);

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

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
      </div>
    );
  }

  const merchants = merchantsQuery.data?.data?.items ?? [];
  const users = usersQuery.data?.data?.items ?? [];
  const usersPagination = usersQuery.data?.data?.pagination;
  const isTableLoading = tab === 'merchants' ? merchantsQuery.isLoading : usersQuery.isLoading;

  return (
    <AdminShell activeTab={tab}>
      {tab === 'users' ? (
        <div className="mb-4 flex flex-col gap-3 border border-zinc-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
          <label className="flex min-h-11 flex-1 items-center gap-2 border border-zinc-200 bg-white px-3 text-sm text-zinc-500 md:max-w-md">
            <Search className="h-4 w-4" />
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search name, email, merchant..."
              className="w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </label>
        </div>
      ) : null}

        <div className="overflow-hidden border border-zinc-200 bg-white">
          {tab === 'payments' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <CreditCard className="h-8 w-8 text-zinc-300" />
              <p className="text-sm font-bold text-zinc-950">Payments menu is ready</p>
              <p className="max-w-sm text-sm text-zinc-500">Add the payments table here when you want this screen separated from merchant detail.</p>
            </div>
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
              <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
            </div>
          ) : tab === 'merchants' ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Merchant</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">LINE</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((merchant) => (
                  <tr key={merchant.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/merchants/${merchant.id}`} className="font-bold text-zinc-950 hover:text-blue-700">
                        {merchant.shop_name}
                      </Link>
                      <p className="font-mono text-[10px] text-zinc-400">{merchant.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{merchant.owner_name}</p>
                      <p className="text-xs text-zinc-500">{merchant.owner_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-900">{merchant.plan}</p>
                      <p className="text-xs text-zinc-500">{merchant.subscription_status}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {merchant.total_scans} scans / {merchant.total_transactions} txns
                    </td>
                    <td className="px-4 py-3">
                      <span className={merchant.line_connected ? 'text-emerald-700' : 'text-zinc-400'}>
                        {merchant.line_connected ? 'Connected' : 'Missing'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{formatDate(merchant.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Merchant</th>
                    <th className="px-4 py-3">LINE</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">
                        No users found.
                      </td>
                    </tr>
                  ) : users.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-bold text-zinc-950">{item.name}</p>
                        <p className="text-xs text-zinc-500">{item.email}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-zinc-700">{item.role}</td>
                      <td className="px-4 py-3">
                        {item.merchant_id ? (
                          <Link href={`/admin/merchants/${item.merchant_id}`} className="font-medium text-blue-700 hover:underline">
                            {item.merchant_name || item.merchant_id}
                          </Link>
                        ) : (
                          <span className="text-zinc-400">No merchant</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{item.line_linked ? 'Linked' : 'Not linked'}</td>
                      <td className="px-4 py-3 text-zinc-700">{item.email_verified ? 'Verified' : 'Unverified'}</td>
                      <td className="px-4 py-3 text-zinc-500">{formatDate(item.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setUserPage((page) => Math.max(1, page - 1))}
                  disabled={userPage <= 1 || usersQuery.isFetching}
                  className="border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Page {usersPagination?.page ?? userPage} / {Math.max(1, usersPagination?.total_pages ?? 1)} - {usersPagination?.total ?? 0} total
                </span>
                <button
                  type="button"
                  onClick={() => setUserPage((page) => page + 1)}
                  disabled={userPage >= (usersPagination?.total_pages ?? 1) || usersQuery.isFetching}
                  className="border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
    </AdminShell>
  );
}

export default function AdminBackofficePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
        </div>
      }
    >
      <AdminBackofficeContent />
    </Suspense>
  );
}

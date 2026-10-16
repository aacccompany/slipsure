'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, Ban, Bot, CheckCircle2, CreditCard, Download, Eye, Loader2, ReceiptText, RefreshCw, Search, Store, TrendingUp, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { AdminShell } from '@/components/admin/AdminShell';
import { RejectedSlipDetailModal, TransactionDetailModal } from '@/components/admin/AdminMerchantTransactions';
import { EmptyState } from '@/components/dashboard/EmptyState';
import type { AdminAnalyticsDashboard, AdminBankStatus, AdminMerchantPerformanceAnalytics, AdminPaymentDetail, AdminRevenueAnalytics, AdminSlipHistoryItem, PaymentLog, SubscriptionPlan } from '@/types/api';
import { AnalyticsSkeleton, LinesSkeleton, TableSkeleton } from '@/components/ui/Skeleton';

type Tab = 'merchants' | 'users' | 'billing' | 'analytics' | 'transactions';

const TAB_META: Record<Tab, { crumb: string; title: string }> = {
  analytics: { crumb: '/ Overview', title: 'Operations' },
  merchants: { crumb: '/ Merchants', title: 'Merchants' },
  transactions: { crumb: '/ Transactions', title: 'Transactions' },
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

function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value?: number) {
  return `THB ${(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function formatPercent(value?: number) {
  return `${(value ?? 0).toFixed(1)}%`;
}

function formatReasonLabel(value?: string) {
  if (!value) return 'Unknown';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isVerifiedStatus(value?: string) {
  return value === 'success' || value === 'verified';
}

function getPlanQuota(plan?: string) {
  const normalized = (plan || '').toLowerCase();
  if (normalized.includes('enterprise')) return 4000;
  if (normalized.includes('pro')) return 1000;
  if (normalized.includes('starter')) return 200;
  if (normalized.includes('free')) return 20;
  return 0;
}

function getQuotaTone(percent: number) {
  if (percent >= 100) return { text: '#DC2626', bar: '#DC2626', bg: '#FEE2E2', label: 'Blocked' };
  if (percent >= 80) return { text: '#D97706', bar: '#F59E0B', bg: '#FEF3C7', label: 'Near quota' };
  return { text: '#047857', bar: '#10B981', bg: '#DCFCE7', label: 'Healthy' };
}

function formatMoneyCompact(value?: number) {
  const amount = value ?? 0;
  if (Math.abs(amount) >= 1000000) return `THB ${(amount / 1000000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1000) return `THB ${(amount / 1000).toFixed(1)}K`;
  return formatMoney(amount);
}

function paymentStatusTone(status?: string) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'success' || normalized === 'paid') return { bg: '#DCFCE7', text: '#047857', label: 'Success' };
  if (normalized === 'pending') return { bg: '#FEF3C7', text: '#D97706', label: 'Pending' };
  if (normalized === 'refunded') return { bg: '#EDE9FE', text: '#6D28D9', label: 'Refunded' };
  return { bg: '#FEE2E2', text: '#DC2626', label: status || 'Failed' };
}

function BillingMetricCard({
  label,
  value,
  note,
  tone = 'blue',
  icon,
  progress,
}: {
  label: string;
  value: string;
  note: string;
  tone?: 'blue' | 'green' | 'purple' | 'red';
  icon: ReactNode;
  progress: number;
}) {
  const colors = {
    blue: { accent: 'var(--blue)', soft: '#EFF6FF' },
    green: { accent: '#059669', soft: '#ECFDF5' },
    purple: { accent: '#7C3AED', soft: '#F3E8FF' },
    red: { accent: '#DC2626', soft: '#FEF2F2' },
  }[tone];

  return (
    <section className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="mt-4 text-2xl font-black tracking-tight" style={{ color: colors.accent }}>{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: colors.soft, color: colors.accent }}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>{note}</p>
      <div className="mt-4 h-1.5 w-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: colors.accent }} />
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="max-w-[60%] break-words text-right text-sm font-semibold" style={{ color: 'var(--navy)' }}>{value || '-'}</span>
    </div>
  );
}

function StripePaymentDetailModal({
  detail,
  isLoading,
  onClose,
}: {
  detail?: AdminPaymentDetail;
  isLoading: boolean;
  onClose: () => void;
}) {
  const payment = detail?.payment;
  const stripe = detail?.stripe;
  const lineItems = stripe?.line_items ?? [];
  const metadata = Object.entries(stripe?.metadata ?? {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-white p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#047857' }}>Stripe Checkout</p>
            <h3 className="mt-1 text-xl font-black" style={{ color: 'var(--navy)' }}>รายละเอียดการชำระเงิน</h3>
            <p className="mt-1 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{payment?.gateway_reference_id || payment?.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            aria-label="Close payment details"
          >
            ×
          </button>
        </div>

        {isLoading ? (
          <LinesSkeleton lines={6} />
        ) : !payment ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Payment detail not found.</div>
        ) : (
          <div className="space-y-6 p-6">
            <div className="grid grid-cols-1 overflow-hidden border md:grid-cols-3" style={{ borderColor: 'var(--border)' }}>
              {[
                ['ยอดรวม', formatMoney(stripe?.amount_total ?? payment.amount)],
                ['ชำระแล้ว', payment.status === 'success' ? formatMoney(payment.amount) : formatMoney(0)],
                ['ยอดคงเหลือ', payment.status === 'success' ? formatMoney(0) : formatMoney(payment.amount)],
              ].map(([label, value]) => (
                <div key={label} className="p-4 md:border-r md:last:border-r-0" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="mt-2 text-lg font-black" style={{ color: 'var(--navy)' }}>{value}</p>
                </div>
              ))}
            </div>

            {!stripe ? (
              <div className="p-4 text-sm" style={{ background: '#FEF3C7', color: '#92400E' }}>
                Stripe API detail is not available for this row. Showing local payment log only.
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <section className="border p-4" style={{ borderColor: 'var(--border)' }}>
                <h4 className="mb-3 font-bold" style={{ color: 'var(--navy)' }}>Local Payment Log</h4>
                <DetailRow label="Merchant" value={payment.merchant_name} />
                <DetailRow label="Merchant ID" value={<span className="font-mono text-xs">{payment.merchant_id}</span>} />
                <DetailRow label="Payment ID" value={<span className="font-mono text-xs">{payment.id}</span>} />
                <DetailRow label="Subscription ID" value={<span className="font-mono text-xs">{payment.subscription_id || '-'}</span>} />
                <DetailRow label="Gateway" value={payment.gateway} />
                <DetailRow label="Status" value={payment.status} />
                <DetailRow label="Paid at" value={formatDateTime(payment.paid_at || payment.created_at)} />
              </section>

              <section className="border p-4" style={{ borderColor: 'var(--border)' }}>
                <h4 className="mb-3 font-bold" style={{ color: 'var(--navy)' }}>Stripe Data</h4>
                <DetailRow label="Checkout session" value={<span className="font-mono text-xs">{stripe?.session_id || payment.gateway_reference_id}</span>} />
                <DetailRow label="Session status" value={stripe?.status} />
                <DetailRow label="Payment status" value={stripe?.payment_status} />
                <DetailRow label="Mode" value={stripe?.mode} />
                <DetailRow label="Customer" value={<span className="font-mono text-xs">{stripe?.customer_id || '-'}</span>} />
                <DetailRow label="Customer email" value={stripe?.customer_email} />
                <DetailRow label="Payment intent" value={<span className="font-mono text-xs">{stripe?.payment_intent_id || '-'}</span>} />
                <DetailRow label="Created" value={formatDateTime(stripe?.created_at)} />
                <DetailRow label="Expires" value={formatDateTime(stripe?.expires_at)} />
              </section>
            </div>

            <section className="border p-4" style={{ borderColor: 'var(--border)' }}>
              <h4 className="mb-3 font-bold" style={{ color: 'var(--navy)' }}>รายการใน Checkout</h4>
              {lineItems.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No Stripe line items returned.</p>
              ) : (
                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <div key={`${item.price_id}-${index}`} className="flex items-start justify-between gap-4 border p-3" style={{ borderColor: 'var(--border)' }}>
                      <div>
                        <p className="font-bold" style={{ color: 'var(--navy)' }}>{item.quantity} × {item.description || item.price_id || 'Stripe item'}</p>
                        <p className="mt-1 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{item.price_id || '-'}</p>
                      </div>
                      <p className="font-bold" style={{ color: 'var(--navy)' }}>{formatMoney(item.amount_total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {metadata.length > 0 ? (
              <section className="border p-4" style={{ borderColor: 'var(--border)' }}>
                <h4 className="mb-3 font-bold" style={{ color: 'var(--navy)' }}>Stripe Metadata</h4>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {metadata.map(([key, value]) => (
                    <div key={key} className="p-3" style={{ background: 'var(--bg-subtle)' }}>
                      <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{key}</p>
                      <p className="mt-1 break-words text-sm font-bold" style={{ color: 'var(--navy)' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {stripe?.dashboard_url ? (
                <a href={stripe.dashboard_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border px-4 py-2 text-sm font-bold" style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}>
                  <Eye className="h-4 w-4" /> เปิดใน Stripe
                </a>
              ) : null}
              {stripe?.payment_intent_dashboard_url ? (
                <a href={stripe.payment_intent_dashboard_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border px-4 py-2 text-sm font-bold" style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}>
                  <CreditCard className="h-4 w-4" /> Payment Intent
                </a>
              ) : null}
              {stripe?.customer_dashboard_url ? (
                <a href={stripe.customer_dashboard_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border px-4 py-2 text-sm font-bold" style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}>
                  <Store className="h-4 w-4" /> Customer
                </a>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BillingWorkspace({
  payments,
  pagination,
  page,
  isFetching,
  plans,
  merchantsTotal,
  revenue,
  onPrev,
  onNext,
}: {
  payments: PaymentLog[];
  pagination?: { page: number; limit: number; total: number; total_pages: number };
  page: number;
  isFetching: boolean;
  plans: SubscriptionPlan[];
  merchantsTotal: number;
  revenue?: AdminRevenueAnalytics;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [selectedPaymentID, setSelectedPaymentID] = useState<string | null>(null);
  const paymentDetailQuery = useQuery({
    queryKey: ['admin-payment-detail', selectedPaymentID],
    queryFn: () => api.getAdminPaymentDetail(selectedPaymentID as string),
    enabled: Boolean(selectedPaymentID),
  });
  const successfulPayments = payments.filter((payment) => payment.status === 'success');
  const failedPayments = payments.filter((payment) => payment.status !== 'success');
  const grossRevenue = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const failedAmount = failedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const estimatedFees = grossRevenue * 0.039;
  const activePlans = plans.filter((plan) => plan.is_active);
  const maxPlanPrice = Math.max(...activePlans.map((plan) => plan.price_monthly), 1);
  const revenueByPlan = revenue?.revenue_by_plan ?? [];
  const maxRevenueByPlan = Math.max(...revenueByPlan.map((item) => item.revenue), 1);

  return (
    <div className="space-y-5">
      <div className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Finance & Ledger / Stripe Billing Engine
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight" style={{ color: 'var(--navy)' }}>
              Payment Logs & Subscription Billing
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Real settlement records, active tier pricing, and Stripe payment audit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-2 text-xs font-bold" style={{ background: '#ECFDF5', color: '#047857' }}>
              Stripe Connected
            </span>
            <span className="px-3 py-2 text-xs font-bold" style={{ background: '#EFF6FF', color: 'var(--blue)' }}>
              {payments.length.toLocaleString()} Loaded Payments
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BillingMetricCard
          label="Gross revenue"
          value={formatMoneyCompact(grossRevenue)}
          note={`${successfulPayments.length.toLocaleString()} successful payments on this page`}
          icon={<TrendingUp className="h-5 w-5" />}
          progress={grossRevenue > 0 ? 82 : 0}
          tone="green"
        />
        <BillingMetricCard
          label="Net Stripe payouts"
          value={formatMoneyCompact(Math.max(0, grossRevenue - estimatedFees))}
          note={`Estimated Stripe fees ${formatMoney(estimatedFees)}`}
          icon={<CreditCard className="h-5 w-5" />}
          progress={grossRevenue > 0 ? 76 : 0}
          tone="blue"
        />
        <BillingMetricCard
          label="Active subscriptions"
          value={`${merchantsTotal.toLocaleString()} merchants`}
          note={`MRR ${formatMoney(revenue?.mrr ?? 0)} / Growth ${formatPercent(revenue?.growth_percent ?? 0)}`}
          icon={<Store className="h-5 w-5" />}
          progress={Math.min(100, merchantsTotal * 8)}
          tone="purple"
        />
        <BillingMetricCard
          label="Failed charges"
          value={formatMoneyCompact(failedAmount)}
          note={`${failedPayments.length.toLocaleString()} non-success payments need review`}
          icon={<AlertTriangle className="h-5 w-5" />}
          progress={failedPayments.length > 0 ? 35 : 0}
          tone="red"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold" style={{ color: 'var(--navy)' }}>Subscription Tier Fleet & Plan Registry</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Active plans from /v1/plans and Stripe catalog pricing.</p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {activePlans.length} active tiers
            </span>
          </div>
          <div className="space-y-3">
            {activePlans.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No active plans configured.</p>
            ) : activePlans.map((plan) => {
              const width = (plan.price_monthly / maxPlanPrice) * 100;
              return (
                <div key={plan.id} className="grid gap-3 border-b pb-3 last:border-b-0 last:pb-0 md:grid-cols-[160px_1fr_120px]" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--navy)' }}>{plan.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{plan.quota_per_month.toLocaleString()} slips / month</p>
                  </div>
                  <div className="self-center">
                    <div className="h-2 w-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full" style={{ width: `${width}%`, background: plan.is_popular ? 'var(--blue)' : '#10B981' }} />
                    </div>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: 'var(--navy)' }}>{formatMoney(plan.price_monthly)}/mo</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>monthly only</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold" style={{ color: 'var(--navy)' }}>Revenue By Plan</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Monthly revenue analytics from admin API.</p>
            </div>
            <span className="font-bold" style={{ color: 'var(--blue)' }}>{formatMoney(revenue?.mrr ?? 0)}</span>
          </div>
          <div className="space-y-3">
            {revenueByPlan.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No revenue by plan yet.</p>
            ) : revenueByPlan.map((item) => (
              <div key={item.plan}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold" style={{ color: 'var(--navy)' }}>{item.plan}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{formatMoney(item.revenue)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full" style={{ width: `${(item.revenue / maxRevenueByPlan) * 100}%`, background: 'var(--blue)' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="p-3" style={{ background: 'var(--bg-subtle)' }}>
              <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Renewal</p>
              <p className="mt-1 font-bold" style={{ color: 'var(--navy)' }}>{formatPercent(revenue?.renewal_rate ?? 0)}</p>
            </div>
            <div className="p-3" style={{ background: 'var(--bg-subtle)' }}>
              <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Churn</p>
              <p className="mt-1 font-bold" style={{ color: revenue?.churn_rate ? '#DC2626' : 'var(--navy)' }}>{formatPercent(revenue?.churn_rate ?? 0)}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="bg-white" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--navy)' }}>Payment Ledger</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Stripe checkout sessions and billing payment logs.</p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {pagination?.total ?? 0} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              <tr>
                {['Merchant', 'Amount', 'Gateway', 'Reference', 'Status', 'Paid', 'Details'].map((header) => (
                  <th key={header} className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No billing records yet.
                  </td>
                </tr>
              ) : payments.map((payment) => {
                const tone = paymentStatusTone(payment.status);
                return (
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
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-bold" style={{ background: tone.bg, color: tone.text }}>
                        {tone.label}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(payment.paid_at || payment.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentID(payment.id)}
                        className="inline-flex items-center gap-2 border px-3 py-2 text-xs font-bold"
                        style={{ borderColor: 'var(--border)', color: 'var(--navy)', background: '#fff' }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={onPrev}
            disabled={page <= 1 || isFetching}
            className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          >
            Previous
          </button>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Page {pagination?.page ?? page} / {Math.max(1, pagination?.total_pages ?? 1)} - {pagination?.total ?? 0} total
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={page >= (pagination?.total_pages ?? 1) || isFetching}
            className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </section>

      {selectedPaymentID ? (
        <StripePaymentDetailModal
          detail={paymentDetailQuery.data?.data}
          isLoading={paymentDetailQuery.isLoading}
          onClose={() => setSelectedPaymentID(null)}
        />
      ) : null}
    </div>
  );
}

function SlipOutcomeChart({ dashboard }: { dashboard?: AdminAnalyticsDashboard }) {
  const verified = dashboard?.successful_transactions ?? 0;
  const failed = dashboard?.failed_transactions ?? 0;
  const total = verified + failed;
  const verifiedPercent = total > 0 ? (verified / total) * 100 : 0;
  const failedPercent = total > 0 ? (failed / total) * 100 : 0;

  return (
    <section className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
      <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
        Slip Outcome
      </p>
      {total === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No transactions yet.</p>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div style={{ width: `${verifiedPercent}%`, background: 'var(--blue)' }} />
            <div style={{ width: `${failedPercent}%`, background: '#EF4444' }} />
          </div>
          <div className="mt-4 flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2" style={{ background: 'var(--blue)' }} />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Verified</span>
            </div>
            <span className="font-bold" style={{ color: 'var(--navy)' }}>
              {verified.toLocaleString()} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({verifiedPercent.toFixed(1)}%)</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2" style={{ background: '#EF4444' }} />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Failed</span>
            </div>
            <span className="font-bold" style={{ color: 'var(--navy)' }}>
              {failed.toLocaleString()} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({failedPercent.toFixed(1)}%)</span>
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function BankApiStatusWidget({ status, isLoading }: { status?: AdminBankStatus; isLoading: boolean }) {
  const isMock = (status?.banks ?? []).some((bank) => bank.validation_source === 'mock');

  return (
    <section className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Bank API Status
        </p>
        {isMock ? (
          <span
            className="font-mono text-[9px] uppercase tracking-widest px-2 py-1"
            style={{ background: 'var(--bg-subtle)', color: 'var(--blue)' }}
          >
            Mock Mode
          </span>
        ) : null}
      </div>
      {isLoading ? (
        <LinesSkeleton lines={3} className="py-2" />
      ) : !status?.configured || (status.banks ?? []).length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {status?.message || 'Bank API is not configured.'}
        </p>
      ) : (
        <div className="space-y-3">
          {status.banks.map((bank) => (
            <div
              key={bank.bank_code}
              className="flex items-center justify-between pb-3 last:pb-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: bank.status === 'operational' ? '#10B981' : '#EF4444' }}
                />
                <span className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{bank.bank_name}</span>
              </div>
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{bank.response_time_ms}ms</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminAnalyticsOverview({
  dashboard,
  revenue,
  performance,
  bankStatus,
  bankStatusLoading,
  isLoading,
}: {
  dashboard?: AdminAnalyticsDashboard;
  revenue?: AdminRevenueAnalytics;
  performance?: AdminMerchantPerformanceAnalytics;
  bankStatus?: AdminBankStatus;
  bankStatusLoading: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  const successBase = (dashboard?.successful_transactions ?? 0) + (dashboard?.failed_transactions ?? 0);
  const successRate = successBase > 0 ? ((dashboard?.successful_transactions ?? 0) / successBase) * 100 : 0;
  const maxPlanRevenue = Math.max(1, ...(revenue?.revenue_by_plan ?? []).map((item) => item.revenue));
  const merchantLoad = (performance?.usage_per_merchant ?? []).slice(0, 10);
  const maxScans = Math.max(1, ...merchantLoad.map((merchant) => merchant.scans));
  const bankItems = bankStatus?.banks ?? [];
  const operationalBanks = bankItems.filter((bank) => bank.status === 'operational').length;
  const gatewayLatency = bankItems.length > 0
    ? Math.round(bankItems.reduce((sum, bank) => sum + bank.response_time_ms, 0) / bankItems.length)
    : 0;
  const isGatewayHealthy = Boolean(bankStatus?.configured) && (bankItems.length === 0 || operationalBanks === bankItems.length);
  const todayRejected = dashboard?.failed_transactions ?? 0;
  const activeMerchantRate = (dashboard?.total_merchants ?? 0) > 0
    ? ((dashboard?.active_merchants ?? 0) / (dashboard?.total_merchants ?? 1)) * 100
    : 0;
  const totalFailedReasons = (dashboard?.failed_scan_reasons ?? []).reduce((sum, item) => sum + item.count, 0);
  const reasonColors = ['#EF4444', '#2563EB', '#7C3AED', '#F59E0B', '#64748B'];
  const rootCauses = (dashboard?.failed_scan_reasons ?? []).slice(0, 5).map((item, index) => ({
    label: formatReasonLabel(item.reason),
    value: item.count,
    percent: totalFailedReasons > 0 ? (item.count / totalFailedReasons) * 100 : 0,
    color: reasonColors[index % reasonColors.length],
  }));
  const duplicateRejected = dashboard?.failed_scan_reasons?.find((item) => item.reason === 'DUPLICATE_SLIP')?.count ?? 0;
  const recentVerifications = dashboard?.recent_verifications ?? [];

  return (
    <div className="space-y-4">
      <section className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              <span>Core Infrastructure</span>
              <span style={{ color: 'var(--blue)' }}>/ Live Operational Telemetry</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--navy)' }}>
              Platform Operations & Analytics
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-semibold" style={{ background: '#ECFDF5', color: '#047857' }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              HaveSLIP Gateway: {isGatewayHealthy ? `${gatewayLatency}ms latency` : 'Needs attention'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-semibold" style={{ background: 'var(--bg-subtle)', color: 'var(--navy)' }}>
              <Bot className="h-3.5 w-3.5" />
              LINE Webhooks: {dashboard?.connected_bots ?? 0}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-semibold" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
              <AlertTriangle className="h-3.5 w-3.5" />
              Rejections: {todayRejected.toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl px-5 py-3.5 text-xs lg:flex-row lg:items-center lg:justify-between" style={{ background: 'linear-gradient(135deg, #0F1E35 0%, #12305C 100%)', color: 'white' }}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 font-bold">
            <span className="h-2 w-2 rounded-full" style={{ background: isGatewayHealthy ? '#10B981' : '#EF4444' }} />
            HaveSLIP Gateway: {isGatewayHealthy ? 'Operational' : 'Attention needed'}
          </span>
          <span className="hidden h-4 w-px bg-white/20 sm:block" />
          <span>LINE Webhooks: <strong>{dashboard?.connected_bots ?? 0}</strong> configured</span>
          <span className="hidden h-4 w-px bg-white/20 sm:block" />
          <span>Duplicate Rejections: <strong>{duplicateRejected.toLocaleString()}</strong></span>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-widest">
          {(bankItems.length > 0 ? bankItems.slice(0, 3) : [{ bank_code: 'haveslip', bank_name: 'HaveSLIP', status: isGatewayHealthy ? 'operational' : 'unknown' }]).map((bank) => (
            <span key={bank.bank_code} className="rounded-full px-3 py-1" style={{ background: 'rgba(255,255,255,0.12)', color: '#DCEBFF' }}>
              {bank.bank_name}: {bank.status === 'operational' ? 'OK' : 'Check'}
            </span>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Slips Processed',
            value: (dashboard?.total_scans ?? 0).toLocaleString(),
            sub: `${(dashboard?.successful_transactions ?? 0).toLocaleString()} verified`,
            icon: ReceiptText,
            tone: '#2563EB',
          },
          {
            label: 'Verification Success Rate',
            value: formatPercent(successRate),
            sub: `${formatPercent(dashboard?.system_error_rate)} platform error rate`,
            icon: CheckCircle2,
            tone: '#059669',
          },
          {
            label: 'Total Platform Volume',
            value: formatMoney(dashboard?.total_revenue),
            sub: `${formatMoney(dashboard?.today_revenue)} today`,
            icon: CreditCard,
            tone: '#7C3AED',
          },
          {
            label: 'Active Merchants',
            value: `${dashboard?.active_merchants ?? 0}`,
            sub: `${formatPercent(activeMerchantRate)} of ${dashboard?.total_merchants ?? 0} shops`,
            icon: Store,
            tone: '#EA580C',
          },
        ].map((metric) => (
          <section key={metric.label} className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
            <span
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${metric.tone}1A` }}
            >
              <metric.icon className="h-5 w-5" style={{ color: metric.tone }} />
            </span>
            <p className="mb-1 text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {metric.label}
            </p>
            <p className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--navy)', letterSpacing: '-0.02em' }}>{metric.value}</p>
            <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{metric.sub}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <section className="min-w-0 bg-white p-5 xl:col-span-7" style={{ border: '1px solid var(--border)' }}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Slip Velocity & Verification Health</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Merchant scan activity from the current platform data</p>
            </div>
            <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-widest">
              <span className="inline-flex items-center gap-1.5" style={{ color: '#059669' }}><span className="h-2 w-2 rounded-full" style={{ background: '#059669' }} />Verified</span>
              <span className="inline-flex items-center gap-1.5" style={{ color: '#EF4444' }}><span className="h-2 w-2 rounded-full" style={{ background: '#EF4444' }} />Rejected</span>
            </div>
          </div>
          {merchantLoad.length === 0 ? (
            <EmptyState
              compact
              icon={ReceiptText}
              title="No scan activity yet"
              description="Merchant scan volume will appear here once slips start coming in."
            />
          ) : (
            <div className="flex h-56 items-end gap-3 border-b border-l px-4 pt-4" style={{ borderColor: 'var(--border)' }}>
              {merchantLoad.map((merchant) => {
                const height = Math.max(8, (merchant.scans / maxScans) * 100);
                const verifiedPercent = merchant.scans > 0 ? (merchant.verified_scans / merchant.scans) * 100 : 0;
                const failedPercent = merchant.scans > 0 ? (merchant.failed_scans / merchant.scans) * 100 : 0;
                return (
                  <div key={merchant.merchant_id} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex h-44 w-full items-end justify-center">
                      <div
                        title={`${merchant.shop_name}: ${merchant.verified_scans} verified, ${merchant.failed_scans} rejected`}
                        className="flex w-full max-w-9 flex-col-reverse overflow-hidden rounded-t-xl transition-all hover:opacity-80"
                        style={{ height: `${height}%`, background: 'var(--border)' }}
                      >
                        <div style={{ height: `${verifiedPercent}%`, background: '#059669' }} />
                        <div style={{ height: `${failedPercent}%`, background: '#EF4444' }} />
                      </div>
                    </div>
                    <span className="w-full truncate text-center font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      {merchant.shop_name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-5 grid gap-2 border-t pt-4 sm:grid-cols-5" style={{ borderColor: 'var(--border)' }}>
            {rootCauses.length === 0 ? (
              <div className="p-3 sm:col-span-5" style={{ background: 'var(--bg-subtle)' }}>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No failed verification reasons recorded yet.</p>
              </div>
            ) : rootCauses.map((cause) => (
              <div key={cause.label} className="p-3" style={{ background: 'var(--bg-subtle)' }}>
                <p className="text-lg font-black" style={{ color: 'var(--navy)' }}>{cause.percent.toFixed(0)}%</p>
                <p className="truncate font-mono text-[9px] uppercase tracking-widest" style={{ color: cause.color }}>{cause.label}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{cause.value.toLocaleString()} slips</p>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 bg-white p-5 xl:col-span-5" style={{ border: '1px solid var(--border)' }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Merchant Subscriptions & MRR</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Active billable tiers and recurring quota plans</p>
            </div>
            <span className="px-2 py-1 font-mono text-[9px] uppercase tracking-widest" style={{ background: 'var(--bg-subtle)', color: 'var(--blue)' }}>
              {dashboard?.active_merchants ?? 0} Shops
            </span>
          </div>
          <div className="mb-5 flex items-center justify-between rounded-2xl p-5" style={{ background: 'var(--bg-subtle)' }}>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Monthly Recurring Revenue</p>
              <p className="mt-1 text-2xl font-black" style={{ color: 'var(--blue)' }}>{formatMoney(revenue?.mrr)}</p>
            </div>
            <TrendingUp className="h-8 w-8" style={{ color: 'var(--blue)' }} />
          </div>
          <div className="space-y-3">
            {(revenue?.revenue_by_plan ?? []).length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No paid revenue yet.</p>
            ) : revenue?.revenue_by_plan.map((item) => (
              <div key={item.plan}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>{item.plan}</span>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatMoney(item.revenue)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(4, (item.revenue / maxPlanRevenue) * 100)}%`, background: 'var(--blue)' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="p-3" style={{ background: 'var(--bg-subtle)' }}>
              <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Growth</p>
              <p className="font-bold" style={{ color: 'var(--navy)' }}>{formatPercent(revenue?.growth_percent)}</p>
            </div>
            <div className="p-3" style={{ background: 'var(--bg-subtle)' }}>
              <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Renewal</p>
              <p className="font-bold" style={{ color: 'var(--navy)' }}>{formatPercent(revenue?.renewal_rate)}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <section className="min-w-0 bg-white xl:col-span-8" style={{ border: '1px solid var(--border)' }}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Live Verification Stream</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Latest merchant activity summary from HaveSLIP and LINE webhook usage</p>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Buffer: {(dashboard?.total_scans ?? 0).toLocaleString()} scans
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  {['Timestamp', 'Merchant & Line Bot', 'Slip ID & Bank', 'Amount', 'Provider Ref', 'Flow Status', 'Audit'].map((header) => (
                    <th key={header} className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentVerifications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>No live merchant activity yet.</td>
                  </tr>
                ) : recentVerifications.map((item) => {
                  const verified = isVerifiedStatus(item.status);
                  return (
                  <tr key={item.transaction_id !== '00000000-0000-0000-0000-000000000000' ? item.transaction_id : item.slip_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-muted)' }}>{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/merchants/${item.merchant_id}`} className="font-semibold hover:opacity-70" style={{ color: 'var(--navy)' }}>
                        {item.merchant_name || item.merchant_id}
                      </Link>
                      <p className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>{item.merchant_id.slice(0, 8)}-token</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono" style={{ color: 'var(--navy)' }}>SLIP-{item.slip_id.slice(0, 6).toUpperCase()}</p>
                      <p className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>
                        {[item.sender_bank, item.receiver_bank].filter(Boolean).join(' -> ') || item.provider || 'Provider rail'}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--navy)' }}>{formatMoney(item.amount)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      <p className="font-mono">{item.provider_verification_id || '-'}</p>
                      <p className="font-mono text-[9px]">
                        {item.provider_status || item.provider || '-'} {item.provider_cached ? '(cached)' : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold"
                        style={{
                          background: verified ? '#ECFDF5' : '#FEF2F2',
                          color: verified ? '#047857' : '#B91C1C',
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: verified ? '#10B981' : '#EF4444' }}
                        />
                        {verified ? 'Verified' : formatReasonLabel(item.fail_reason || item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/merchants/${item.merchant_id}`} className="font-semibold hover:opacity-70" style={{ color: 'var(--blue)' }}>
                        Inspect
                      </Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="min-w-0 bg-white p-5 xl:col-span-4" style={{ border: '1px solid var(--border)' }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Bank & HaveSLIP Status</h3>
            {bankStatusLoading ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--blue)' }} /> : null}
          </div>
          <div className="space-y-3">
            {!bankStatus?.configured || bankItems.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{bankStatus?.message || 'HaveSLIP status has no bank rows yet.'}</p>
            ) : bankItems.map((bank) => (
              <div key={bank.bank_code} className="flex items-center justify-between pb-3 last:pb-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{bank.bank_name}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{bank.validation_source}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold" style={{ color: bank.status === 'operational' ? '#047857' : '#B91C1C' }}>{bank.status}</p>
                  <p className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>{bank.response_time_ms}ms</p>
                </div>
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
  const initialTab: Tab = normalizedTab && ['merchants', 'users', 'billing', 'analytics', 'transactions'].includes(normalizedTab)
    ? normalizedTab as Tab
    : 'analytics';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [userSearch, setUserSearch] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantPage, setMerchantPage] = useState(1);
  const [billingPage, setBillingPage] = useState(1);
  const [billingStatus, setBillingStatus] = useState('');
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionStatus, setTransactionStatus] = useState('');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [selectedSlip, setSelectedSlip] = useState<AdminSlipHistoryItem | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userStatus]);

  useEffect(() => {
    setMerchantPage(1);
  }, [merchantSearch]);

  useEffect(() => {
    setUserPage(1);
    setMerchantPage(1);
    setBillingPage(1);
    setTransactionPage(1);
  }, [startDate, endDate]);

  useEffect(() => {
    setBillingPage(1);
  }, [billingStatus]);

  useEffect(() => {
    setTransactionPage(1);
  }, [transactionStatus, transactionSearch]);

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
    queryKey: ['admin-merchants', merchantSearch.trim(), merchantPage, startDate, endDate],
    queryFn: () => api.getAdminMerchants({
      page: merchantPage,
      limit: 20,
      search: merchantSearch.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    enabled: user?.role === 'admin' && tab === 'merchants',
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users', userSearch.trim(), userStatus, userPage, startDate, endDate],
    queryFn: () => api.getAdminUsers({
      page: userPage,
      limit: 20,
      search: userSearch.trim() || undefined,
      role: 'merchant',
      status: userStatus || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    enabled: user?.role === 'admin' && tab === 'users',
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => api.updateAdminUserStatus(userId, isActive),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? 'User unblocked' : 'User blocked');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update user status');
    },
  });

  const adminAnalyticsQuery = useQuery({
    queryKey: ['admin-analytics-dashboard'],
    queryFn: () => api.getAdminAnalyticsDashboard(),
    enabled: user?.role === 'admin' && (tab === 'analytics' || tab === 'billing'),
  });

  const adminRevenueQuery = useQuery({
    queryKey: ['admin-analytics-revenue', 'monthly'],
    queryFn: () => api.getAdminRevenueAnalytics({ period: 'monthly' }),
    enabled: user?.role === 'admin' && (tab === 'analytics' || tab === 'billing'),
  });

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.getPlans(),
    enabled: user?.role === 'admin' && tab === 'billing',
  });

  const adminPerformanceQuery = useQuery({
    queryKey: ['admin-analytics-performance'],
    queryFn: () => api.getAdminMerchantPerformance(),
    enabled: user?.role === 'admin' && tab === 'analytics',
  });

  const adminBankStatusQuery = useQuery({
    queryKey: ['admin-bank-status'],
    queryFn: () => api.getAdminBankStatus(),
    enabled: user?.role === 'admin' && tab === 'analytics',
  });

  const paymentsQuery = useQuery({
    queryKey: ['admin-payments', billingPage, billingStatus, startDate, endDate],
    queryFn: () => api.getAdminPayments({
      page: billingPage,
      limit: 20,
      status: billingStatus || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    enabled: user?.role === 'admin' && tab === 'billing',
  });

  const transactionsQuery = useQuery({
    queryKey: ['admin-transactions', transactionPage, transactionStatus, transactionSearch.trim(), startDate, endDate],
    queryFn: () => api.getAdminSlipHistory({
      page: transactionPage,
      limit: 20,
      status: transactionStatus || undefined,
      search: transactionSearch.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    enabled: user?.role === 'admin' && tab === 'transactions',
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dateParams = { start_date: startDate || undefined, end_date: endDate || undefined };
      let blob: Blob;
      if (tab === 'users') {
        blob = await api.exportAdminUsers({ search: userSearch.trim() || undefined, role: 'merchant', status: userStatus || undefined, ...dateParams });
      } else if (tab === 'merchants') {
        blob = await api.exportAdminMerchants({ search: merchantSearch.trim() || undefined, ...dateParams });
      } else if (tab === 'transactions') {
        throw new Error('Transaction export is not available yet');
      } else if (tab === 'billing') {
        blob = await api.exportAdminPayments({ status: billingStatus || undefined, ...dateParams });
      } else {
        blob = await api.exportAdminPayments(dateParams);
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  const merchants = merchantsQuery.data?.data?.items ?? [];
  const merchantsPagination = merchantsQuery.data?.data?.pagination;
  const users = usersQuery.data?.data?.items ?? [];
  const usersPagination = usersQuery.data?.data?.pagination;
  const payments = paymentsQuery.data?.data?.items ?? [];
  const paymentsPagination = paymentsQuery.data?.data;
  const plans = plansQuery.data?.data?.plans ?? [];
  const transactions = transactionsQuery.data?.data?.items ?? [];
  const transactionsPagination = transactionsQuery.data?.data?.pagination;
  const isTableLoading = tab === 'merchants' ? merchantsQuery.isLoading : usersQuery.isLoading;
  const meta = TAB_META[tab];
  const merchantPerformance = adminPerformanceQuery.data?.data?.usage_per_merchant ?? [];
  const activeMerchantCount = merchants.filter((merchant) => merchant.is_active).length;
  const lineConnectedCount = merchants.filter((merchant) => merchant.line_connected).length;
  const nearQuotaCount = merchantPerformance.filter((merchant) => merchant.quota > 0 && merchant.quota_percent >= 80 && merchant.quota_percent < 100).length;
  const blockedMerchantCount = merchantPerformance.filter((merchant) => merchant.quota > 0 && merchant.quota_percent >= 100).length;

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

        {tab === 'merchants' && !merchantsQuery.isError ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Merchants', value: merchantsPagination?.total ?? 0, sub: `${activeMerchantCount} active on this page`, icon: Store, color: 'var(--blue)' },
              { label: 'Near Quota', value: nearQuotaCount, sub: '80-99% quota usage', icon: Activity, color: '#D97706' },
              { label: 'Blocked / Exceeded', value: blockedMerchantCount, sub: '100%+ quota used', icon: AlertTriangle, color: '#DC2626' },
              { label: 'LINE Webhooks Active', value: lineConnectedCount, sub: `${merchants.length - lineConnectedCount} missing setup`, icon: Bot, color: '#047857' },
            ].map((item) => (
              <section key={item.label} className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
                <span
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  <item.icon className="h-5 w-5" style={{ color: item.color }} />
                </span>
                <p className="mb-1 text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--navy)', letterSpacing: '-0.02em' }}>{item.value.toLocaleString()}</p>
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
              </section>
            ))}
          </div>
        ) : null}

        {tab === 'users' || tab === 'merchants' || tab === 'billing' ? (
          <div className="flex flex-col gap-3 bg-white p-3 lg:flex-row lg:items-center lg:justify-between" style={{ border: '1px solid var(--border)' }}>
            <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
              {tab === 'users' || tab === 'merchants' ? (
                <label
                  className="flex min-h-11 flex-1 items-center gap-2 px-3 text-sm lg:max-w-xs"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  <Search className="h-4 w-4" />
                  <input
                    value={tab === 'users' ? userSearch : merchantSearch}
                    onChange={(event) =>
                      tab === 'users' ? setUserSearch(event.target.value) : setMerchantSearch(event.target.value)
                    }
                    placeholder={tab === 'users' ? 'Search name, email, merchant...' : 'Filter merchant name, owner, email...'}
                    className="w-full bg-transparent outline-none placeholder:opacity-60"
                    style={{ color: 'var(--navy)' }}
                  />
                </label>
              ) : null}
              {tab === 'users' ? (
                <select
                  value={userStatus}
                  onChange={(event) => setUserStatus(event.target.value)}
                  className="min-h-11 px-3 text-sm outline-none lg:w-48"
                  style={{ border: '1px solid var(--border)', color: 'var(--navy)', background: 'var(--bg-subtle)' }}
                >
                  <option value="">All status</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                  <option value="verified">Email verified</option>
                  <option value="unverified">Email unverified</option>
                  <option value="line_linked">LINE linked</option>
                  <option value="line_unlinked">LINE not linked</option>
                </select>
              ) : null}
              {tab === 'billing' ? (
                <select
                  value={billingStatus}
                  onChange={(event) => setBillingStatus(event.target.value)}
                  className="min-h-11 px-3 text-sm outline-none lg:w-48"
                  style={{ border: '1px solid var(--border)', color: 'var(--navy)', background: 'var(--bg-subtle)' }}
                >
                  <option value="">All statuses</option>
                  <option value="success">Success</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  max={endDate || undefined}
                  className="min-h-11 px-3 text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--navy)' }}
                />
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  min={startDate || undefined}
                  className="min-h-11 px-3 text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--navy)' }}
                />
                {startDate || endDate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="font-mono text-[10px] uppercase tracking-widest transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-2 border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export CSV
            </button>
          </div>
        ) : null}

        {tab === 'transactions' ? (
          <section className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-sm font-black" style={{ color: 'var(--navy)' }}>ตัวกรองประวัติ</h2>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  กรองจากสถานะ วันที่ และคำค้นหา เพื่อค้นหารายการที่ต้องการ
                </p>
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
                รวม {transactionsPagination?.total ?? 0} รายการ (โหลดมาแล้ว {transactions.length} รายการ)
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              <label className="block">
                <span className="text-xs font-bold" style={{ color: 'var(--navy)' }}>สถานะ</span>
                <select
                  value={transactionStatus}
                  onChange={(event) => setTransactionStatus(event.target.value)}
                  className="mt-1 h-10 w-full px-3 text-sm outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--navy)', background: '#fff' }}
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
                <span className="text-xs font-bold" style={{ color: 'var(--navy)' }}>ช่องทาง</span>
                <select
                  className="mt-1 h-10 w-full px-3 text-sm outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--navy)', background: '#fff' }}
                  defaultValue=""
                >
                  <option value="">ทั้งหมด</option>
                  <option value="line">LINE Bot</option>
                  <option value="upload">Dashboard Upload</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold" style={{ color: 'var(--navy)' }}>วันที่เริ่ม</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  max={endDate || undefined}
                  className="mt-1 h-10 w-full px-3 text-sm outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold" style={{ color: 'var(--navy)' }}>วันที่สิ้นสุด</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  min={startDate || undefined}
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
                    value={transactionSearch}
                    onChange={(event) => setTransactionSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') transactionsQuery.refetch();
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
                  onClick={() => {
                    setTransactionStatus('');
                    setTransactionSearch('');
                    setStartDate('');
                    setEndDate('');
                    setTransactionPage(1);
                  }}
                >
                  ล้างตัวกรอง
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white"
                  style={{ background: 'var(--blue)' }}
                  onClick={() => {
                    setTransactionPage(1);
                    transactionsQuery.refetch();
                  }}
                >
                  <RefreshCw className={`h-4 w-4 ${transactionsQuery.isFetching ? 'animate-spin' : ''}`} />
                  รีเฟรชข้อมูล
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <div
          className={tab === 'analytics' ? '' : 'overflow-hidden bg-white'}
          style={tab === 'analytics' ? undefined : { border: '1px solid var(--border)' }}
        >
          {tab === 'transactions' ? (
            transactionsQuery.isLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : (
              <>
                <div className="grid min-w-[980px] grid-cols-[1.1fr_1fr_2fr_0.7fr_1fr_1.2fr] px-5 py-3 font-mono text-[9px] uppercase tracking-widest" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  <span>สถานะ</span>
                  <span>ยอดเงิน</span>
                  <span>ต้นทาง - ปลายทาง</span>
                  <span>เครดิตแพ็กเกจ</span>
                  <span>วันที่</span>
                  <span className="text-right">ดำเนินการ</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Slip History</span>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{transactionsPagination?.total ?? 0} total</span>
                </div>
                {transactions.length === 0 ? (
                  <p className="p-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No slips found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[980px]">
                      {transactions.map((item) => {
                        const { slip, transaction } = item;
                        const isDuplicate = slip.status === 'failed' && slip.fail_reason === 'DUPLICATE_SLIP';
                        return (
                        <div key={slip.id} className="grid grid-cols-[1.1fr_1fr_2fr_0.7fr_1fr_1.2fr] items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-3">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: slip.status === 'verified' ? '#10B981' : slip.status === 'failed' ? '#EF4444' : '#F59E0B' }} />
                            <span className="rounded-full px-3 py-1 text-xs font-black uppercase" style={{ background: slip.status === 'verified' ? '#DCFCE7' : slip.status === 'failed' ? '#FEE2E2' : '#FEF3C7', color: slip.status === 'verified' ? '#047857' : slip.status === 'failed' ? '#DC2626' : '#D97706' }}>
                              {slip.status === 'verified' ? 'success' : slip.status}
                            </span>
                          </div>
                          <p className="text-base font-black" style={{ color: 'var(--navy)' }}>{transaction ? `฿${transaction.amount.toLocaleString('en-US')}` : '-'}</p>
                          <div className="min-w-0">
                            <p className="truncate font-bold" style={{ color: 'var(--navy)' }}>
                              {transaction ? `${transaction.sender_name || transaction.sender_bank || '-'} → ${transaction.receiver_name || transaction.receiver_bank || '-'}` : slip.fail_reason?.replaceAll('_', ' ') || 'No transaction recorded'}
                            </p>
                            <p className="truncate font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {transaction?.reference_no || slip.id}
                            </p>
                          </div>
                          <p className="font-black" style={{ color: 'var(--navy)' }}>1</p>
                          <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(slip.created_at)}</p>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedSlip(item)}
                              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold"
                              style={{ border: '1px solid var(--border)', color: 'var(--navy)', background: '#fff' }}
                            >
                              <Eye className="h-4 w-4" />
                              ดูรายละเอียด
                            </button>
                            {isDuplicate && (
                              <span className="inline-flex items-center px-3 py-2 text-xs font-bold" style={{ border: '1px solid #F59E0B', color: '#D97706' }}>
                                Duplicate
                              </span>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setTransactionPage((page) => Math.max(1, page - 1))}
                    disabled={transactionPage <= 1 || transactionsQuery.isFetching}
                    className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <span className="text-center font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Page {transactionsPagination?.page ?? transactionPage} / {Math.max(1, transactionsPagination?.total_pages ?? 1)}
                    <br />
                    {transactionsPagination?.total ?? 0} total slips
                  </span>
                  <button
                    type="button"
                    onClick={() => setTransactionPage((page) => page + 1)}
                    disabled={transactionPage >= (transactionsPagination?.total_pages ?? 1) || transactionsQuery.isFetching}
                    className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </>
            )
          ) : tab === 'billing' ? (
            paymentsQuery.isLoading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : (
              <BillingWorkspace
                payments={payments}
                pagination={paymentsPagination}
                page={billingPage}
                isFetching={paymentsQuery.isFetching}
                plans={plans}
                merchantsTotal={adminAnalyticsQuery.data?.data?.active_merchants ?? 0}
                revenue={adminRevenueQuery.data?.data}
                onPrev={() => setBillingPage((page) => Math.max(1, page - 1))}
                onNext={() => setBillingPage((page) => page + 1)}
              />
            )
          ) : tab === 'analytics' ? (
            <div>
              <AdminAnalyticsOverview
                dashboard={adminAnalyticsQuery.data?.data}
                revenue={adminRevenueQuery.data?.data}
                performance={adminPerformanceQuery.data?.data}
                bankStatus={adminBankStatusQuery.data?.data}
                bankStatusLoading={adminBankStatusQuery.isLoading}
                isLoading={adminAnalyticsQuery.isLoading || adminRevenueQuery.isLoading || adminPerformanceQuery.isLoading}
              />
            </div>
          ) : tab === 'merchants' && merchantsQuery.isError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800" role="alert">
              <span>Could not load merchants. Please try again.</span>
              <button type="button" onClick={() => merchantsQuery.refetch()} className="border border-red-300 bg-white px-3 py-2 font-semibold hover:bg-red-100">
                Retry
              </button>
            </div>
          ) : isTableLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : tab === 'merchants' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>Merchants Directory</h2>
                  {merchantSearch.trim() ? (
                    <span className="px-2 py-1 text-xs font-semibold" style={{ background: 'white', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      Filtered: {merchantSearch.trim()}
                    </span>
                  ) : null}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Showing {merchants.length} of {merchantsPagination?.total ?? 0} merchants
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-900 disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  <tr>
                    {['Merchant Name & Info', 'Plan & Billing', 'Quota Utilization', 'LINE Webhook Status', 'Recent Activity', 'Quick Actions'].map((header) => (
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
                  ) : merchants.map((merchant) => {
                    const quota = getPlanQuota(merchant.plan);
                    const quotaPercent = quota > 0 ? Math.min(100, (merchant.total_scans / quota) * 100) : 0;
                    const remaining = Math.max(0, quota - merchant.total_scans);
                    const quotaTone = getQuotaTone(quotaPercent);
                    const initials = merchant.shop_name.slice(0, 2).toUpperCase();
                    return (
                    <tr key={merchant.id} className="transition-colors hover:bg-slate-50" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-black" style={{ background: 'var(--bg-subtle)', color: 'var(--blue)', border: '1px solid var(--border)' }}>
                            {initials}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={`/admin/merchants/${merchant.id}`} className="font-bold hover:opacity-70" style={{ color: 'var(--navy)' }}>
                                {merchant.shop_name}
                              </Link>
                              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: merchant.is_active ? '#DCFCE7' : '#FEE2E2', color: merchant.is_active ? '#047857' : '#DC2626' }}>
                                {merchant.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Owner: {merchant.owner_name || 'Unknown'}</p>
                            <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{merchant.owner_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 text-xs font-semibold" style={{ background: 'var(--bg-subtle)', color: 'var(--blue)' }}>
                          {merchant.plan}
                        </span>
                        <p className="mt-1 text-xs font-semibold capitalize" style={{ color: merchant.subscription_status === 'active' ? '#047857' : 'var(--text-muted)' }}>
                          {merchant.subscription_status}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Created {formatDate(merchant.created_at)}</p>
                      </td>
                      <td className="min-w-[220px] px-4 py-4">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold" style={{ color: 'var(--navy)' }}>
                            {merchant.total_scans.toLocaleString()} / {quota > 0 ? quota.toLocaleString() : '-'} slips
                          </span>
                          <span className="font-bold" style={{ color: quotaTone.text }}>{formatPercent(quotaPercent)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                          <div className="h-full rounded-full" style={{ width: `${quotaPercent}%`, background: quotaTone.bar }} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span style={{ color: 'var(--text-muted)' }}>{quota > 0 ? `${remaining.toLocaleString()} remaining` : 'Quota unavailable'}</span>
                          <span className="font-semibold" style={{ color: quotaTone.text }}>{quotaTone.label}</span>
                        </div>
                      </td>
                      <td className="min-w-[190px] px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: merchant.line_connected ? '#10B981' : '#F59E0B' }} />
                          <span className="font-semibold" style={{ color: merchant.line_connected ? '#047857' : '#D97706' }}>
                            {merchant.line_connected ? 'Connected' : 'Setup pending'}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>ref: {merchant.id.slice(0, 4)}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Auto LINE reply {merchant.line_connected ? 'on' : 'off'}</p>
                      </td>
                      <td className="min-w-[170px] px-4 py-4">
                        <p className="font-semibold" style={{ color: 'var(--navy)' }}>{merchant.total_transactions.toLocaleString()} transactions</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{merchant.total_scans.toLocaleString()} slip scans</p>
                        <p className="text-[11px] font-semibold" style={{ color: merchant.total_transactions > 0 ? '#047857' : 'var(--text-muted)' }}>
                          {merchant.total_transactions > 0 ? 'Activity recorded' : 'No activity yet'}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/merchants/${merchant.id}`}
                            className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90"
                            style={{ background: 'var(--blue)' }}
                          >
                            View Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setMerchantPage((page) => Math.max(1, page - 1))}
                  disabled={merchantPage <= 1 || merchantsQuery.isFetching}
                  className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Page {merchantsPagination?.page ?? merchantPage} / {Math.max(1, merchantsPagination?.total_pages ?? 1)} - {merchantsPagination?.total ?? 0} total
                </span>
                <button
                  type="button"
                  onClick={() => setMerchantPage((page) => page + 1)}
                  disabled={merchantPage >= (merchantsPagination?.total_pages ?? 1) || merchantsQuery.isFetching}
                  className="border border-zinc-200 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  <tr>
                    {['User', 'Status', 'Role', 'Merchant', 'LINE', 'Email', 'Created', 'Actions'].map((header) => (
                      <th key={header} className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        No users found.
                      </td>
                    </tr>
                  ) : users.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3">
                        <p className="font-bold" style={{ color: 'var(--navy)' }}>{item.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-1 text-xs font-bold uppercase"
                          style={{ background: item.is_active ? '#DCFCE7' : '#FEE2E2', color: item.is_active ? '#047857' : '#DC2626' }}
                        >
                          {item.is_active ? 'Active' : 'Blocked'}
                        </span>
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
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={updateUserStatusMutation.isPending}
                          onClick={() => updateUserStatusMutation.mutate({ userId: item.id, isActive: !item.is_active })}
                          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold disabled:opacity-50"
                          style={{
                            border: item.is_active ? '1px solid #FCA5A5' : '1px solid #86EFAC',
                            color: item.is_active ? '#DC2626' : '#047857',
                            background: '#fff',
                          }}
                        >
                          {item.is_active ? <Ban className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          {item.is_active ? 'Block' : 'Unblock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
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
      {selectedSlip?.transaction && (
        <TransactionDetailModal transaction={selectedSlip.transaction} onClose={() => setSelectedSlip(null)} />
      )}
      {selectedSlip && !selectedSlip.transaction && (
        <RejectedSlipDetailModal slip={selectedSlip.slip} onClose={() => setSelectedSlip(null)} />
      )}
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

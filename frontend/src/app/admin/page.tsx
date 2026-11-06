'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CreditCard, Download, Eye, Loader2, RefreshCw, Search, Store, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { AdminShell } from '@/components/admin/AdminShell';
import { ConfirmModal } from '@/components/ConfirmModal';
import { RejectedSlipDetailModal, TransactionDetailModal } from '@/components/admin/AdminMerchantTransactions';
import { formatReasonLabel } from '@/lib/admin-format';
import type { AdminAnalyticsDashboard, AdminBankStatus, AdminMerchantPerformanceAnalytics, AdminPaymentDetail, AdminRevenueAnalytics, AdminSlipHistoryItem, PaymentLog, SubscriptionPlan } from '@/types/api';
import { AdminReportExportDialog } from '@/components/admin/AdminReportExportDialog';
import { AdminCSVExportDialog, type AdminCSVExportKind } from '@/components/admin/AdminCSVExportDialog';
import { AnalyticsSkeleton, LinesSkeleton, TableSkeleton } from '@/components/ui/Skeleton';

type Tab = 'merchants' | 'users' | 'billing' | 'analytics' | 'transactions';

const TAB_META: Record<Tab, { crumb: string; title: string }> = {
  analytics: { crumb: '', title: 'ภาพรวมระบบ' },
  merchants: { crumb: '', title: 'ร้านค้า' },
  transactions: { crumb: '', title: 'รายการสลิป' },
  users: { crumb: '', title: 'ผู้ใช้งาน' },
  billing: { crumb: '', title: 'การชำระเงิน' },
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('th-TH', {
    day: 'numeric',
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
  return `฿${(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function formatPercent(value?: number) {
  return `${(value ?? 0).toFixed(1)}%`;
}

function isVerifiedStatus(value?: string) {
  return value === 'success' || value === 'verified';
}

function getQuotaTone(percent: number) {
  if (percent >= 100) return { text: 'var(--err-ink)', bar: 'var(--err-ink)', bg: 'var(--err-pale)', label: 'เต็มแล้ว' };
  if (percent >= 80) return { text: 'var(--warn-ink)', bar: '#F59E0B', bg: 'var(--warn-pale)', label: 'ใกล้เต็ม' };
  return { text: 'var(--ok-ink)', bar: '#10B981', bg: 'var(--ok-pale)', label: 'ปกติ' };
}

function formatMoneyCompact(value?: number) {
  const amount = value ?? 0;
  if (Math.abs(amount) >= 1000000) return `฿${(amount / 1000000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1000) return `฿${(amount / 1000).toFixed(1)}K`;
  return formatMoney(amount);
}

function paymentStatusTone(status?: string) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'success' || normalized === 'paid') return { bg: 'var(--ok-pale)', text: 'var(--ok-ink)', label: 'สำเร็จ' };
  if (normalized === 'pending') return { bg: 'var(--warn-pale)', text: 'var(--warn-ink)', label: 'รอดำเนินการ' };
  if (normalized === 'refunded') return { bg: '#EDE9FE', text: '#6D28D9', label: 'คืนเงินแล้ว' };
  return { bg: 'var(--err-pale)', text: 'var(--err-ink)', label: status || 'ไม่สำเร็จ' };
}

function BillingMetricCard({
  label,
  value,
  note,
  tone = 'ink',
}: {
  label: string;
  value: string;
  note: string;
  tone?: 'ink' | 'red';
}) {
  return (
    <section className="rounded-[1.75rem] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: tone === 'red' ? 'var(--err-ink)' : 'var(--ink)' }}>{value}</p>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{note}</p>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="max-w-[60%] break-words text-right text-sm font-semibold" style={{ color: 'var(--ink)' }}>{value || '-'}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4" role="dialog" aria-modal="true">
      <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] bg-[var(--bg-card)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-[1.75rem] bg-[var(--bg-card)] p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>รายละเอียดการชำระเงิน</h3>
            <p className="mt-1 tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>{payment?.gateway_reference_id || payment?.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
            aria-label="ปิด"
          >
            ×
          </button>
        </div>

        {isLoading ? (
          <LinesSkeleton lines={6} />
        ) : !payment ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>ไม่พบรายละเอียดการชำระเงิน</div>
        ) : (
          <div className="space-y-6 p-6">
            <div className="grid grid-cols-1 overflow-hidden rounded-2xl border md:grid-cols-3" style={{ borderColor: 'var(--border)' }}>
              {[
                ['ยอดรวม', formatMoney(stripe?.amount_total ?? payment.amount)],
                ['ชำระแล้ว', payment.status === 'success' ? formatMoney(payment.amount) : formatMoney(0)],
                ['ยอดคงเหลือ', payment.status === 'success' ? formatMoney(0) : formatMoney(payment.amount)],
              ].map(([label, value]) => (
                <div key={label} className="p-4 md:border-r md:last:border-r-0" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--ink)' }}>{value}</p>
                </div>
              ))}
            </div>

            {!stripe ? (
              <div className="rounded-2xl p-4 text-sm" style={{ background: 'var(--warn-pale)', color: 'var(--warn-ink)' }}>
                ไม่มีข้อมูลจาก Stripe สำหรับรายการนี้ แสดงเฉพาะบันทึกในระบบ
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
                <h4 className="mb-3 font-bold" style={{ color: 'var(--ink)' }}>บันทึกในระบบ</h4>
                <DetailRow label="ร้านค้า" value={payment.merchant_name} />
                <DetailRow label="รหัสร้านค้า" value={<span className="tabular-nums text-xs">{payment.merchant_id}</span>} />
                <DetailRow label="รหัสการชำระเงิน" value={<span className="tabular-nums text-xs">{payment.id}</span>} />
                <DetailRow label="รหัสการสมัครแพ็กเกจ" value={<span className="tabular-nums text-xs">{payment.subscription_id || '-'}</span>} />
                <DetailRow label="ช่องทางชำระ" value={payment.gateway} />
                <DetailRow label="สถานะ" value={payment.status} />
                <DetailRow label="ชำระเมื่อ" value={formatDateTime(payment.paid_at || payment.created_at)} />
              </section>

              <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
                <h4 className="mb-3 font-bold" style={{ color: 'var(--ink)' }}>ข้อมูลจาก Stripe</h4>
                <DetailRow label="Checkout session" value={<span className="tabular-nums text-xs">{stripe?.session_id || payment.gateway_reference_id}</span>} />
                <DetailRow label="สถานะ session" value={stripe?.status} />
                <DetailRow label="สถานะการชำระ" value={stripe?.payment_status} />
                <DetailRow label="โหมด" value={stripe?.mode} />
                <DetailRow label="ลูกค้า" value={<span className="tabular-nums text-xs">{stripe?.customer_id || '-'}</span>} />
                <DetailRow label="อีเมลลูกค้า" value={stripe?.customer_email} />
                <DetailRow label="Payment intent" value={<span className="tabular-nums text-xs">{stripe?.payment_intent_id || '-'}</span>} />
                <DetailRow label="สร้างเมื่อ" value={formatDateTime(stripe?.created_at)} />
                <DetailRow label="หมดอายุ" value={formatDateTime(stripe?.expires_at)} />
              </section>
            </div>

            <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
              <h4 className="mb-3 font-bold" style={{ color: 'var(--ink)' }}>รายการใน Checkout</h4>
              {lineItems.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>ไม่มีรายการสินค้าจาก Stripe</p>
              ) : (
                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <div key={`${item.price_id}-${index}`} className="flex items-start justify-between gap-4 rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                      <div>
                        <p className="font-bold" style={{ color: 'var(--ink)' }}>{item.quantity} × {item.description || item.price_id || 'รายการจาก Stripe'}</p>
                        <p className="mt-1 tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>{item.price_id || '-'}</p>
                      </div>
                      <p className="font-bold" style={{ color: 'var(--ink)' }}>{formatMoney(item.amount_total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {metadata.length > 0 ? (
              <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
                <h4 className="mb-3 font-bold" style={{ color: 'var(--ink)' }}>ข้อมูลเพิ่มเติมจาก Stripe</h4>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {metadata.map(([key, value]) => (
                    <div key={key} className="rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{key}</p>
                      <p className="mt-1 break-words text-sm font-bold" style={{ color: 'var(--ink)' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {stripe?.dashboard_url ? (
                <a href={stripe.dashboard_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}>
                  <Eye className="h-4 w-4" /> เปิดใน Stripe
                </a>
              ) : null}
              {stripe?.payment_intent_dashboard_url ? (
                <a href={stripe.payment_intent_dashboard_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}>
                  <CreditCard className="h-4 w-4" /> Payment Intent
                </a>
              ) : null}
              {stripe?.customer_dashboard_url ? (
                <a href={stripe.customer_dashboard_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}>
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <BillingMetricCard
          label="รายได้ที่ชำระสำเร็จ"
          value={formatMoneyCompact(grossRevenue)}
          note={`${successfulPayments.length.toLocaleString()} รายการในหน้านี้`}
        />
        <BillingMetricCard
          label="รับจริงหลังหักค่าธรรมเนียม (ประมาณ)"
          value={formatMoneyCompact(Math.max(0, grossRevenue - estimatedFees))}
          note={`ค่าธรรมเนียม Stripe โดยประมาณ ${formatMoney(estimatedFees)}`}
        />
        <BillingMetricCard
          label="ร้านที่ใช้งานแพ็กเกจอยู่"
          value={`${merchantsTotal.toLocaleString()} ร้าน`}
          note={`MRR ${formatMoney(revenue?.mrr ?? 0)} · เติบโต ${formatPercent(revenue?.growth_percent ?? 0)}`}
        />
        <BillingMetricCard
          label="รายการที่ไม่สำเร็จ"
          value={formatMoneyCompact(failedAmount)}
          note={`${failedPayments.length.toLocaleString()} รายการที่ควรตรวจสอบ`}
          tone={failedPayments.length > 0 ? 'red' : 'ink'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[1.75rem] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="mb-5 text-base font-semibold" style={{ color: 'var(--ink)' }}>แพ็กเกจที่เปิดขาย</h3>
          <div className="space-y-5">
            {activePlans.length === 0 ? (
              <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>ยังไม่มีแพ็กเกจที่เปิดขาย</p>
            ) : activePlans.map((plan) => {
              const width = (plan.price_monthly / maxPlanPrice) * 100;
              return (
                <div key={plan.id} className="grid gap-3 md:grid-cols-[10rem_1fr_8rem] md:items-center">
                  <div>
                    <p className="font-medium" style={{ color: 'var(--ink)' }}>{plan.name}</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{plan.quota_per_month.toLocaleString()} ใบ / เดือน</p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${width}%`, background: plan.is_popular ? 'var(--blue)' : 'var(--ok-ink)' }} />
                  </div>
                  <p className="font-semibold tabular-nums md:text-right" style={{ color: 'var(--ink)' }}>{formatMoney(plan.price_monthly)} / เดือน</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.75rem] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>รายได้ตามแพ็กเกจ</h3>
            <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{formatMoney(revenue?.mrr ?? 0)}</span>
          </div>
          <div className="space-y-4">
            {revenueByPlan.length === 0 ? (
              <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>ยังไม่มีรายได้จากแพ็กเกจ</p>
            ) : revenueByPlan.map((item) => (
              <div key={item.plan}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium" style={{ color: 'var(--ink)' }}>{item.plan}</span>
                  <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{formatMoney(item.revenue)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(item.revenue / maxRevenueByPlan) * 100}%`, background: 'var(--blue)' }} />
                </div>
              </div>
            ))}
          </div>
          <dl className="mt-6 text-sm">
            <div className="flex justify-between py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
              <dt style={{ color: 'var(--text-muted)' }}>อัตราต่ออายุ</dt>
              <dd className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{formatPercent(revenue?.renewal_rate ?? 0)}</dd>
            </div>
            <div className="flex justify-between py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
              <dt style={{ color: 'var(--text-muted)' }}>อัตราที่ลูกค้าเลิกใช้</dt>
              <dd className="font-semibold tabular-nums" style={{ color: revenue?.churn_rate ? 'var(--err-ink)' : 'var(--ink)' }}>{formatPercent(revenue?.churn_rate ?? 0)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="overflow-hidden rounded-[1.75rem]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-baseline justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>ประวัติการชำระเงิน</h3>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ทั้งหมด {pagination?.total ?? 0} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ borderBottom: '1px solid var(--border)' }}>
              <tr>
                {['ร้านค้า', 'ยอดเงิน', 'ช่องทาง', 'รหัสอ้างอิง', 'สถานะ', 'วันที่ชำระ', ''].map((header, index) => (
                  <th key={header + index} className="px-5 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    ยังไม่มีรายการชำระเงิน
                  </td>
                </tr>
              ) : payments.map((payment) => {
                const tone = paymentStatusTone(payment.status);
                return (
                  <tr key={payment.id} className="transition-colors hover:bg-[var(--bg-subtle)]" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-5 py-4">
                      <Link href={`/admin/merchants/${payment.merchant_id}`} className="font-medium hover:underline" style={{ color: 'var(--ink)' }}>
                        {payment.merchant_name || payment.merchant_id}
                      </Link>
                    </td>
                    <td className="px-5 py-4 font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{formatMoney(payment.amount)}</td>
                    <td className="px-5 py-4 capitalize" style={{ color: 'var(--ink)' }}>{payment.gateway}</td>
                    <td className="px-5 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>{payment.gateway_reference_id || '-'}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: tone.bg, color: tone.text }}>
                        {tone.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4" style={{ color: 'var(--text-muted)' }}>{formatDate(payment.paid_at || payment.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentID(payment.id)}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-subtle)]"
                        style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
                      >
                        <Eye className="h-4 w-4" />
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={onPrev}
            disabled={page <= 1 || isFetching}
            className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ก่อนหน้า
          </button>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            หน้า {pagination?.page ?? page} / {Math.max(1, pagination?.total_pages ?? 1)} · ทั้งหมด {pagination?.total ?? 0} รายการ
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={page >= (pagination?.total_pages ?? 1) || isFetching}
            className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ถัดไป
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

function Donut({
  segments,
  center,
  caption,
}: {
  segments: { value: number; color: string }[];
  center: string;
  caption?: string;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  const gap = visible.length > 1 ? 5 : 0;
  let offset = 0;
  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="14" style={{ stroke: 'var(--border)' }} />
        {total > 0 && visible.map((segment) => {
          const length = (segment.value / total) * circumference;
          const node = (
            <circle
              key={segment.color + segment.value}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0.1, length - gap)} ${circumference}`}
              strokeDashoffset={-offset}
              style={{ stroke: segment.color }}
            />
          );
          offset += length;
          return node;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{center}</p>
          {caption ? <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{caption}</p> : null}
        </div>
      </div>
    </div>
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
  const totalFailedReasons = (dashboard?.failed_scan_reasons ?? []).reduce((sum, item) => sum + item.count, 0);
  const reasonColors = ['#EF4444', '#2563EB', '#7C3AED', '#F59E0B', '#64748B'];
  const rootCauses = (dashboard?.failed_scan_reasons ?? []).slice(0, 5).map((item, index) => ({
    label: formatReasonLabel(item.reason),
    value: item.count,
    percent: totalFailedReasons > 0 ? (item.count / totalFailedReasons) * 100 : 0,
    color: reasonColors[index % reasonColors.length],
  }));
  const recentVerifications = dashboard?.recent_verifications ?? [];
  const merchantTotal = dashboard?.total_merchants ?? 0;

  const planColors = ['var(--blue)', '#0D9488', '#F59E0B', '#64748B', '#EF4444'];
  const planRows = (revenue?.revenue_by_plan ?? []).map((item, index) => ({ ...item, color: planColors[index % planColors.length] }));
  const quotaRows = (performance?.usage_per_merchant ?? [])
    .filter((merchant) => merchant.quota > 0)
    .sort((a, b) => b.quota_percent - a.quota_percent)
    .slice(0, 5);

  return (
    <div className="max-w-[80rem] space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-[1.75rem] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="mb-5 text-base font-semibold" style={{ color: 'var(--ink)' }}>ผลการตรวจสลิป</h2>
          <div className="flex items-center gap-6">
            <Donut
              segments={[
                { value: dashboard?.successful_transactions ?? 0, color: 'var(--ok-ink)' },
                { value: dashboard?.failed_transactions ?? 0, color: 'var(--err-ink)' },
              ]}
              center={formatPercent(successRate)}
              caption="ตรวจผ่าน"
            />
            <ul className="min-w-0 space-y-3 text-sm">
              <li className="flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--ok-ink)' }} />
                ผ่าน <span className="font-semibold tabular-nums">{(dashboard?.successful_transactions ?? 0).toLocaleString()}</span>
              </li>
              <li className="flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--err-ink)' }} />
                ไม่ผ่าน <span className="font-semibold tabular-nums">{(dashboard?.failed_transactions ?? 0).toLocaleString()}</span>
              </li>
              <li style={{ color: 'var(--text-muted)' }}>วันนี้ {(dashboard?.today_transactions ?? 0).toLocaleString()} รายการ</li>
            </ul>
          </div>
        </section>

        <section className="rounded-[1.75rem] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="mb-5 text-base font-semibold" style={{ color: 'var(--ink)' }}>รายได้ตามแพ็กเกจ</h2>
          <div className="flex items-center gap-6">
            <Donut
              segments={planRows.map((row) => ({ value: row.revenue, color: row.color }))}
              center={formatMoney(revenue?.mrr)}
              caption="ต่อเดือน"
            />
            <ul className="min-w-0 flex-1 space-y-3 text-sm">
              {planRows.length === 0 ? (
                <li style={{ color: 'var(--text-muted)' }}>ยังไม่มีรายได้จากแพ็กเกจ</li>
              ) : planRows.map((row) => (
                <li key={row.plan} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2" style={{ color: 'var(--ink)' }}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
                    <span className="truncate">{row.plan}</span>
                  </span>
                  <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{formatMoney(row.revenue)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-[1.75rem] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="mb-5 text-base font-semibold" style={{ color: 'var(--ink)' }}>การใช้โควต้าของร้าน</h2>
          {quotaRows.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>ยังไม่มีข้อมูลโควต้า</p>
          ) : (
            <ul className="space-y-4">
              {quotaRows.map((merchant) => {
                const color = merchant.quota_percent >= 100 ? 'var(--err-ink)' : merchant.quota_percent >= 80 ? 'var(--warn-ink)' : 'var(--blue)';
                return (
                  <li key={merchant.merchant_id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium" style={{ color: 'var(--ink)' }}>{merchant.shop_name}</span>
                      <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{merchant.quota_used.toLocaleString()} / {merchant.quota.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 h-2.5 rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, merchant.quota_percent))}%`, background: color }} />
                    </div>
                    <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>เหลือ {merchant.quota_remaining.toLocaleString()} เครดิต</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="min-w-0 rounded-[1.75rem] p-7" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>สลิปล่าสุด</h2>
            <Link href="/admin?tab=transactions" className="text-sm hover:underline" style={{ color: 'var(--blue)' }}>ดูทั้งหมด →</Link>
          </div>
          {recentVerifications.length === 0 ? (
            <p className="py-10 text-sm" style={{ color: 'var(--text-muted)' }}>ยังไม่มีสลิป</p>
          ) : (
            <ul>
              {recentVerifications.slice(0, 8).map((item) => {
                const verified = isVerifiedStatus(item.status);
                return (
                  <li key={item.transaction_id !== '00000000-0000-0000-0000-000000000000' ? item.transaction_id : item.slip_id}>
                    <Link href={`/admin/merchants/${item.merchant_id}`} className="-mx-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl px-3 py-3.5 transition-colors hover:bg-[var(--bg-subtle)]">
                      <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: verified ? 'var(--ok-pale)' : 'var(--err-pale)' }}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: verified ? 'var(--ok-ink)' : 'var(--err-ink)' }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium" style={{ color: 'var(--ink)' }}>{item.merchant_name || item.merchant_id.slice(0, 8)}</span>
                        <span className="block truncate text-sm" style={{ color: verified ? 'var(--text-muted)' : 'var(--err-ink)' }}>
                          {verified
                            ? ([item.sender_bank, item.receiver_bank].filter(Boolean).join(' → ') || 'ตรวจผ่าน')
                            : formatReasonLabel(item.fail_reason || item.status)}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{formatMoney(item.amount)}</span>
                        <span className="block whitespace-nowrap text-sm" style={{ color: 'var(--text-muted)' }}>{formatDate(item.created_at)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="min-w-0 space-y-4 max-lg:order-first">
          <section className="rounded-[1.75rem] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--ink)' }}>ภาพรวม</h2>
            <dl>
              {[
                ['สลิปที่ตรวจแล้ว', `${(dashboard?.total_scans ?? 0).toLocaleString()} ใบ`],
                ['ตรวจผ่าน', formatPercent(successRate)],
                ['ยอดเงินรวม', formatMoney(dashboard?.total_revenue)],
                ['ร้านที่ใช้งานอยู่', `${dashboard?.active_merchants ?? 0} จาก ${merchantTotal} ร้าน`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <dt className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</dt>
                  <dd className="text-lg font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <span className="h-2 w-2 rounded-full" style={{ background: bankStatus?.configured && bankItems.every((bank) => bank.status === 'operational') ? 'var(--ok-ink)' : 'var(--err-ink)' }} />
              {bankStatusLoading
                ? 'กำลังตรวจสถานะระบบตรวจสลิป...'
                : bankStatus?.configured && bankItems.every((bank) => bank.status === 'operational')
                  ? 'ระบบตรวจสลิปทำงานปกติ'
                  : (bankStatus?.message || 'ระบบตรวจสลิปมีปัญหา')}
            </p>
          </section>

          <section className="rounded-[1.75rem] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="mb-5 text-base font-semibold" style={{ color: 'var(--ink)' }}>ร้านที่ส่งสลิปมากสุด</h2>
            {merchantLoad.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>ยังไม่มีการสแกนสลิป</p>
            ) : (
              <ol className="space-y-4">
                {merchantLoad.slice(0, 6).map((merchant) => (
                  <li key={merchant.merchant_id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <Link href={`/admin/merchants/${merchant.merchant_id}`} className="truncate font-medium hover:underline" style={{ color: 'var(--ink)' }}>{merchant.shop_name}</Link>
                      <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{merchant.scans.toLocaleString()} ใบ</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="flex h-full overflow-hidden rounded-full" style={{ width: `${Math.max(3, (merchant.scans / maxScans) * 100)}%` }}>
                        <div style={{ flex: merchant.verified_scans, background: 'var(--ok-ink)' }} />
                        <div style={{ flex: merchant.failed_scans, background: 'var(--err-ink)' }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-[1.75rem] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="mb-5 text-base font-semibold" style={{ color: 'var(--ink)' }}>สลิปไม่ผ่านเพราะอะไร</h2>
            {rootCauses.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>ยังไม่มีสลิปที่ไม่ผ่าน</p>
            ) : (
              <>
                <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                  {rootCauses.map((cause) => (
                    <div key={cause.label} style={{ width: `${cause.percent}%`, background: cause.color }} />
                  ))}
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {rootCauses.map((cause) => (
                    <li key={cause.label} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: cause.color }} />
                        {cause.label}
                      </span>
                      <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{cause.value.toLocaleString()} ใบ</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </aside>
      </div>

      <details className="group rounded-[1.75rem]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <summary className="cursor-pointer select-none rounded-[1.75rem] px-7 py-4 text-sm font-semibold" style={{ color: 'var(--blue)' }}>
          ดูตัวเลขทั้งหมด
        </summary>
        <div className="grid gap-x-12 gap-y-8 px-7 pb-7 pt-2 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              title: 'สลิป',
              items: [
                ['ตรวจผ่าน', (dashboard?.successful_transactions ?? 0).toLocaleString()],
                ['ตรวจไม่ผ่าน', (dashboard?.failed_transactions ?? 0).toLocaleString()],
                ['ธุรกรรมทั้งหมด', (dashboard?.total_transactions ?? 0).toLocaleString()],
                ['ธุรกรรมวันนี้', (dashboard?.today_transactions ?? 0).toLocaleString()],
                ['อัตราผิดพลาดของระบบ', formatPercent(dashboard?.system_error_rate)],
              ],
            },
            {
              title: 'รายได้',
              items: [
                ['ยอดเงินวันนี้', formatMoney(dashboard?.today_revenue)],
                ['รายได้ต่อเดือน (MRR)', formatMoney(revenue?.mrr)],
                ['การเติบโต', formatPercent(revenue?.growth_percent)],
                ['อัตราต่ออายุ', formatPercent(revenue?.renewal_rate)],
                ['อัตราที่ลูกค้าเลิกใช้', formatPercent(revenue?.churn_rate)],
              ],
            },
            {
              title: 'ร้านค้าและผู้ใช้งาน',
              items: [
                ['ร้านค้าทั้งหมด', merchantTotal.toLocaleString()],
                ['เชื่อม LINE แล้ว', (dashboard?.connected_bots ?? 0).toLocaleString()],
                ['ผู้ใช้งานทั้งหมด', (dashboard?.total_users ?? 0).toLocaleString()],
              ],
            },
            {
              title: 'รายได้แยกตามแพ็กเกจ',
              items: (revenue?.revenue_by_plan ?? []).map((item): [string, string] => [item.plan, formatMoney(item.revenue)]),
            },
            {
              title: 'สถานะธนาคาร',
              items: bankItems.map((bank): [string, string] => [bank.bank_name, `${bank.status === 'operational' ? 'ปกติ' : bank.status} · ${bank.response_time_ms} ms`]),
            },
            {
              title: 'ผู้ให้บริการตรวจสลิป',
              items: [
                ['เครดิตที่ใช้ไป', (dashboard?.provider_credits_used ?? 0).toLocaleString()],
                ['ตรวจซ้ำจากแคช', (dashboard?.provider_cached_count ?? 0).toLocaleString()],
              ],
            },
          ].map((group) => (
            <dl key={group.title}>
              <dt className="mb-2 text-sm font-bold" style={{ color: 'var(--ink)' }}>{group.title}</dt>
              {group.items.map(([label, value]) => (
                <dd key={label} className="flex items-baseline justify-between gap-3 py-1.5 text-sm" style={{ borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="font-semibold" style={{ color: 'var(--ink)' }}>{value}</span>
                </dd>
              ))}
            </dl>
          ))}
        </div>
      </details>
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
  const [pendingUserStatus, setPendingUserStatus] = useState<{ id: string; name: string; isActive: boolean } | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [csvExportKind, setCsvExportKind] = useState<AdminCSVExportKind | null>(null);
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
      toast.success(variables.isActive ? 'เปิดใช้งานผู้ใช้แล้ว' : 'ระงับผู้ใช้แล้ว');
      setPendingUserStatus(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'เปลี่ยนสถานะผู้ใช้ไม่สำเร็จ');
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
          {tab === 'analytics' ? (
            <p className="mb-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-bold tracking-tight" style={{ fontSize: '1.75rem', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              {meta.title}
            </h1>
            {tab === 'analytics' && <button type="button" onClick={() => setReportOpen(true)} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: 'var(--navy)' }}>
              <Download className="h-4 w-4" /> ดาวน์โหลดรายงาน
            </button>}
          </div>
        </div>

        <AdminReportExportDialog open={reportOpen} onClose={() => setReportOpen(false)} />
        {csvExportKind && <AdminCSVExportDialog
          kind={csvExportKind}
          onClose={() => setCsvExportKind(null)}
          initialFilters={{
            status: csvExportKind === 'transactions' ? transactionStatus : csvExportKind === 'users' ? userStatus : csvExportKind === 'billing' ? billingStatus : '',
            search: csvExportKind === 'transactions' ? transactionSearch : csvExportKind === 'users' ? userSearch : csvExportKind === 'merchants' ? merchantSearch : '',
            startDate,
            endDate,
          }}
        />}

        {tab === 'merchants' && !merchantsQuery.isError ? (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              { label: 'ร้านค้าทั้งหมด', value: merchantsPagination?.total ?? 0, sub: `เปิดใช้งาน ${activeMerchantCount} ร้านในหน้านี้` },
              { label: 'โควต้าใกล้เต็ม', value: nearQuotaCount, sub: 'ใช้ไปแล้ว 80–99%' },
              { label: 'โควต้าเต็มแล้ว', value: blockedMerchantCount, sub: 'ใช้ครบหรือเกิน 100%' },
              { label: 'เชื่อมต่อ LINE แล้ว', value: lineConnectedCount, sub: `ยังไม่ได้ตั้งค่า ${merchants.length - lineConnectedCount} ร้าน` },
            ].map((item) => (
              <section key={item.label} className="rounded-[1.75rem] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{item.value.toLocaleString()}</p>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
              </section>
            ))}
          </div>
        ) : null}

        {tab === 'users' || tab === 'merchants' || tab === 'billing' ? (
          <div className="flex flex-col gap-3 rounded-[1.75rem] p-3 lg:flex-row lg:items-center lg:justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
              {tab === 'users' || tab === 'merchants' ? (
                <label
                  className="flex min-h-11 flex-1 items-center gap-2 rounded-full px-4 text-sm lg:max-w-xs"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  <Search className="h-4 w-4" />
                  <input
                    value={tab === 'users' ? userSearch : merchantSearch}
                    onChange={(event) =>
                      tab === 'users' ? setUserSearch(event.target.value) : setMerchantSearch(event.target.value)
                    }
                    placeholder={tab === 'users' ? 'ค้นหาชื่อ อีเมล หรือร้านค้า' : 'ค้นหาชื่อร้าน เจ้าของ หรืออีเมล'}
                    className="w-full bg-transparent outline-none placeholder:opacity-60"
                    style={{ color: 'var(--ink)' }}
                  />
                </label>
              ) : null}
              {tab === 'users' ? (
                <select
                  value={userStatus}
                  onChange={(event) => setUserStatus(event.target.value)}
                  className="min-h-11 rounded-full px-4 text-sm outline-none lg:w-48"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--bg-subtle)' }}
                >
                  <option value="">ทุกสถานะ</option>
                  <option value="active">ใช้งานอยู่</option>
                  <option value="blocked">ถูกระงับ</option>
                  <option value="verified">ยืนยันอีเมลแล้ว</option>
                  <option value="unverified">ยังไม่ยืนยันอีเมล</option>
                  <option value="line_linked">เชื่อมต่อ LINE แล้ว</option>
                  <option value="line_unlinked">ยังไม่เชื่อมต่อ LINE</option>
                </select>
              ) : null}
              {tab === 'billing' ? (
                <select
                  value={billingStatus}
                  onChange={(event) => setBillingStatus(event.target.value)}
                  className="min-h-11 rounded-full px-4 text-sm outline-none lg:w-48"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--bg-subtle)' }}
                >
                  <option value="">ทุกสถานะ</option>
                  <option value="success">สำเร็จ</option>
                  <option value="pending">รอดำเนินการ</option>
                  <option value="failed">ไม่สำเร็จ</option>
                  <option value="refunded">คืนเงินแล้ว</option>
                </select>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  max={endDate || undefined}
                  className="min-h-11 rounded-full px-4 text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ถึง</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  min={startDate || undefined}
                  className="min-h-11 rounded-full px-4 text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                />
                {startDate || endDate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ล้างวันที่
                  </button>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCsvExportKind(tab as AdminCSVExportKind)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[var(--bg-subtle)]"
            >
              <Download className="h-4 w-4" />
              ส่งออก CSV
            </button>
          </div>
        ) : null}

        {tab === 'transactions' ? (
          <section className="rounded-[1.75rem] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>ตัวกรองประวัติ</h2>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  กรองจากสถานะ วันที่ และคำค้นหา เพื่อค้นหารายการที่ต้องการ
                </p>
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                รวม {transactionsPagination?.total ?? 0} รายการ (โหลดมาแล้ว {transactions.length} รายการ)
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <label className="block">
                <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>สถานะ</span>
                <select
                  value={transactionStatus}
                  onChange={(event) => setTransactionStatus(event.target.value)}
                  className="mt-1 h-10 w-full rounded-xl px-3 text-sm outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--bg-card)' }}
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
                <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>วันที่เริ่ม</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  max={endDate || undefined}
                  className="mt-1 h-10 w-full rounded-xl px-3 text-sm outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>วันที่สิ้นสุด</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  min={startDate || undefined}
                  className="mt-1 h-10 w-full rounded-xl px-3 text-sm outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                />
              </label>
            </div>

            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <label className="block lg:w-[420px]">
                <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>คำค้นหา (UUID / ผู้รับ / ธนาคาร)</span>
                <div className="mt-1 flex h-10 items-center gap-2 rounded-xl px-3" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={transactionSearch}
                    onChange={(event) => setTransactionSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') transactionsQuery.refetch();
                    }}
                    className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                    style={{ color: 'var(--ink)' }}
                    placeholder="เช่น 1234-uuid หรือ ชื่อร้าน"
                  />
                </div>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full px-5 py-2 text-sm font-medium"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--bg-card)' }}
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
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white"
                  style={{ background: 'var(--blue)' }}
                  onClick={() => {
                    setTransactionPage(1);
                    transactionsQuery.refetch();
                  }}
                >
                  <RefreshCw className={`h-4 w-4 ${transactionsQuery.isFetching ? 'animate-spin' : ''}`} />
                  รีเฟรชข้อมูล
                </button>
                <button
                  type="button"
                  onClick={() => setCsvExportKind('transactions')}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--bg-card)' }}
                >
                  <Download className="h-4 w-4" />
                  ส่งออก CSV
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <div
          className={tab === 'analytics' || tab === 'billing' ? '' : 'overflow-hidden rounded-[1.75rem]'}
          style={tab === 'analytics' || tab === 'billing' ? undefined : { background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {tab === 'transactions' ? (
            transactionsQuery.isLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : (
              <>
                <div className="grid min-w-[980px] grid-cols-[1.1fr_1fr_2fr_0.7fr_1fr_160px] gap-3 px-5 py-3 text-sm" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  <span>สถานะ</span>
                  <span>ยอดเงิน</span>
                  <span>ต้นทาง - ปลายทาง</span>
                  <span>เครดิตแพ็กเกจ</span>
                  <span>วันที่</span>
                  <span className="text-right">ดำเนินการ</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ประวัติการตรวจสลิป</span>
                  <span className="tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>ทั้งหมด {transactionsPagination?.total ?? 0} รายการ</span>
                </div>
                {transactions.length === 0 ? (
                  <p className="p-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>ไม่พบสลิป</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[980px]">
                      {transactions.map((item) => {
                        const { slip, transaction } = item;
                        const isDuplicate = slip.status === 'failed' && slip.fail_reason === 'DUPLICATE_SLIP';
                        return (
                        <div key={slip.id} className="grid grid-cols-[1.1fr_1fr_2fr_0.7fr_1fr_160px] items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-3">
                            <span className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold" style={{ background: slip.status === 'verified' ? 'var(--ok-pale)' : isDuplicate ? 'var(--warn-pale)' : slip.status === 'failed' ? 'var(--err-pale)' : 'var(--warn-pale)', color: slip.status === 'verified' ? 'var(--ok-ink)' : isDuplicate ? 'var(--warn-ink)' : slip.status === 'failed' ? 'var(--err-ink)' : 'var(--warn-ink)' }}>
                              {isDuplicate ? 'สลิปซ้ำ' : slip.status === 'verified' ? 'สำเร็จ' : slip.status === 'failed' ? 'ไม่สำเร็จ' : slip.status === 'pending' ? 'รอตรวจสอบ' : 'กำลังตรวจสอบ'}
                            </span>
                          </div>
                          <p className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{transaction ? `฿${transaction.amount.toLocaleString('en-US')}` : '-'}</p>
                          <div className="min-w-0">
                            <p className="truncate font-bold" style={{ color: 'var(--ink)' }}>
                              {transaction ? `${transaction.sender_name || transaction.sender_bank || '-'} → ${transaction.receiver_name || transaction.receiver_bank || '-'}` : (slip.fail_reason ? formatReasonLabel(slip.fail_reason) : 'ไม่มีรายการธุรกรรม')}
                            </p>
                            <p className="truncate tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>
                              {transaction?.reference_no || slip.id}
                            </p>
                          </div>
                          <p className="font-semibold" style={{ color: 'var(--ink)' }}>1</p>
                          <p className="tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(slip.created_at)}</p>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedSlip(item)}
                              className="inline-flex h-9 w-36 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors hover:bg-[var(--bg-subtle)]"
                              style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--bg-card)' }}
                            >
                              <Eye className="h-4 w-4" />
                              ดูรายละเอียด
                            </button>
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
                    className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    หน้า {transactionsPagination?.page ?? transactionPage} / {Math.max(1, transactionsPagination?.total_pages ?? 1)}
                    <br />
                    ทั้งหมด {transactionsPagination?.total ?? 0} ใบ
                  </span>
                  <button
                    type="button"
                    onClick={() => setTransactionPage((page) => page + 1)}
                    disabled={transactionPage >= (transactionsPagination?.total_pages ?? 1) || transactionsQuery.isFetching}
                    className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ถัดไป
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
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 text-sm" style={{ background: 'var(--err-pale)', color: 'var(--err-ink)' }} role="alert">
              <span>โหลดรายชื่อร้านค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</span>
              <button type="button" onClick={() => merchantsQuery.refetch()} className="rounded-full border px-5 py-2 font-medium" style={{ borderColor: 'var(--err-ink)' }}>
                ลองใหม่
              </button>
            </div>
          ) : isTableLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : tab === 'merchants' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>รายชื่อร้านค้า</h2>
                  {merchantSearch.trim() ? (
                    <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      กรองด้วย: {merchantSearch.trim()}
                    </span>
                  ) : null}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    แสดง {merchants.length} จาก {merchantsPagination?.total ?? 0} ร้าน
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead style={{ borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    {['ร้านค้า', 'แพ็กเกจ', 'โควต้าที่ใช้', 'สถานะ LINE', 'การใช้งานล่าสุด', 'จัดการ'].map((header) => (
                      <th key={header} className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {merchants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        ยังไม่มีร้านค้า
                      </td>
                    </tr>
                  ) : merchants.map((merchant) => {
                    const quota = merchant.quota_limit;
                    const quotaPercent = quota > 0 ? Math.min(100, (merchant.quota_used / quota) * 100) : 0;
                    const remaining = merchant.quota_remaining;
                    const quotaTone = getQuotaTone(quotaPercent);
                    const initials = merchant.shop_name.slice(0, 2).toUpperCase();
                    return (
                    <tr key={merchant.id} className="transition-colors hover:bg-[var(--bg-subtle)]" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold" style={{ background: 'var(--bg-subtle)', color: 'var(--blue)', border: '1px solid var(--border)' }}>
                            {initials}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={`/admin/merchants/${merchant.id}`} className="font-bold hover:opacity-70" style={{ color: 'var(--ink)' }}>
                                {merchant.shop_name}
                              </Link>
                              <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: merchant.is_active ? 'var(--ok-pale)' : 'var(--err-pale)', color: merchant.is_active ? 'var(--ok-ink)' : 'var(--err-ink)' }}>
                                {merchant.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                              </span>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>เจ้าของ: {merchant.owner_name || 'ไม่ระบุ'}</p>
                            <p className="tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>{merchant.owner_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--blue)' }}>
                          {merchant.plan}
                        </span>
                        <p className="mt-1 text-xs font-semibold capitalize" style={{ color: merchant.subscription_status === 'active' ? 'var(--ok-ink)' : 'var(--text-muted)' }}>
                          {merchant.subscription_status === 'active' ? 'ใช้งานอยู่' : merchant.subscription_status === 'cancelled' ? 'ยกเลิกแล้ว' : merchant.subscription_status === 'expired' ? 'หมดอายุ' : merchant.subscription_status === 'pending' ? 'รอดำเนินการ' : merchant.subscription_status}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>สมัครเมื่อ {formatDate(merchant.created_at)}</p>
                      </td>
                      <td className="min-w-[220px] px-4 py-4">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                            {merchant.quota_used.toLocaleString()} / {quota > 0 ? quota.toLocaleString() : '-'} ใบ
                          </span>
                          <span className="font-bold" style={{ color: quotaTone.text }}>{formatPercent(quotaPercent)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                          <div className="h-full rounded-full" style={{ width: `${quotaPercent}%`, background: quotaTone.bar }} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span style={{ color: 'var(--text-muted)' }}>{quota > 0 ? `เหลือ ${remaining.toLocaleString()}` : 'ไม่มีข้อมูลโควต้า'}</span>
                          <span className="font-semibold" style={{ color: quotaTone.text }}>{quotaTone.label}</span>
                        </div>
                      </td>
                      <td className="min-w-[190px] px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: merchant.line_connected ? '#10B981' : '#F59E0B' }} />
                          <span className="font-semibold" style={{ color: merchant.line_connected ? 'var(--ok-ink)' : 'var(--warn-ink)' }}>
                            {merchant.line_connected ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้ตั้งค่า'}
                          </span>
                        </div>
                        <p className="mt-1 tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>ref: {merchant.id.slice(0, 4)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ตอบ LINE อัตโนมัติ: {merchant.line_connected ? 'เปิด' : 'ปิด'}</p>
                      </td>
                      <td className="min-w-[170px] px-4 py-4">
                        <p className="font-semibold" style={{ color: 'var(--ink)' }}>{merchant.total_transactions.toLocaleString()} รายการ</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>สแกนสลิป {merchant.total_scans.toLocaleString()} ครั้ง</p>
                        <p className="text-xs font-semibold" style={{ color: merchant.total_transactions > 0 ? 'var(--ok-ink)' : 'var(--text-muted)' }}>
                          {merchant.total_transactions > 0 ? 'มีการใช้งานแล้ว' : 'ยังไม่มีการใช้งาน'}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/merchants/${merchant.id}`}
                            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                            style={{ background: 'var(--blue)' }}
                          >
                            ดูรายละเอียด
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
                  className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ก่อนหน้า
                </button>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  หน้า {merchantsPagination?.page ?? merchantPage} / {Math.max(1, merchantsPagination?.total_pages ?? 1)} · ทั้งหมด {merchantsPagination?.total ?? 0} รายการ
                </span>
                <button
                  type="button"
                  onClick={() => setMerchantPage((page) => page + 1)}
                  disabled={merchantPage >= (merchantsPagination?.total_pages ?? 1) || merchantsQuery.isFetching}
                  className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ถัดไป
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead style={{ borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    {['ผู้ใช้', 'สถานะ', 'บทบาท', 'ร้านค้า', 'LINE', 'อีเมล', 'สมัครเมื่อ', 'จัดการ'].map((header) => (
                      <th key={header} className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        ไม่พบผู้ใช้งาน
                      </td>
                    </tr>
                  ) : users.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3">
                        <p className="font-bold" style={{ color: 'var(--ink)' }}>{item.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ background: item.is_active ? 'var(--ok-pale)' : 'var(--err-pale)', color: item.is_active ? 'var(--ok-ink)' : 'var(--err-ink)' }}
                        >
                          {item.is_active ? 'ใช้งานอยู่' : 'ถูกระงับ'}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--ink)' }}>{item.role === 'admin' ? 'ผู้ดูแลระบบ' : item.role === 'merchant' ? 'ร้านค้า' : item.role}</td>
                      <td className="px-4 py-3">
                        {item.merchant_id ? (
                          <Link href={`/admin/merchants/${item.merchant_id}`} className="font-medium hover:underline" style={{ color: 'var(--blue)' }}>
                            {item.merchant_name || item.merchant_id}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>ไม่มีร้านค้า</span>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--ink)' }}>{item.line_linked ? 'เชื่อมแล้ว' : 'ยังไม่เชื่อม'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--ink)' }}>{item.email_verified ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(item.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={updateUserStatusMutation.isPending}
                          onClick={() => setPendingUserStatus({ id: item.id, name: item.name || item.email || 'ผู้ใช้', isActive: !item.is_active })}
                          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
                          style={{
                            border: item.is_active ? '1px solid #FCA5A5' : '1px solid #86EFAC',
                            color: item.is_active ? 'var(--err-ink)' : 'var(--ok-ink)',
                            background: 'var(--bg-card)',
                          }}
                        >
                          {item.is_active ? <Ban className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          {item.is_active ? 'ระงับ' : 'เปิดใช้งาน'}
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
                  className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ก่อนหน้า
                </button>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  หน้า {usersPagination?.page ?? userPage} / {Math.max(1, usersPagination?.total_pages ?? 1)} · ทั้งหมด {usersPagination?.total ?? 0} รายการ
                </span>
                <button
                  type="button"
                  onClick={() => setUserPage((page) => page + 1)}
                  disabled={userPage >= (usersPagination?.total_pages ?? 1) || usersQuery.isFetching}
                  className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ถัดไป
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
      <ConfirmModal
        open={pendingUserStatus !== null}
        title={pendingUserStatus?.isActive ? 'เปิดใช้งานผู้ใช้' : 'ยืนยันการระงับผู้ใช้'}
        message={pendingUserStatus?.isActive
          ? `ต้องการเปิดใช้งานบัญชี ${pendingUserStatus.name} อีกครั้งหรือไม่?`
          : `ต้องการระงับบัญชี ${pendingUserStatus?.name ?? ''} หรือไม่? ผู้ใช้นี้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง`}
        confirmLabel={pendingUserStatus?.isActive ? 'เปิดใช้งาน' : 'ระงับผู้ใช้'}
        cancelLabel="ยกเลิก"
        destructive={!pendingUserStatus?.isActive}
        isLoading={updateUserStatusMutation.isPending}
        onConfirm={() => {
          if (pendingUserStatus) updateUserStatusMutation.mutate({ userId: pendingUserStatus.id, isActive: pendingUserStatus.isActive });
        }}
        onCancel={() => setPendingUserStatus(null)}
      />
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

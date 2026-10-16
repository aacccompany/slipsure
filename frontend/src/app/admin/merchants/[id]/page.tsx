'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Activity, ArrowLeft, Bot, Clipboard, CreditCard, Loader2, Mail, MapPin, Phone, ReceiptText, Settings, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminMerchantTransactions } from '@/components/admin/AdminMerchantTransactions';
import { PageSkeleton } from '@/components/ui/Skeleton';

function formatMoney(value?: number) {
  return `THB ${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatShortDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function quotaTone(percent: number) {
  if (percent >= 100) return { text: '#DC2626', bar: '#DC2626', label: 'Blocked' };
  if (percent >= 80) return { text: '#D97706', bar: '#F59E0B', label: 'Near quota' };
  return { text: '#047857', bar: '#10B981', label: 'Healthy' };
}

export default function AdminMerchantDetailPage() {
  const params = useParams<{ id: string }>();
  const merchantId = params.id;
  const { user, isLoading } = useAuth();
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quotaInput, setQuotaInput] = useState('');
  const queryClient = useQueryClient();

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

  const updateQuotaMutation = useMutation({
    mutationFn: (quotaExtra: number) => api.updateAdminMerchantQuota(merchantId, quotaExtra),
    onSuccess: () => {
      toast.success('Extra quota updated');
      setQuotaModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-merchant-detail', merchantId] });
      queryClient.invalidateQueries({ queryKey: ['admin-merchant-performance'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update quota');
    },
  });

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <PageSkeleton />
      </div>
    );
  }

  const detail = detailQuery.data?.data;

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
  const quotaExtra = detail.subscription?.quota_override ?? 0;
  const packageQuota = Math.max(0, usage.quota - quotaExtra);
  const remainingPercent = usage.quota > 0 ? Math.min(100, Math.max(0, (usage.remaining / usage.quota) * 100)) : 0;
  const quota = quotaTone(usage.quota > 0 ? 100 - remainingPercent : 100);
  const initials = detail.merchant.shop_name.slice(0, 2).toUpperCase();
  const planName = detail.subscription?.plan?.name || detail.subscription?.plan_id || 'No plan';
  const renewsAt = detail.subscription?.expires_at || detail.usage.next_reset;
  const openQuotaModal = () => {
    setQuotaInput(String(quotaExtra));
    setQuotaModalOpen(true);
  };
  const submitQuota = () => {
    const nextExtra = Number(quotaInput);
    if (!Number.isInteger(nextExtra) || nextExtra < 0) {
      toast.error('Extra quota must be a whole number zero or greater');
      return;
    }
    updateQuotaMutation.mutate(nextExtra);
  };
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

        <section className="relative overflow-hidden bg-white p-6" style={{ border: '1px solid var(--border)' }}>
          <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: 'var(--blue)' }} />
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-2xl font-black shadow-sm" style={{ background: 'var(--bg-subtle)', color: 'var(--blue)' }}>
                {detail.merchant.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.merchant.logo_url} alt={detail.merchant.shop_name} className="h-full w-full rounded-lg object-cover" />
                ) : initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--navy)' }}>{detail.merchant.shop_name}</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase" style={{ background: detail.merchant.is_active ? '#DCFCE7' : '#FEE2E2', color: detail.merchant.is_active ? '#047857' : '#DC2626' }}>
                    <ShieldCheck className="h-3 w-3" />
                    {detail.merchant.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-2 py-1 font-mono text-[10px] uppercase tracking-widest" style={{ background: 'var(--bg-subtle)', color: 'var(--blue)' }}>
                    ID: {detail.merchant.id?.slice(0, 8)}
                  </span>
                </div>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {planName} - Registered {formatShortDate(detail.merchant.created_at)} - Strict duplicate checks always on
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--blue)' }}
                type="button"
                onClick={openQuotaModal}
              >
                <Settings className="h-4 w-4" />
                Adjust Quota
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 border-t pt-5 sm:grid-cols-2 xl:grid-cols-4" style={{ borderColor: 'var(--border)' }}>
            {[
              { icon: Mail, label: 'Primary Contact', value: detail.merchant.contact_email || 'No email' },
              { icon: Phone, label: 'Phone Number', value: detail.merchant.contact_phone || 'No phone' },
              { icon: MapPin, label: 'Address', value: detail.merchant.address || 'No address' },
              { icon: Bot, label: 'LINE Webhook', value: detail.line_connected ? `Connected${detail.line_webhook?.webhook_reference_id ? ` (${detail.line_webhook.webhook_reference_id})` : ''}` : 'Not configured' },
            ].map((item) => (
              <div key={item.label} className="flex min-w-0 items-center gap-3 p-3" style={{ background: 'var(--bg-subtle)' }}>
                <item.icon className="h-4 w-4 shrink-0" style={{ color: 'var(--blue)' }} />
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--navy)' }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-3">
          <section className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Quota Remaining</p>
                <p className="mt-1 text-2xl font-black" style={{ color: 'var(--navy)' }}>{usage.remaining.toLocaleString()} / {usage.quota.toLocaleString()}</p>
              </div>
              <Activity className="h-6 w-6" style={{ color: quota.text }} />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full" style={{ width: `${remainingPercent}%`, background: quota.bar }} />
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>{usage.this_month.toLocaleString()} scans recorded this month</span>
              <span className="font-bold" style={{ color: quota.text }}>{quota.label}</span>
            </div>
          </section>

          <section className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Billing & Revenue</p>
                <p className="mt-1 text-2xl font-black" style={{ color: 'var(--navy)' }}>{formatMoney(billing.total_revenue)}</p>
              </div>
              <CreditCard className="h-6 w-6" style={{ color: 'var(--blue)' }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2" style={{ background: 'var(--bg-subtle)' }}>
                <p style={{ color: 'var(--text-muted)' }}>Plan</p>
                <p className="font-bold" style={{ color: 'var(--navy)' }}>{planName}</p>
              </div>
              <div className="p-2" style={{ background: 'var(--bg-subtle)' }}>
                <p style={{ color: 'var(--text-muted)' }}>Renews</p>
                <p className="font-bold" style={{ color: 'var(--navy)' }}>{formatShortDate(renewsAt)}</p>
              </div>
            </div>
          </section>

          <section className="bg-white p-5" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Verification Health</p>
                <p className="mt-1 text-2xl font-black" style={{ color: 'var(--navy)' }}>{usage.total_slips.toLocaleString()} slips</p>
              </div>
              <ReceiptText className="h-6 w-6" style={{ color: '#047857' }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="p-2" style={{ background: '#ECFDF5', color: '#047857' }}>
                <p className="font-bold">{usage.verified_slips}</p>
                <p>Verified</p>
              </div>
              <div className="p-2" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                <p className="font-bold">{usage.failed_slips}</p>
                <p>Failed</p>
              </div>
              <div className="p-2" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <p className="font-bold">{usage.duplicate_slips}</p>
                <p>Duplicate</p>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'var(--bg-subtle)', color: 'var(--blue)' }}>
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black" style={{ color: 'var(--navy)' }}>Quota & Subscription</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Real-time slip allocations and plan lifecycle</p>
                </div>
              </div>
              <span className="px-2 py-1 font-mono text-[10px] uppercase tracking-widest" style={{ background: 'var(--bg-subtle)', color: quota.text }}>
                {quota.label}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-[160px_1fr]">
              <div className="flex flex-col items-center justify-center rounded-lg p-4" style={{ background: 'var(--bg-subtle)' }}>
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full" style={{ background: `conic-gradient(${quota.bar} ${remainingPercent * 3.6}deg, #E5E7EB 0deg)` }}>
                  <div className="absolute h-20 w-20 rounded-full bg-white" />
                  <span className="relative text-2xl font-black" style={{ color: 'var(--navy)' }}>{remainingPercent.toFixed(0)}%</span>
                </div>
                <p className="mt-3 text-sm font-bold" style={{ color: 'var(--navy)' }}>{usage.remaining.toLocaleString()} slips remaining</p>
                <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Resets {formatShortDate(usage.next_reset)}</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Verified bank slips', value: `${usage.verified_slips.toLocaleString()} slips`, tone: '#047857' },
                  { label: 'Rejected slips', value: `${usage.failed_slips.toLocaleString()} slips`, tone: '#DC2626' },
                  { label: 'Duplicate rejections', value: `${usage.duplicate_slips.toLocaleString()} slips`, tone: '#D97706' },
                  { label: 'Billing cycle', value: detail.subscription?.billing_cycle || 'free', tone: 'var(--blue)' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    <span className="text-sm font-bold" style={{ color: item.tone }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'var(--bg-subtle)', color: 'var(--blue)' }}>
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black" style={{ color: 'var(--navy)' }}>LINE Webhook Integration</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Inbound OCR pipe and instant customer replies</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase" style={{ background: detail.line_connected ? '#DCFCE7' : '#FEE2E2', color: detail.line_connected ? '#047857' : '#DC2626' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: detail.line_connected ? '#10B981' : '#EF4444' }} />
                {detail.line_connected ? 'Online' : 'Not set'}
              </span>
            </div>

            <div className="rounded-lg p-3" style={{ background: 'var(--bg-subtle)' }}>
              <label className="mb-2 block font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Target webhook endpoint
              </label>
              <div className="flex min-w-0 items-center gap-2">
                <code className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ color: 'var(--navy)' }}>
                  {detail.line_webhook?.webhook_url || (detail.line_webhook?.webhook_reference_id ? `/v1/line/webhook/${detail.line_webhook.webhook_reference_id}` : 'No webhook URL configured')}
                </code>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 px-2 py-1 text-xs font-semibold"
                  style={{ background: '#fff', color: 'var(--blue)', border: '1px solid var(--border)' }}
                  onClick={() => {
                    const value = detail.line_webhook?.webhook_url || (detail.line_webhook?.webhook_reference_id ? `/v1/line/webhook/${detail.line_webhook.webhook_reference_id}` : '');
                    if (value) navigator.clipboard.writeText(value);
                  }}
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="p-3" style={{ background: 'var(--bg-subtle)' }}>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>LINE channel ID</p>
                <p className="mt-1 truncate text-sm font-bold" style={{ color: 'var(--navy)' }}>{detail.line_webhook?.line_channel_id || '-'}</p>
              </div>
              <div className="p-3" style={{ background: 'var(--bg-subtle)' }}>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Configured</p>
                <p className="mt-1 text-sm font-bold" style={{ color: 'var(--navy)' }}>{formatShortDate(detail.line_webhook?.created_at)}</p>
              </div>
              <div className="p-3" style={{ background: 'var(--bg-subtle)' }}>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Auto reply</p>
                <p className="mt-1 text-sm font-bold" style={{ color: detail.line_connected ? '#047857' : '#DC2626' }}>{detail.line_connected ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div className="p-3" style={{ background: 'var(--bg-subtle)' }}>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Last update</p>
                <p className="mt-1 text-sm font-bold" style={{ color: 'var(--navy)' }}>{formatShortDate(detail.line_webhook?.updated_at)}</p>
              </div>
            </div>
          </section>
        </div>

        <AdminMerchantTransactions merchantId={merchantId} />

        {quotaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
            <div className="w-full max-w-md bg-white p-6 shadow-xl" style={{ border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black" style={{ color: 'var(--navy)' }}>Adjust Quota</h2>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    Add extra monthly slips on top of {detail.merchant.shop_name}'s package quota.
                  </p>
                </div>
                <span className="px-2 py-1 font-mono text-[10px] uppercase tracking-widest" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  Total {usage.quota.toLocaleString()}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="p-3" style={{ background: 'var(--bg-subtle)' }}>
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Package</p>
                  <p className="mt-1 font-bold" style={{ color: 'var(--navy)' }}>{packageQuota.toLocaleString()}</p>
                </div>
                <div className="p-3" style={{ background: 'var(--bg-subtle)' }}>
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Extra</p>
                  <p className="mt-1 font-bold" style={{ color: 'var(--navy)' }}>{quotaExtra.toLocaleString()}</p>
                </div>
                <div className="p-3" style={{ background: 'var(--bg-subtle)' }}>
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>New Total</p>
                  <p className="mt-1 font-bold" style={{ color: 'var(--navy)' }}>{(packageQuota + (Number(quotaInput) || 0)).toLocaleString()}</p>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Extra quota
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={quotaInput}
                  onChange={(event) => setQuotaInput(event.target.value)}
                  className="mt-2 h-12 w-full px-3 text-lg font-bold outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
                  autoFocus
                />
              </label>

              <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
                {[0, 1, 50, 100, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="px-3 py-2 font-semibold"
                    style={{ border: '1px solid var(--border)', color: 'var(--navy)', background: quotaInput === String(preset) ? 'var(--bg-subtle)' : '#fff' }}
                    onClick={() => setQuotaInput(String(preset))}
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-semibold"
                  style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
                  onClick={() => setQuotaModalOpen(false)}
                  disabled={updateQuotaMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--blue)' }}
                  onClick={submitQuota}
                  disabled={updateQuotaMutation.isPending}
                >
                  {updateQuotaMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Quota
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

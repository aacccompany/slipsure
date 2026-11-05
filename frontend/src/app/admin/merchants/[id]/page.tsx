'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Clipboard, Loader2, Settings } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminMerchantTransactions } from '@/components/admin/AdminMerchantTransactions';
import { PageSkeleton } from '@/components/ui/Skeleton';

const CARD = { background: 'var(--bg-card)', border: '1px solid var(--border)' } as const;

function formatMoney(value?: number) {
  return `฿${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatShortDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function quotaTone(percent: number) {
  if (percent >= 100) return { text: 'var(--err-ink)', bar: 'var(--err-ink)', label: 'โควต้าเต็ม' };
  if (percent >= 80) return { text: 'var(--warn-ink)', bar: 'var(--warn-ink)', label: 'ใกล้เต็ม' };
  return { text: 'var(--ok-ink)', bar: 'var(--ok-ink)', label: 'ปกติ' };
}

function billingCycleLabel(value?: string) {
  if (!value || value === 'free') return 'ฟรี';
  if (value === 'monthly') return 'รายเดือน';
  if (value === 'yearly') return 'รายปี';
  return value;
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
      <dt className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="min-w-0 truncate text-sm font-semibold tabular-nums" style={{ color: tone || 'var(--ink)' }}>{value}</dd>
    </div>
  );
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
      toast.success('อัปเดตโควต้าเพิ่มเติมแล้ว');
      setQuotaModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-merchant-detail', merchantId] });
      queryClient.invalidateQueries({ queryKey: ['admin-merchant-performance'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'อัปเดตโควต้าไม่สำเร็จ');
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
          <Link href="/admin?tab=merchants" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="h-4 w-4" />
            กลับไปหน้าร้านค้า
          </Link>
          <p className="mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>ไม่พบร้านค้านี้</p>
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
  const planName = detail.subscription?.plan?.name || detail.subscription?.plan_id || 'ยังไม่มีแพ็กเกจ';
  const renewsAt = detail.subscription?.expires_at || detail.usage.next_reset;
  const webhookValue = detail.line_webhook?.webhook_url || (detail.line_webhook?.webhook_reference_id ? `/v1/line/webhook/${detail.line_webhook.webhook_reference_id}` : '');
  const openQuotaModal = () => {
    setQuotaInput(String(quotaExtra));
    setQuotaModalOpen(true);
  };
  const submitQuota = () => {
    const nextExtra = Number(quotaInput);
    if (!Number.isInteger(nextExtra) || nextExtra < 0) {
      toast.error('โควต้าเพิ่มเติมต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป');
      return;
    }
    updateQuotaMutation.mutate(nextExtra);
  };

  return (
    <AdminShell activeTab="merchants">
      <div className="max-w-[80rem] space-y-4 p-6" style={{ background: 'var(--bg)' }}>
        <Link
          href="/admin?tab=merchants"
          className="inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          ร้านค้า
        </Link>

        <section className="rounded-[1.75rem] p-7" style={CARD}>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold" style={{ background: 'var(--bg-subtle)', color: 'var(--blue)' }}>
                {detail.merchant.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.merchant.logo_url} alt={detail.merchant.shop_name} className="h-full w-full rounded-full object-cover" />
                ) : initials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="truncate text-2xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>{detail.merchant.shop_name}</h1>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: detail.merchant.is_active ? 'var(--ok-pale)' : 'var(--err-pale)', color: detail.merchant.is_active ? 'var(--ok-ink)' : 'var(--err-ink)' }}
                  >
                    {detail.merchant.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </div>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {planName} · สมัครเมื่อ {formatShortDate(detail.merchant.created_at)}
                </p>
              </div>
            </div>
            <button
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--blue)' }}
              type="button"
              onClick={openQuotaModal}
            >
              <Settings className="h-4 w-4" />
              ปรับโควต้า
            </button>
          </div>

          <dl className="mt-7 grid gap-x-10 gap-y-5 pt-6 sm:grid-cols-2 xl:grid-cols-4" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              ['อีเมลติดต่อ', detail.merchant.contact_email || 'ไม่ระบุ'],
              ['เบอร์โทร', detail.merchant.contact_phone || 'ไม่ระบุ'],
              ['ที่อยู่', detail.merchant.address || 'ไม่ระบุ'],
              ['LINE', detail.line_connected ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้ตั้งค่า'],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</dt>
                <dd className="mt-1 truncate font-medium" style={{ color: 'var(--ink)' }}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-[1.75rem] p-6" style={CARD}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>โควต้าที่เหลือ</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
              {usage.remaining.toLocaleString()} <span className="text-lg font-normal" style={{ color: 'var(--text-muted)' }}>/ {usage.quota.toLocaleString()} ใบ</span>
            </p>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full" style={{ width: `${remainingPercent}%`, background: quota.bar }} />
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>เดือนนี้ใช้ไป {usage.this_month.toLocaleString()} ใบ</span>
              <span className="font-medium" style={{ color: quota.text }}>{quota.label}</span>
            </div>
          </section>

          <section className="rounded-[1.75rem] p-6" style={CARD}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>รายได้จากร้านนี้</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{formatMoney(billing.total_revenue)}</p>
            <dl className="mt-4">
              <Row label="แพ็กเกจ" value={planName} />
              <Row label="ต่ออายุ" value={formatShortDate(renewsAt)} />
            </dl>
          </section>

          <section className="rounded-[1.75rem] p-6" style={CARD}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>สลิปทั้งหมด</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{usage.total_slips.toLocaleString()} <span className="text-lg font-normal" style={{ color: 'var(--text-muted)' }}>ใบ</span></p>
            <dl className="mt-4">
              <Row label="ตรวจผ่าน" value={usage.verified_slips.toLocaleString()} tone="var(--ok-ink)" />
              <Row label="ตรวจไม่ผ่าน" value={usage.failed_slips.toLocaleString()} tone="var(--err-ink)" />
              <Row label="สลิปซ้ำ" value={usage.duplicate_slips.toLocaleString()} tone="var(--warn-ink)" />
            </dl>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-[1.75rem] p-6" style={CARD}>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>โควต้าและแพ็กเกจ</h2>
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--bg-subtle)', color: quota.text }}>{quota.label}</span>
            </div>
            <dl>
              <Row label="โควต้าต่อเดือน" value={`${usage.quota.toLocaleString()} ใบ`} />
              <Row label="โควต้าจากแพ็กเกจ" value={`${packageQuota.toLocaleString()} ใบ`} />
              <Row label="โควต้าเพิ่มเติม" value={`${quotaExtra.toLocaleString()} ใบ`} />
              <Row label="รอบบิล" value={billingCycleLabel(detail.subscription?.billing_cycle)} />
              <Row label="รีเซ็ตโควต้า" value={formatShortDate(usage.next_reset)} />
            </dl>
          </section>

          <section className="rounded-[1.75rem] p-6" style={CARD}>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>การเชื่อมต่อ LINE</h2>
              <span
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: detail.line_connected ? 'var(--ok-pale)' : 'var(--err-pale)', color: detail.line_connected ? 'var(--ok-ink)' : 'var(--err-ink)' }}
              >
                {detail.line_connected ? 'ออนไลน์' : 'ยังไม่ได้ตั้งค่า'}
              </span>
            </div>
            <div className="mb-3 flex min-w-0 items-center gap-2 rounded-2xl px-4 py-3" style={{ background: 'var(--bg-subtle)' }}>
              <code className="min-w-0 flex-1 truncate text-xs" style={{ color: 'var(--ink)' }}>
                {webhookValue || 'ยังไม่มี Webhook URL'}
              </code>
              <button
                type="button"
                disabled={!webhookValue}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                style={{ background: 'var(--bg-card)', color: 'var(--blue)', border: '1px solid var(--border)' }}
                onClick={() => {
                  if (webhookValue) {
                    navigator.clipboard.writeText(webhookValue);
                    toast.success('คัดลอกแล้ว');
                  }
                }}
              >
                <Clipboard className="h-3.5 w-3.5" />
                คัดลอก
              </button>
            </div>
            <dl>
              <Row label="LINE channel ID" value={detail.line_webhook?.line_channel_id || '-'} />
              <Row label="ตั้งค่าเมื่อ" value={formatShortDate(detail.line_webhook?.created_at)} />
              <Row label="ตอบ LINE อัตโนมัติ" value={detail.line_connected ? 'เปิด' : 'ปิด'} tone={detail.line_connected ? 'var(--ok-ink)' : 'var(--err-ink)'} />
              <Row label="อัปเดตล่าสุด" value={formatShortDate(detail.line_webhook?.updated_at)} />
            </dl>
          </section>
        </div>

        <AdminMerchantTransactions merchantId={merchantId} />

        {quotaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
            <div className="w-full max-w-md rounded-[1.75rem] p-7 shadow-xl" style={CARD}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>ปรับโควต้า</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                เพิ่มจำนวนสลิปต่อเดือนให้ {detail.merchant.shop_name} นอกเหนือจากโควต้าของแพ็กเกจ
              </p>

              <dl className="mt-5">
                <Row label="โควต้าจากแพ็กเกจ" value={packageQuota.toLocaleString()} />
                <Row label="โควต้าเพิ่มเติมตอนนี้" value={quotaExtra.toLocaleString()} />
                <Row label="รวมหลังปรับ" value={(packageQuota + (Number(quotaInput) || 0)).toLocaleString()} tone="var(--blue)" />
              </dl>

              <label className="mt-5 block">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>โควต้าเพิ่มเติม (ใบ)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={quotaInput}
                  onChange={(event) => setQuotaInput(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl px-4 text-lg font-semibold outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--bg-card)' }}
                  autoFocus
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                {[0, 50, 100, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="rounded-full px-4 py-1.5 text-sm font-medium"
                    style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: quotaInput === String(preset) ? 'var(--bg-subtle)' : 'var(--bg-card)' }}
                    onClick={() => setQuotaInput(String(preset))}
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="mt-7 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-full px-5 py-2.5 text-sm font-medium"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                  onClick={() => setQuotaModalOpen(false)}
                  disabled={updateQuotaMutation.isPending}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--blue)' }}
                  onClick={submitQuota}
                  disabled={updateQuotaMutation.isPending}
                >
                  {updateQuotaMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

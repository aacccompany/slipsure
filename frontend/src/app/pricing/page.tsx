'use client';

import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, tokenManager } from '@/lib/api-client';
import { FreePlanConfirmModal } from '@/components/subscription/FreePlanConfirmModal';

const featureLabels: Record<string, string> = {
  slip_verify:          'ตรวจสอบสลิป',
  line_notify:          'แจ้งเตือนผ่าน LINE',
  csv_export:           'ส่งออกข้อมูล CSV',
  analytics:            'ดูสถิติการใช้งาน',
  priority_support:     'ซัพพอร์ตด่วน',
  higher_quota:         'โควต้าสูงขึ้น',
  api_access:           'เข้าถึงผ่าน API',
  webhook:              'Webhook แจ้งเตือน',
  bank_validation:      'ยืนยันผ่าน Bank API',
  historical_data:      'ประวัติข้อมูลย้อนหลัง',
  duplicate_detection:  'ตรวจจับสลิปซ้ำ',
  custom_branding:      'ปรับแต่งแบรนด์',
};

export default function PricingPage() {
  const queryClient = useQueryClient();
  const [freeConfirmOpen, setFreeConfirmOpen] = useState(false);
  const [slipsPerMonth, setSlipsPerMonth] = useState(300);

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.getPlans(),
  });

  const isAuthenticated = tokenManager.isAuthenticated();
  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
    enabled: isAuthenticated,
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: { plan_id: string; billing_cycle: 'monthly' }) => api.createCheckout(data),
    onSuccess: (response) => {
      setFreeConfirmOpen(false);
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.success(response.message || 'อัพเกรดแผนสำเร็จ');
        window.location.href = '/dashboard';
      }
    },
    onError: (error) => {
      setFreeConfirmOpen(false);
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  const plans = plansData?.data?.plans?.filter((p) => p.is_active) ?? [];
  const freePlanUsed = subscriptionData?.data?.free_plan_used ?? false;
  const currentPlanId = subscriptionData?.data?.subscription?.plan_id;
  const visiblePlans = plans.filter((plan) => !(plan.id === 'plan-free' && freePlanUsed));
  const freePlan = visiblePlans.find((p) => p.id === 'plan-free');
  const paidPlans = visiblePlans.filter((p) => p.id !== 'plan-free');

  // Slider range follows the biggest plan; the recommended plan is the smallest one that fits.
  const maxQuota = useMemo(
    () => Math.max(1000, ...visiblePlans.map((p) => p.quota_per_month)),
    [visiblePlans],
  );
  const recommendedId = useMemo(() => {
    const fits = [...visiblePlans]
      .sort((a, b) => a.quota_per_month - b.quota_per_month)
      .find((p) => p.quota_per_month >= slipsPerMonth);
    return fits?.id;
  }, [visiblePlans, slipsPerMonth]);
  const recommendedPlan = visiblePlans.find((p) => p.id === recommendedId);
  const exceedsAll = visiblePlans.length > 0 && !recommendedPlan;

  const handlePlanClick = (planId: string) => {
    if (!isAuthenticated) { window.location.href = '/register'; return; }
    if (planId === 'plan-free' && freePlanUsed) { return; }
    if (planId === 'plan-free') { setFreeConfirmOpen(true); return; }
    checkoutMutation.mutate({ plan_id: planId, billing_cycle: 'monthly' });
  };

  const activateFreePlan = () => {
    setFreeConfirmOpen(false);
    checkoutMutation.mutate({ plan_id: 'plan-free', billing_cycle: 'monthly' });
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-10 pt-32 md:px-8" style={{ background: 'var(--bg)' }}>
      <div aria-hidden className="pointer-events-none absolute -left-32 top-10 h-[24rem] w-[24rem] rounded-full" style={{ background: 'var(--cyan-pale)' }} />
      <div aria-hidden className="pointer-events-none absolute -right-40 top-72 h-[28rem] w-[28rem] rounded-full" style={{ background: 'var(--blue-pale)', opacity: 0.7 }} />

      <FreePlanConfirmModal
        open={freeConfirmOpen}
        isLoading={checkoutMutation.isPending}
        onCancel={() => setFreeConfirmOpen(false)}
        onConfirm={activateFreePlan}
      />

      <div className="relative mx-auto max-w-5xl">
        {/* หัวข้อ */}
        <div className="pop-in mx-auto mb-12 max-w-3xl text-center">
          <span
            className="mb-6 inline-block rounded-full bg-white px-5 py-2 text-sm font-bold"
            style={{ color: 'var(--blue)', boxShadow: '0 0 0 1px rgba(0,24,71,0.08)' }}
          >
            แผนราคา
          </span>
          <h1 className="font-display text-5xl font-extrabold leading-[1.2] md:text-7xl" style={{ color: 'var(--navy)' }}>
            เลือกแผนที่เหมาะกับ
            <br />
            <span className="relative inline-block" style={{ color: 'var(--blue)' }}>
              ปริมาณสลิปของคุณ
              <svg aria-hidden viewBox="0 0 400 24" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-3.5 w-full md:h-5">
                <path d="M4 16 C 60 4, 110 22, 170 12 S 290 4, 396 14" fill="none" stroke="var(--cyan)" strokeWidth="7" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-muted)' }}>
            เริ่มต้นฟรี 20 สลิปต่อเดือน แล้วอัพเกรดเมื่อต้องการโควต้าสูงขึ้น ไม่ต้องผูกบัตรเครดิต ยกเลิกได้ทุกเมื่อ
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--blue)' }} />
          </div>
        ) : (
          <>
            {/* ตัวช่วยเลือกแผน */}
            {visiblePlans.length > 0 && (
              <div
                className="pop-in mx-auto mb-12 max-w-3xl rounded-[2.25rem] bg-white p-7 md:p-9"
                style={{ boxShadow: '0 24px 40px -28px rgba(0,24,71,0.3), 0 0 0 1px rgba(0,24,71,0.07)', animationDelay: '0.1s' }}
              >
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="mb-1 text-sm font-bold" style={{ color: 'var(--blue)' }}>
                      ตัวช่วยเลือกแผน
                    </p>
                    <p className="text-lg font-extrabold md:text-xl" style={{ color: 'var(--navy)' }}>
                      ร้านคุณได้รับสลิปประมาณเดือนละกี่ใบ?
                    </p>
                  </div>
                  <p className="font-display text-4xl font-extrabold leading-none md:text-5xl" style={{ color: 'var(--navy)' }}>
                    {slipsPerMonth.toLocaleString()}
                    <span className="ml-1.5 text-base font-bold" style={{ color: 'var(--text-muted)' }}>
                      สลิป
                    </span>
                  </p>
                </div>

                <input
                  type="range"
                  min={10}
                  max={maxQuota}
                  step={10}
                  value={slipsPerMonth}
                  onChange={(e) => setSlipsPerMonth(Number(e.target.value))}
                  aria-label="จำนวนสลิปต่อเดือน"
                  className="h-3 w-full cursor-pointer appearance-none rounded-full accent-[var(--blue)]"
                  style={{ background: 'var(--blue-pale)' }}
                />

                <div
                  className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] px-5 py-4"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  <p className="flex items-center gap-2 text-sm font-semibold md:text-base" style={{ color: 'var(--navy)' }}>
                    <Sparkles className="h-4 w-4 shrink-0" style={{ color: 'var(--blue)' }} />
                    {exceedsAll
                      ? 'มากกว่าทุกแผน ติดต่อเราเพื่อขอแผน Enterprise'
                      : recommendedPlan
                        ? <>แนะนำแผน <b>{recommendedPlan.name === 'Free' ? 'ฟรี' : recommendedPlan.name}</b> ({recommendedPlan.quota_per_month.toLocaleString()} สลิป/เดือน)</>
                        : 'เลือกจำนวนสลิปเพื่อดูแผนที่เหมาะสม'}
                  </p>
                  {recommendedPlan && (
                    <span className="font-display text-lg font-extrabold" style={{ color: 'var(--blue)' }}>
                      {recommendedPlan.price_monthly === 0 ? 'ฟรี' : `฿${recommendedPlan.price_monthly.toLocaleString()}/เดือน`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* แผนฟรี */}
            {freePlan && (() => {
              const isCurrent = freePlan.id === currentPlanId;
              const isFreeUnavailable = freePlanUsed && !isCurrent;
              const isRec = recommendedId === freePlan.id;
              return (
                <div
                  className="pop-in mb-6 flex flex-col items-start justify-between gap-6 rounded-[2.25rem] p-7 transition-shadow md:flex-row md:items-center md:p-9"
                  style={{
                    background: 'var(--blue-pale)',
                    boxShadow: isRec ? '0 0 0 4px var(--cyan)' : undefined,
                    animationDelay: '0.15s',
                  }}
                >
                  <div>
                    <p className="mb-1 text-sm font-bold" style={{ color: 'var(--blue)' }}>
                      {isRec ? 'ฟรี · เหมาะกับคุณ' : 'ฟรี'}
                    </p>
                    <p className="font-display text-3xl font-extrabold md:text-4xl" style={{ color: 'var(--navy)' }}>
                      {freePlan.quota_per_month.toLocaleString()} สลิป/เดือน
                    </p>
                    <p className="mt-1 text-sm md:text-base" style={{ color: 'var(--text-muted)' }}>
                      {freePlan.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handlePlanClick(freePlan.id)}
                    disabled={checkoutMutation.isPending || isCurrent || isFreeUnavailable}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                    style={{ background: isCurrent || isFreeUnavailable ? 'var(--border-strong)' : 'var(--navy)' }}
                  >
                    {checkoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      'Current Plan'
                    ) : isFreeUnavailable ? (
                      'Used Already'
                    ) : (
                      <>เริ่มใช้งานฟรี <ArrowUpRight className="h-4 w-4" /></>
                    )}
                  </button>
                </div>
              );
            })()}

            {/* แผนเสียเงิน */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paidPlans.map((plan, i) => {
                const price = plan.price_monthly;
                const isPopular = plan.is_popular;
                const isCurrent = plan.id === currentPlanId;
                const isRec = recommendedId === plan.id;

                return (
                  <div
                    key={plan.id}
                    className="pop-in relative flex flex-col rounded-[2.25rem] transition-all duration-300 hover:-translate-y-1.5"
                    style={{
                      background: isPopular ? 'var(--navy)' : '#fff',
                      boxShadow: isRec
                        ? '0 0 0 4px var(--cyan), 0 24px 40px -24px rgba(0,24,71,0.4)'
                        : isPopular
                          ? '0 28px 44px -24px rgba(0,24,71,0.55)'
                          : '0 20px 36px -28px rgba(0,24,71,0.3), 0 0 0 1px rgba(0,24,71,0.07)',
                      animationDelay: `${0.2 + i * 0.05}s`,
                    }}
                  >
                    {isPopular && (
                      <div
                        className="absolute -top-3.5 left-8 rounded-full px-4 py-1.5 text-xs font-extrabold"
                        style={{ background: 'var(--cyan)', color: 'var(--navy)' }}
                      >
                        ★ แนะนำ
                      </div>
                    )}
                    {isRec && (
                      <div
                        className="absolute -top-3.5 right-8 rounded-full px-4 py-1.5 text-xs font-extrabold"
                        style={{ background: 'var(--blue)', color: '#fff' }}
                      >
                        เหมาะกับคุณ
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-8">
                      {/* ชื่อแผน */}
                      <div className="mb-6">
                        <p className="mb-1 text-sm font-bold" style={{ color: isPopular ? 'var(--cyan)' : 'var(--blue)' }}>
                          {plan.name}
                        </p>
                        <p className="text-sm" style={{ color: isPopular ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}>
                          {plan.description}
                        </p>
                      </div>

                      {/* ราคา */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="font-display text-5xl font-extrabold leading-none"
                            style={{ color: isPopular ? '#fff' : 'var(--navy)' }}
                          >
                            ฿{price.toLocaleString()}
                          </span>
                          <span className="text-sm font-medium" style={{ color: isPopular ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)' }}>
                            /เดือน
                          </span>
                        </div>
                        <span
                          className="mt-4 inline-block rounded-full px-3.5 py-1.5 text-sm font-bold"
                          style={{
                            background: isPopular ? 'rgba(255,255,255,0.1)' : 'var(--blue-pale)',
                            color: isPopular ? 'var(--cyan)' : 'var(--blue)',
                          }}
                        >
                          {plan.quota_per_month.toLocaleString()} สลิป/เดือน
                        </span>
                      </div>

                      {/* ฟีเจอร์ */}
                      <div className="mb-8 flex-1 space-y-3">
                        {plan.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-3">
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                              style={{ background: isPopular ? 'var(--cyan)' : 'var(--blue-pale)', color: isPopular ? 'var(--navy)' : 'var(--blue)' }}
                            >
                              <Check className="h-3 w-3" strokeWidth={3.5} />
                            </span>
                            <span className="text-sm" style={{ color: isPopular ? 'rgba(255,255,255,0.8)' : 'var(--text)' }}>
                              {featureLabels[feature] ?? feature}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* ปุ่ม */}
                      <button
                        onClick={() => handlePlanClick(plan.id)}
                        disabled={checkoutMutation.isPending || isCurrent}
                        className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-bold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                        style={{
                          background: isCurrent ? 'var(--border-strong)' : isPopular ? 'var(--cyan)' : 'var(--navy)',
                          color: isPopular && !isCurrent ? 'var(--navy)' : '#fff',
                        }}
                      >
                        {checkoutMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isCurrent ? (
                          'Current Plan'
                        ) : (
                          <>เลือกแผนนี้ <ArrowUpRight className="h-4 w-4" /></>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="mt-14 text-center text-sm md:text-base" style={{ color: 'var(--text-muted)' }}>
          มีบัญชีอยู่แล้ว?{' '}
          <Link
            href="/login"
            className="font-bold underline decoration-[var(--cyan)] decoration-2 underline-offset-4 transition-colors hover:text-[var(--blue)]"
            style={{ color: 'var(--navy)' }}
          >
            เข้าสู่ระบบเพื่อจัดการบิล
          </Link>
        </p>
      </div>
    </div>
  );
}

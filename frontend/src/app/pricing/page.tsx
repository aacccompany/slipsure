'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, tokenManager } from '@/lib/api-client';
import type { BillingCycle } from '@/types/api';

const featureLabels: Record<string, string> = {
  slip_verify:          'ตรวจสอบสลิป',
  line_notify:          'แจ้งเตือนผ่าน LINE',
  csv_export:           'ส่งออกข้อมูล CSV',
  analytics:            'ดูสถิติการใช้งาน',
  priority_support:     'ซัพพอร์ตด่วน',
  api_access:           'เข้าถึงผ่าน API',
  webhook:              'Webhook แจ้งเตือน',
  bank_validation:      'ยืนยันผ่าน Bank API',
  historical_data:      'ประวัติข้อมูลย้อนหลัง',
  duplicate_detection:  'ตรวจจับสลิปซ้ำ',
  custom_branding:      'ปรับแต่งแบรนด์',
};

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.getPlans(),
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: { plan_id: string; billing_cycle: BillingCycle }) => api.createCheckout(data),
    onSuccess: (response) => {
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.success(response.message || 'อัพเกรดแผนสำเร็จ');
        window.location.href = '/dashboard';
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    },
  });

  const plans = plansData?.data?.plans?.filter((p) => p.is_active) ?? [];

  const handlePlanClick = (planId: string, price: number) => {
    if (!tokenManager.isAuthenticated()) { window.location.href = '/register'; return; }
    if (price === 0) { window.location.href = '/dashboard'; return; }
    checkoutMutation.mutate({ plan_id: planId, billing_cycle: billingCycle });
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-6" style={{ background: 'var(--bg)' }}>
      <div className="thai-pattern absolute inset-0 pointer-events-none top-0" />

      <div className="relative max-w-7xl mx-auto">

        {/* หัวข้อ */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="inline-block w-2.5 h-2.5 rotate-45" style={{ background: 'var(--blue)' }} />
            <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              แผนราคา
            </span>
            <span className="inline-block w-2.5 h-2.5 rotate-45" style={{ background: 'var(--blue)' }} />
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-semibold mb-5 leading-tight" style={{ color: 'var(--navy)' }}>
            เลือกแผนที่เหมาะกับ<br />
            <em style={{ color: 'var(--blue)', fontWeight: '800' }}>ปริมาณสลิปของคุณ</em>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            เริ่มต้นฟรี 50 สลิปต่อเดือน แล้วอัพเกรดเมื่อต้องการโควต้าสูงขึ้น
            ไม่ต้องผูกบัตรเครดิต ยกเลิกได้ทุกเมื่อ
          </p>
        </div>

        {/* สลับรายเดือน/รายปี */}
        <div className="flex justify-center mb-12">
          <div className="flex p-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            {(['monthly', 'yearly'] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className="px-6 py-2.5 text-sm font-semibold transition-all"
                style={{
                  background: billingCycle === cycle ? 'var(--navy)' : 'transparent',
                  color: billingCycle === cycle ? '#fff' : 'var(--text-muted)',
                }}
              >
                {cycle === 'monthly' ? 'รายเดือน' : 'รายปี'}
                {cycle === 'yearly' && (
                  <span
                    className="ml-2 font-mono text-[9px] px-1.5 py-0.5"
                    style={{ background: 'var(--blue)', color: '#fff' }}
                  >
                    ประหยัด 17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* แผน */}
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--blue)' }} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan) => {
              const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
              const isPopular = plan.is_popular;

              return (
                <div
                  key={plan.id}
                  className="relative flex flex-col transition-all duration-300"
                  style={{
                    background: isPopular ? 'var(--navy)' : '#fff',
                    border: isPopular ? `2px solid var(--blue)` : '1px solid var(--border)',
                    transform: isPopular ? 'translateY(-8px)' : 'none',
                  }}
                >
                  {isPopular && (
                    <div
                      className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 font-mono text-[10px] uppercase tracking-widest"
                      style={{ background: 'var(--blue)', color: '#fff' }}
                    >
                      แนะนำ
                    </div>
                  )}

                  <div className="p-8 flex-1 flex flex-col">
                    {/* ชื่อแผน */}
                    <div className="mb-6">
                      <p
                        className="font-mono text-[10px] uppercase tracking-widest mb-1"
                        style={{ color: 'var(--blue)' }}
                      >
                        {plan.name === 'Free' ? 'ฟรี' : plan.name}
                      </p>
                      <p className="text-sm" style={{ color: isPopular ? 'rgba(248,250,252,0.55)' : 'var(--text-muted)' }}>
                        {plan.description}
                      </p>
                    </div>

                    {/* ราคา */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span
                          className="font-display text-5xl font-semibold"
                          style={{ color: isPopular ? 'var(--cyan)' : 'var(--navy)' }}
                        >
                          {price === 0 ? 'ฟรี' : `฿${price.toLocaleString()}`}
                        </span>
                        {price > 0 && (
                          <span className="text-sm" style={{ color: isPopular ? 'rgba(248,250,252,0.4)' : 'var(--text-muted)' }}>
                            /{billingCycle === 'monthly' ? 'เดือน' : 'ปี'}
                          </span>
                        )}
                      </div>
                      <p
                        className="font-mono text-[11px] mt-2"
                        style={{ color: isPopular ? 'rgba(248,250,252,0.5)' : 'var(--text-muted)' }}
                      >
                        {plan.quota_per_month.toLocaleString()} สลิป/เดือน
                      </p>
                    </div>

                    {/* ฟีเจอร์ */}
                    <div className="space-y-3 flex-1 mb-8">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-3">
                          <span style={{ color: 'var(--blue)', fontSize: 14 }}>✓</span>
                          <span
                            className="text-sm"
                            style={{ color: isPopular ? 'rgba(248,250,252,0.7)' : 'var(--text-muted)' }}
                          >
                            {featureLabels[feature] ?? feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* ปุ่ม */}
                    <button
                      onClick={() => handlePlanClick(plan.id, price)}
                      disabled={checkoutMutation.isPending}
                      className="w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 active:scale-95"
                      style={{
                        background: isPopular ? 'var(--blue)' : 'var(--navy)',
                        color: '#fff',
                      }}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>{price === 0 ? 'เริ่มใช้งานฟรี' : 'เลือกแผนนี้'} →</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-sm mt-12" style={{ color: 'var(--text-muted)' }}>
          มีบัญชีอยู่แล้ว?{' '}
          <Link
            href="/login"
            className="font-semibold transition-colors"
            style={{ color: 'var(--navy)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--blue)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--navy)')}
          >
            เข้าสู่ระบบเพื่อจัดการบิล
          </Link>
        </p>

      </div>
    </div>
  );
}

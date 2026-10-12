'use client';

import React, { useState } from 'react';
import { Check, Zap, ArrowRight, CreditCard, Clock, History, Loader2, X } from 'lucide-react';
import { Check, Zap, ArrowRight, CreditCard, Clock, History, Loader2, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const queryClient = useQueryClient();

  const { data: subscriptionData, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
  });

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.getPlans(),
  });

  const { data: quotaData } = useQuery({
    queryKey: ['quota'],
    queryFn: () => api.getQuota(),
  });

  const [isCancelling, setIsCancelling] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: (data: { cancel_immediately: boolean; reason: string }) =>
      api.cancelSubscription(data),
    onSuccess: () => {
      toast.success('Subscription cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel subscription');
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: { plan_id: string; billing_cycle: 'monthly' | 'yearly' }) =>
      api.createCheckout(data),
    onSuccess: (response) => {
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
        return;
      }
      toast.success(response.message || 'Plan updated successfully');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create checkout session');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  const subscription = subscriptionData?.data?.subscription;
  const plans = plansData?.data?.plans || [];
  const planOrder = ['plan-starter', 'plan-pro', 'plan-enterprise'];
  const visiblePlans = plans
    .filter((plan) => plan.id !== 'plan-free')
    .sort((a, b) => {
      const aIndex = planOrder.indexOf(a.id);
      const bIndex = planOrder.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return a.price_monthly - b.price_monthly;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  const quota = quotaData?.data;
  const monthlyPlanCards = visiblePlans
    .map((plan) => ({
      id: `${plan.id}-monthly`,
      plan,
      billingCycle: 'monthly' as const,
      price: plan.price_monthly,
      badge: '1 เดือน',
    }))
    .filter((card) => card.price > 0);
  const yearlyPlanCards = visiblePlans
    .map((plan) => ({
      id: `${plan.id}-yearly`,
      plan,
      billingCycle: 'yearly' as const,
      price: plan.price_yearly,
      badge: '1 ปี',
    }))
    .filter((card) => card.price > 0);
  const planCards = [...monthlyPlanCards, ...yearlyPlanCards];

  const handleUpgrade = (planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    checkoutMutation.mutate({ plan_id: planId, billing_cycle: billingCycle });
  };

  const handleCancel = () => {
    setIsCancelling(false);
    cancelMutation.mutate({
      cancel_immediately: false,
      reason: 'User requested cancellation',
    });
  };

  if (subLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-800" />
      </div>
    );
  }

  const resetDays = quota
    ? Math.ceil((new Date(quota.reset_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const formatTHB = (value: number) => `฿${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatBaht = (value: number) =>
    `${value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;

  return (
    <div className="min-h-full px-6 py-6 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">/ Billing</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-950">Subscription</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Manage your plan, billing cycle, and monthly verification credits.
            </p>
          </div>
          {subscription && (
            <div className="inline-flex h-9 items-center gap-2 self-start rounded-full border border-blue-100 bg-blue-50 px-4 text-xs font-bold uppercase tracking-widest text-blue-900 md:self-auto">
              <Zap className="h-4 w-4" />
              {subscription.status} plan
            </div>
          )}
        </div>

        {quota && (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Monthly Usage</p>
                <Zap className="h-4 w-4 text-zinc-400" />
              </div>
              <p className="text-2xl font-black text-zinc-950">{quota.used} / {quota.quota_limit}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-blue-700"
                  style={{ width: `${Math.min(100, (quota.used / quota.quota_limit) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-zinc-500">{quota.remaining} credits remaining</p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Reset Date</p>
                <Clock className="h-4 w-4 text-zinc-400" />
              </div>
              <p className="text-2xl font-black text-zinc-950">
                {new Date(quota.reset_date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="mt-2 text-sm text-zinc-500">In {resetDays} days</p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</p>
                <CreditCard className="h-4 w-4 text-zinc-400" />
              </div>
              <p className={`text-2xl font-black ${quota.is_blocked ? 'text-rose-600' : 'text-emerald-600'}`}>
                {quota.is_blocked ? 'Blocked' : 'Active'}
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                {quota.is_blocked ? 'Quota exceeded. Upgrade to continue.' : 'Verification is available.'}
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          {planCards.map(({ id, plan, billingCycle, price, badge }) => {
            const isCurrentPlan = plan.id === subscription?.plan_id && subscription?.billing_cycle === billingCycle;
            const isPopular = plan.is_popular && billingCycle === 'monthly';
            const yearlySavings = billingCycle === 'yearly' && plan.price_yearly > 0
              ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
              : 0;
            const beforeVat = price / 1.07;
            const vat = price - beforeVat;
            const billingMonths = billingCycle === 'yearly' ? 12 : 1;
            const slipUnitPrice = price / (plan.quota_per_month * billingMonths);
            const customerFeatures = [
              'เชื่อมต่อไลน์บอท',
              `สลิปคิด ${formatBaht(slipUnitPrice)} ต่อสลิป`,
              `ตรวจสอบได้ ${plan.quota_per_month.toLocaleString('th-TH')} สลิป/เดือน`,
            ];

            return (
              <article
                key={id}
                className={`relative flex flex-col rounded-lg border p-5 ${
                  isPopular
                    ? 'border-blue-700 bg-white shadow-sm'
                    : isCurrentPlan
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-zinc-200 bg-white'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-5 rounded-full bg-sky-500 px-3 py-1 text-[10px] font-bold text-white">
                    แนะนำ
                  </span>
                )}
                <span className="absolute right-4 top-4 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                  {badge}
                </span>

                <div className="pr-24">
                  <h2 className="text-base font-black text-blue-950">{plan.name}</h2>
                  <p className="mt-1 text-xs text-zinc-500">{plan.description}</p>
                </div>

                <div className="mt-7 flex items-end gap-2">
                  <span className="text-4xl font-black tracking-tight text-zinc-950">
                    {plan.quota_per_month.toLocaleString()}
                  </span>
                  <span className="pb-1 text-xs font-bold uppercase text-blue-950">credit</span>
                </div>

                <div className="mt-5 rounded-md border border-sky-100 bg-sky-50 p-4 text-sm">
                  <div className="flex justify-between py-1 text-zinc-600">
                    <span>ราคาก่อน VAT</span>
                    <span className="font-bold text-blue-950">{formatTHB(beforeVat)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-zinc-600">
                    <span>VAT 7%</span>
                    <span className="font-bold text-blue-950">{formatTHB(vat)}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-sky-100 pt-3 font-bold text-zinc-950">
                    <span>ราคารวมทั้งหมด</span>
                    <span>{formatTHB(price)}</span>
                  </div>
                </div>

                <div className="mt-5 flex-1 space-y-3">
                  {customerFeatures.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium text-zinc-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-2">
                  {isCurrentPlan ? (
                    <button className="h-10 w-full cursor-default rounded-md bg-blue-100 text-sm font-bold text-blue-800">
                      Current Plan
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleUpgrade(plan.id, billingCycle)}
                        disabled={checkoutMutation.isPending}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-900 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
                      >
                        {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>ซื้อเลย <ArrowRight className="h-4 w-4" /></>}
                      </button>
                      {billingCycle === 'yearly' && yearlySavings > 0 && (
                        <p className="text-center text-xs font-bold text-emerald-600">
                          ประหยัด {yearlySavings}% จากรายเดือน
                        </p>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {subscription && subscription.status === 'active' && (
          <section className="rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <h2 className="flex items-center gap-2 text-base font-black text-zinc-950">
                <History className="h-4 w-4 text-blue-700" />
                Subscription Details
              </h2>
              <button
                onClick={() => setIsCancelling(true)}
                className="text-sm font-bold text-rose-600 transition-colors hover:text-rose-700"
              >
                Cancel Plan
              </button>
            </div>
            <div className="grid gap-0 md:grid-cols-2">
              {[
                ['Plan', subscription.plan?.name || 'N/A'],
                ['Status', subscription.status],
                ['Billing Cycle', subscription.billing_cycle],
                ['Started At', new Date(subscription.started_at).toLocaleDateString('th-TH')],
                ['Expires At', subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString('th-TH') : 'N/A'],
                ['Auto Renew', subscription.auto_renew ? 'Enabled' : 'Disabled'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 text-sm">
                  <span className="text-zinc-500">{label}</span>
                  <span className="font-bold capitalize text-zinc-950">{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {isCancelling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6">
              <h3 className="text-xl font-black text-zinc-950">Cancel Subscription?</h3>
              <p className="mt-3 text-sm text-zinc-600">
                Your subscription will remain active until the end of your current billing period.
              </p>
              <div className="mt-6 space-y-2">
                <button
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-rose-600 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Cancel Subscription'}
                </button>
                <button
                  onClick={() => setIsCancelling(false)}
                  disabled={cancelMutation.isPending}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-900"
                >
                  <X className="h-4 w-4" />
                  No, Keep My Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

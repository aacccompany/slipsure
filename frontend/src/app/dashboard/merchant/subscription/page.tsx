'use client';

import React, { useState } from 'react';
import { BarChart3, CreditCard, ChevronLeft, Check, Loader2, Store, Building2, Building, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { FreePlanConfirmModal } from '@/components/subscription/FreePlanConfirmModal';
import type { BillingCycle } from '@/types/api';

export default function MerchantSubscriptionPage() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [freeConfirmOpen, setFreeConfirmOpen] = useState(false);

  // Fetch current subscription
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
  });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.getPlans(),
  });

  // Fetch quota info
  const { data: quotaData } = useQuery({
    queryKey: ['quota'],
    queryFn: () => api.getQuota(),
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: { plan_id: string; billing_cycle: BillingCycle }) => api.createCheckout(data),
    onSuccess: (response) => {
      setFreeConfirmOpen(false);
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
        return;
      }
      toast.success(response.message || 'Plan updated successfully');
      setSelectedPlanId(null);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
    },
    onError: (error) => {
      setFreeConfirmOpen(false);
      toast.error(error instanceof Error ? error.message : 'Failed to create checkout session');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  const subscription = subscriptionData?.data?.subscription;
  const freePlanUsed = subscriptionData?.data?.free_plan_used ?? false;
  const plans = plansData?.data?.plans?.filter((plan) => plan.is_active) ?? [];
  const visiblePlans = plans.filter((plan) => !(plan.id === 'plan-free' && freePlanUsed));
  const currentPlan = plans.find((plan) => plan.id === subscription?.plan_id)
    ?? subscription?.plan
    ?? plans.find((plan) => plan.price_monthly === 0);
  const currentPlanId = subscription?.plan_id || currentPlan?.id;
  const quota = quotaData?.data;

  const handleUpgrade = () => {
    if (selectedPlanId === 'plan-free' && freePlanUsed && currentPlanId !== 'plan-free') {
      toast.error('Free plan can only be used once per account.');
      return;
    }
    if (selectedPlanId === 'plan-free') {
      setFreeConfirmOpen(true);
      return;
    }
    if (selectedPlanId && selectedPlanId !== currentPlanId) {
      checkoutMutation.mutate({ plan_id: selectedPlanId, billing_cycle: billingCycle });
    }
  };

  const handleConfirmFreePlan = () => {
    setFreeConfirmOpen(false);
    checkoutMutation.mutate({ plan_id: 'plan-free', billing_cycle: 'monthly' });
  };

  if (isLoading || plansLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl" style={{ background: 'var(--bg)' }}>
      <FreePlanConfirmModal
        open={freeConfirmOpen}
        isLoading={checkoutMutation.isPending}
        onCancel={() => setFreeConfirmOpen(false)}
        onConfirm={handleConfirmFreePlan}
      />

      <div>
        <Link
          href="/dashboard/merchant"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Merchant
        </Link>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
          / Merchant / Subscription
        </p>
        <h1 className="font-bold tracking-tight" style={{ fontSize: '1.4rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
          Subscription
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>จัดการแผนการใช้งานและโควต้า</p>
      </div>

      {/* Current Plan Overview */}
      <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x bg-white" style={{ border: '1px solid var(--border)', borderColor: 'var(--border)' }}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center" style={{ background: '#FEF9C3' }}>
            <CreditCard className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Current Plan</p>
            <p className="text-sm font-bold" style={{ color: 'var(--navy)' }}>{currentPlan?.name || 'Free Plan'}</p>
          </div>
        </div>

        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center" style={{ background: 'var(--blue-pale)' }}>
            <BarChart3 className="w-5 h-5" style={{ color: 'var(--blue)' }} />
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Quota Used</p>
            <p className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
              {quota?.used ?? 0} / {quota?.quota_limit ?? 50}
            </p>
          </div>
        </div>

        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center" style={{ background: '#ECFDF5' }}>
            <CheckCircle className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Remaining</p>
            <p className="text-sm font-bold text-emerald-700">{quota?.remaining ?? 50}</p>
          </div>
        </div>
      </div>

      {/* Usage Progress */}
      <section className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
        <div className="flex justify-between items-center mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Monthly Usage</p>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Resets on {quota?.reset_date ? new Date(quota.reset_date).toLocaleDateString('th-TH') : '—'}
          </span>
        </div>
        <div className="h-1.5 w-full" style={{ background: 'var(--border)' }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${quota && quota.quota_limit > 0 ? Math.min((quota.used / quota.quota_limit) * 100, 100) : 0}%`,
              background: quota?.is_blocked ? '#EF4444' : 'var(--blue)',
            }}
          />
        </div>
        {quota?.is_blocked && (
          <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: '#DC2626' }}>
            <AlertCircle className="w-4 h-4" />
            <span>Quota exhausted. Upgrade to continue verifying slips.</span>
          </div>
        )}
      </section>

      {/* Available Plans */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Available Plans</p>
          <div className="flex" style={{ border: '1px solid var(--border)', background: '#fff' }}>
            {(['monthly', 'yearly'] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className="px-4 py-2 text-sm font-medium capitalize transition-colors"
                style={
                  billingCycle === cycle
                    ? { background: 'var(--navy)', color: '#fff' }
                    : { color: 'var(--text-muted)' }
                }
              >
                {cycle}
              </button>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visiblePlans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isSelected = selectedPlanId === plan.id;
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const isFreeUnavailable = plan.id === 'plan-free' && freePlanUsed && !isCurrent;

            return (
              <div
                key={plan.id}
                className="bg-white p-6 transition-all"
                style={{
                  border: isCurrent ? '2px solid var(--blue)' : isSelected ? '2px solid #F59E0B' : '1px solid var(--border)',
                  background: isCurrent ? 'var(--bg-subtle)' : '#fff',
                  opacity: isFreeUnavailable ? 0.6 : 1,
                }}
              >
                {isCurrent && (
                  <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest mb-3" style={{ color: 'var(--blue)' }}>
                    <Check className="w-3 h-3" />
                    Current Plan
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  {plan.price_monthly === 0 && <Store className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
                  {plan.price_monthly > 0 && plan.quota_per_month <= 500 && <Building className="w-5 h-5" style={{ color: 'var(--blue)' }} />}
                  {plan.quota_per_month > 500 && <Building2 className="w-5 h-5 text-amber-700" />}
                  <h3 className="text-sm font-bold" style={{ color: 'var(--navy)' }}>{plan.name}</h3>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{plan.description}</p>

                <div className="mb-4">
                  <span className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>
                    {price === 0 ? 'Free' : `฿${price.toLocaleString()}`}
                  </span>
                  {price > 0 && <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>}
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{plan.quota_per_month.toLocaleString()} verifications/month</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Check className="w-3 h-3 shrink-0 mt-0.5 text-emerald-600" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 text-sm font-semibold cursor-not-allowed"
                    style={{ background: 'var(--blue-pale)', color: 'var(--blue)' }}
                  >
                    Current Plan
                  </button>
                ) : isFreeUnavailable ? (
                  <button
                    disabled
                    className="w-full py-3 text-sm font-semibold cursor-not-allowed"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                  >
                    Used Already
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedPlanId(plan.id)}
                    className="w-full py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    style={
                      isSelected
                        ? { background: '#D97706', color: '#fff' }
                        : { border: '1px solid var(--border)', color: 'var(--navy)' }
                    }
                  >
                    {isSelected ? 'Selected' : 'Select Plan'}
                    {!isSelected && <ArrowRight className="w-4 h-4" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgrade Action */}
      {selectedPlanId && selectedPlanId !== currentPlanId && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--navy)' }}>
                Continue to checkout
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {plans.find((plan) => plan.id === selectedPlanId)?.name} · {billingCycle} billing
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedPlanId(null)}
                className="px-6 py-3 text-sm font-semibold transition-all hover:opacity-90"
                style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                disabled={checkoutMutation.isPending}
                className="px-8 py-3 text-sm font-semibold flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: '#D97706', color: '#fff' }}
              >
                {checkoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

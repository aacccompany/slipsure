'use client';

import React, { useState } from 'react';
import { Check, Zap, ArrowRight, CreditCard, Clock, History, Loader2, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { FreePlanConfirmModal } from '@/components/subscription/FreePlanConfirmModal';

export default function SubscriptionPage() {
  const queryClient = useQueryClient();

  // Fetch subscription, plans, and quota
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
  const [freeConfirmOpen, setFreeConfirmOpen] = useState(false);

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
      setFreeConfirmOpen(false);
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
        return;
      }
      toast.success(response.message || 'Plan updated successfully');
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
  const plans = plansData?.data?.plans || [];
  const visiblePlans = plans.filter((plan) => !(plan.id === 'plan-free' && freePlanUsed));
  const quota = quotaData?.data;

  const handleUpgrade = (planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    if (planId === 'plan-free' && freePlanUsed && subscription?.plan_id !== 'plan-free') {
      toast.error('Free plan can only be used once per account.');
      return;
    }
    if (planId === 'plan-free') {
      setFreeConfirmOpen(true);
      return;
    }
    checkoutMutation.mutate({ plan_id: planId, billing_cycle: billingCycle });
  };

  const handleConfirmFreePlan = () => {
    setFreeConfirmOpen(false);
    checkoutMutation.mutate({ plan_id: 'plan-free', billing_cycle: 'monthly' });
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
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  const currentPlan = plans.find(p => p.id === subscription?.plan_id);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl" style={{ background: 'var(--bg)' }}>
      <FreePlanConfirmModal
        open={freeConfirmOpen}
        isLoading={checkoutMutation.isPending}
        onCancel={() => setFreeConfirmOpen(false)}
        onConfirm={handleConfirmFreePlan}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>/ Subscription</p>
          <h1 className="font-bold tracking-tight" style={{ fontSize: '1.4rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
            Subscription
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your plan, billing, and credit usage.</p>
        </div>
        {subscription && (
          <div
            className="px-4 py-2 flex items-center gap-2"
            style={
              subscription.status === 'active'
                ? { background: 'var(--blue-pale)', border: '1px solid var(--blue-pale)' }
                : { background: 'var(--bg-subtle)', border: '1px solid var(--border)' }
            }
          >
            <Zap className="w-4 h-4" style={{ color: subscription.status === 'active' ? 'var(--blue)' : 'var(--text-muted)' }} />
            <span
              className="font-mono text-[9px] font-bold uppercase tracking-widest"
              style={{ color: subscription.status === 'active' ? 'var(--navy)' : 'var(--text-muted)' }}
            >
              {subscription.status} Plan
            </span>
          </div>
        )}
      </div>

      {/* Usage Overview */}
      {quota && (
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x bg-white" style={{ border: '1px solid var(--border)', borderColor: 'var(--border)' }}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
                <Zap className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Monthly Usage</p>
                <h3 className="text-lg font-bold" style={{ color: 'var(--navy)' }}>
                  {quota.used} / {quota.quota_limit}
                </h3>
              </div>
            </div>
            <div className="h-1.5 w-full" style={{ background: 'var(--border)' }}>
              <div
                className="h-full transition-all"
                style={{ width: `${quota.quota_limit > 0 ? Math.min((quota.used / quota.quota_limit) * 100, 100) : 0}%`, background: 'var(--blue)' }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{quota.remaining} credits remaining</p>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
                <Clock className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Reset Date</p>
                <h3 className="text-lg font-bold" style={{ color: 'var(--navy)' }}>
                  {quota.reset_date
                    ? new Date(quota.reset_date).toLocaleDateString('th-TH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'}
                </h3>
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {quota.reset_date
                ? `In ${Math.ceil((new Date(quota.reset_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`
                : 'No active plan'}
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
                <CreditCard className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Status</p>
                <h3 className="text-lg font-bold" style={{ color: quota.is_blocked ? '#E11D48' : '#059669' }}>
                  {quota.is_blocked ? 'Blocked' : 'Active'}
                </h3>
              </div>
            </div>
            {quota.is_blocked && (
              <p className="text-xs" style={{ color: '#E11D48' }}>
                Quota exceeded. Upgrade to continue.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Plans Selection */}
      <div className="grid lg:grid-cols-3 gap-6">
        {visiblePlans.map((plan) => {
          const isCurrentPlan = plan.id === subscription?.plan_id;
          const isHighlighted = plan.is_popular && !isCurrentPlan;
          const isFreeUnavailable = plan.id === 'plan-free' && freePlanUsed && !isCurrentPlan;
          const yearlySavings = plan.price_yearly > 0
            ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
            : 0;

          return (
            <div
              key={plan.id}
              className="relative p-8 bg-white flex flex-col"
              style={{
                border: isHighlighted ? '2px solid var(--navy)' : isCurrentPlan ? '2px solid var(--blue)' : '1px solid var(--border)',
                background: isCurrentPlan ? 'var(--bg-subtle)' : '#fff',
              }}
            >
              {isHighlighted && (
                <div
                  className="absolute -top-3 left-6 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-white"
                  style={{ background: 'var(--navy)' }}
                >
                  Most Popular
                </div>
              )}

              {isCurrentPlan && (
                <div
                  className="absolute -top-3 left-6 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-widest"
                  style={{ background: 'var(--blue-pale)', color: 'var(--blue)' }}
                >
                  Current Plan
                </div>
              )}

              <div className="mb-6 mt-2">
                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--navy)' }}>
                  {plan.name}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight" style={{ color: 'var(--navy)' }}>
                  ฿{plan.price_monthly.toLocaleString()}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                  /month
                </span>
              </div>

              <div className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {isCurrentPlan ? (
                <button
                  className="w-full py-3 text-sm font-semibold cursor-default"
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
                <div className="space-y-2">
                  <button
                    onClick={() => handleUpgrade(plan.id, 'monthly')}
                    disabled={checkoutMutation.isPending}
                    className="w-full py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: 'var(--navy)', color: '#fff' }}
                  >
                    {checkoutMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Monthly
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleUpgrade(plan.id, 'yearly')}
                    disabled={checkoutMutation.isPending}
                    className="w-full py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
                  >
                    {plan.price_yearly > 0 ? `Yearly (Save ${yearlySavings}%)` : 'Yearly'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Subscription Details */}
      {subscription && subscription.status === 'active' && (
        <section className="bg-white p-8" style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-6">
            <p className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <History className="w-3.5 h-3.5" />
              Subscription Details
            </p>
            <button
              onClick={() => setIsCancelling(true)}
              className="text-sm font-medium transition-colors"
              style={{ color: '#E11D48' }}
            >
              Cancel Plan
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Plan</span>
                <span className="text-sm font-medium" style={{ color: 'var(--navy)' }}>{subscription.plan?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Status</span>
                <span className="text-sm font-medium capitalize" style={{ color: subscription.status === 'active' ? '#059669' : 'var(--navy)' }}>
                  {subscription.status}
                </span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Billing Cycle</span>
                <span className="text-sm font-medium capitalize" style={{ color: 'var(--navy)' }}>{subscription.billing_cycle}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Started At</span>
                <span className="text-sm font-medium" style={{ color: 'var(--navy)' }}>
                  {new Date(subscription.started_at).toLocaleDateString('th-TH')}
                </span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Expires At</span>
                <span className="text-sm font-medium" style={{ color: 'var(--navy)' }}>
                  {subscription.expires_at
                    ? new Date(subscription.expires_at).toLocaleDateString('th-TH')
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Auto Renew</span>
                <span className="text-sm font-medium" style={{ color: 'var(--navy)' }}>{subscription.auto_renew ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Cancel Confirmation Modal */}
      {isCancelling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white max-w-md w-full p-8" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg" style={{ color: 'var(--navy)' }}>Cancel Subscription?</h3>
              <button onClick={() => setIsCancelling(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Your subscription will remain active until the end of your current billing period.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: '#E11D48', color: '#fff' }}
              >
                {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Cancel Subscription'}
              </button>
              <button
                onClick={() => setIsCancelling(false)}
                disabled={cancelMutation.isPending}
                className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
              >
                <X className="w-4 h-4" />
                No, Keep My Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

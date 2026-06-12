'use client';

import React, { useState } from 'react';
import { Check, Crown, Zap, Shield, ArrowRight, CreditCard, Clock, History, Loader2, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { SubscriptionPlan, Subscription, QuotaStatus } from '@/types/api';

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
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create checkout session');
    },
  });

  const subscription = subscriptionData?.data?.subscription;
  const plans = plansData?.data?.plans || [];
  const quota = quotaData?.data;

  const handleUpgrade = (planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    checkoutMutation.mutate({ plan_id: planId, billing_cycle });
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
        <Loader2 className="w-10 h-10 text-blue-800 animate-spin" />
      </div>
    );
  }

  const currentPlan = plans.find(p => p.id === subscription?.plan_id);

  return (
    <div className="p-8 space-y-10 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Subscription</h1>
          <p className="text-sm font-medium text-zinc-500">Manage your plan, billing, and credit usage.</p>
        </div>
        {subscription && (
          <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${
            subscription.status === 'active'
              ? 'bg-blue-50 border border-blue-50'
              : 'bg-zinc-100 border border-zinc-200'
          }`}>
            <Zap className={`w-4 h-4 ${subscription.status === 'active' ? 'text-blue-800' : 'text-zinc-500'}`} />
            <span className={`text-xs font-bold uppercase tracking-widest ${
              subscription.status === 'active' ? 'text-blue-900' : 'text-zinc-500'
            }`}>
              {subscription.status} Plan
            </span>
          </div>
        )}
      </div>

      {/* Usage Overview */}
      {quota && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white border border-zinc-100 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                <Zap className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Monthly Usage</p>
                <h3 className="text-lg font-bold text-zinc-900">
                  {quota.used} / {quota.quota_limit}
                </h3>
              </div>
            </div>
            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-800 rounded-full transition-all"
                style={{ width: `${(quota.used / quota.quota_limit) * 100}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2">{quota.remaining} credits remaining</p>
          </div>

          <div className="bg-white border border-zinc-100 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                <Clock className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reset Date</p>
                <h3 className="text-lg font-bold text-zinc-900">
                  {new Date(quota.reset_date).toLocaleDateString('th-TH', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
              </div>
            </div>
            <p className="text-xs font-medium text-zinc-500">
              In {Math.ceil((new Date(quota.reset_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
            </p>
          </div>

          <div className="bg-white border border-zinc-100 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                <CreditCard className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</p>
                <h3 className={`text-lg font-bold capitalize ${
                  quota.is_blocked ? 'text-rose-600' : 'text-green-600'
                }`}>
                  {quota.is_blocked ? 'Blocked' : 'Active'}
                </h3>
              </div>
            </div>
            {quota.is_blocked && (
              <p className="text-xs font-medium text-rose-600">
                Quota exceeded. Upgrade to continue.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Plans Selection */}
      <div className="grid lg:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === subscription?.plan_id;
          const isSelectedForHighlight = plan.is_popular && !isCurrentPlan;

          return (
            <div
              key={plan.id}
              className={`
                relative p-10 rounded-[2.5rem] border transition-all duration-300 flex flex-col
                ${isSelectedForHighlight
                  ? 'bg-zinc-900 border-zinc-800 shadow-2xl shadow-blue-500/10 scale-105 z-10'
                  : isCurrentPlan
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-zinc-100 hover:border-blue-50'
                }
              `}
            >
              {plan.is_popular && !isCurrentPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-blue-800 border border-blue-600 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                  Most Popular
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-blue-100 border border-blue-300 rounded-full text-[10px] font-bold text-blue-800 uppercase tracking-widest">
                  Current Plan
                </div>
              )}

              <div className="mb-8">
                <h3 className={`text-xl font-bold mb-2 ${
                  isSelectedForHighlight ? 'text-white' : isCurrentPlan ? 'text-blue-900' : 'text-zinc-900'
                }`}>
                  {plan.name}
                </h3>
                <p className={`text-sm font-medium ${
                  isSelectedForHighlight ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-10 flex items-baseline gap-1">
                <span className={`text-5xl font-black tracking-tighter ${
                  isSelectedForHighlight ? 'text-white' : 'text-zinc-900'
                }`}>
                  ฿{plan.price_monthly.toLocaleString()}
                </span>
                <span className={`text-sm font-bold ${
                  isSelectedForHighlight ? 'text-zinc-500' : 'text-zinc-400'
                }`}>
                  /month
                </span>
              </div>

              <div className="space-y-4 mb-12 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check className={`w-4 h-4 ${
                      isSelectedForHighlight
                        ? 'text-blue-500'
                        : isCurrentPlan
                          ? 'text-blue-800'
                          : 'text-zinc-600'
                    }`} />
                    <span className={`text-sm font-medium ${
                      isSelectedForHighlight ? 'text-zinc-300' : 'text-zinc-600'
                    }`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {isCurrentPlan ? (
                <button className="w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-blue-100 text-blue-800 cursor-default">
                  Current Plan
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => handleUpgrade(plan.id, 'monthly')}
                    disabled={checkoutMutation.isPending}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      isSelectedForHighlight
                        ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                        : 'bg-zinc-900 text-white hover:bg-black'
                    }`}
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
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${
                      isSelectedForHighlight
                        ? 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-400'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-900'
                    }`}
                  >
                    Yearly (Save {Math.round(((plan.price_yearly - plan.price_monthly * 12) / plan.price_yearly) * 100)}%)
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Subscription Details */}
      {subscription && subscription.status === 'active' && (
        <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-3">
              <History className="w-5 h-5 text-blue-700" />
              Subscription Details
            </h3>
            <button
              onClick={() => setIsCancelling(true)}
              className="text-sm font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              Cancel Plan
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-zinc-50">
                <span className="text-sm text-zinc-500">Plan</span>
                <span className="text-sm font-medium text-zinc-900">{subscription.plan?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-50">
                <span className="text-sm text-zinc-500">Status</span>
                <span className={`text-sm font-medium capitalize ${
                  subscription.status === 'active' ? 'text-green-600' : 'text-zinc-900'
                }`}>
                  {subscription.status}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-50">
                <span className="text-sm text-zinc-500">Billing Cycle</span>
                <span className="text-sm font-medium text-zinc-900 capitalize">{subscription.billing_cycle}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-zinc-50">
                <span className="text-sm text-zinc-500">Started At</span>
                <span className="text-sm font-medium text-zinc-900">
                  {new Date(subscription.started_at).toLocaleDateString('th-TH')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-50">
                <span className="text-sm text-zinc-500">Expires At</span>
                <span className="text-sm font-medium text-zinc-900">
                  {subscription.expires_at
                    ? new Date(subscription.expires_at).toLocaleDateString('th-TH')
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-50">
                <span className="text-sm text-zinc-500">Auto Renew</span>
                <span className="text-sm font-medium text-zinc-900">{subscription.auto_renew ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {isCancelling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-zinc-900 mb-4">Cancel Subscription?</h3>
            <p className="text-sm text-zinc-600 mb-6">
              Your subscription will remain active until the end of your current billing period.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="w-full py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Cancel Subscription'}
              </button>
              <button
                onClick={() => setIsCancelling(false)}
                disabled={cancelMutation.isPending}
                className="w-full py-3 border border-zinc-200 text-zinc-700 rounded-xl font-medium hover:bg-zinc-50 flex items-center justify-center gap-2"
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

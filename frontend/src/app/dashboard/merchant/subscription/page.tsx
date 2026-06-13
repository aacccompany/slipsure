'use client';

import React, { useState } from 'react';
import { BarChart3, CreditCard, ChevronLeft, Check, Loader2, Store, Building2, Building, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { BillingCycle } from '@/types/api';

export default function MerchantSubscriptionPage() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

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
      toast.error(error instanceof Error ? error.message : 'Failed to create checkout session');
    },
  });

  const subscription = subscriptionData?.data?.subscription;
  const plans = plansData?.data?.plans?.filter((plan) => plan.is_active) ?? [];
  const currentPlan = plans.find((plan) => plan.id === subscription?.plan_id)
    ?? subscription?.plan
    ?? plans.find((plan) => plan.price_monthly === 0);
  const currentPlanId = subscription?.plan_id || currentPlan?.id;
  const quota = quotaData?.data;

  const handleUpgrade = () => {
    if (selectedPlanId && selectedPlanId !== currentPlanId) {
      checkoutMutation.mutate({ plan_id: selectedPlanId, billing_cycle: billingCycle });
    }
  };

  if (isLoading || plansLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-800 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div className="mb-8">
        <Link
          href="/dashboard/merchant"
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Merchant
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Subscription</h1>
        <p className="text-sm font-medium text-zinc-500">จัดการแผนการใช้งานและโควต้า</p>
      </div>

      {/* Current Plan Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Current Plan</p>
              <p className="text-sm font-bold text-zinc-900">{currentPlan?.name || 'Free Plan'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Quota Used</p>
              <p className="text-sm font-bold text-zinc-900">
                {quota?.used || 0} / {quota?.quota_limit || 50}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Remaining</p>
              <p className="text-sm font-bold text-green-700">{quota?.remaining || 50}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Progress */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-zinc-900">Monthly Usage</h3>
          <span className="text-xs text-zinc-500">
            Resets on {quota?.reset_date ? new Date(quota.reset_date).toLocaleDateString('th-TH') : '—'}
          </span>
        </div>
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-800 transition-all"
            style={{
              width: `${quota ? Math.min((quota.used / quota.quota_limit) * 100, 100) : 0}%`
            }}
          />
        </div>
        {quota?.is_blocked && (
          <div className="mt-4 flex items-center gap-2 text-sm text-rose-600">
            <AlertCircle className="w-4 h-4" />
            <span>Quota exhausted. Upgrade to continue verifying slips.</span>
          </div>
        )}
      </div>

      {/* Available Plans */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-zinc-900">Available Plans</h2>
          <div className="flex rounded-xl border border-zinc-200 bg-white p-1">
            {(['monthly', 'yearly'] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                  billingCycle === cycle ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {cycle}
              </button>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isSelected = selectedPlanId === plan.id;
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;

            return (
              <div
                key={plan.id}
                className={`bg-white border-2 rounded-2xl p-6 transition-all ${
                  isCurrent
                    ? 'border-blue-800 bg-blue-50'
                    : isSelected
                      ? 'border-amber-400'
                      : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {isCurrent && (
                  <div className="flex items-center gap-1 text-xs font-bold text-blue-800 mb-3">
                    <Check className="w-3 h-3" />
                    Current Plan
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  {plan.price_monthly === 0 && <Store className="w-6 h-6 text-zinc-700" />}
                  {plan.price_monthly > 0 && plan.quota_per_month <= 500 && <Building className="w-6 h-6 text-blue-700" />}
                  {plan.quota_per_month > 500 && <Building2 className="w-6 h-6 text-amber-700" />}
                  <h3 className="text-sm font-bold text-zinc-900">{plan.name}</h3>
                </div>
                <p className="text-xs text-zinc-500 mb-4">{plan.description}</p>

                <div className="mb-4">
                  <span className="text-2xl font-black text-zinc-900">
                    {price === 0 ? 'Free' : `฿${price.toLocaleString()}`}
                  </span>
                  {price > 0 && <span className="text-sm text-zinc-500 ml-1">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>}
                  <p className="text-xs text-zinc-500 mt-1">{plan.quota_per_month.toLocaleString()} verifications/month</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-zinc-600">
                      <Check className="w-3 h-3 text-green-600 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 bg-blue-800 text-white rounded-xl font-medium opacity-50 cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      isSelected
                        ? 'bg-amber-700 text-white'
                        : 'border border-zinc-200 text-zinc-700 hover:border-zinc-900 hover:text-zinc-900'
                    }`}
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-4 shadow-lg">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Continue to checkout
              </p>
              <p className="text-xs text-zinc-500">
                {plans.find((plan) => plan.id === selectedPlanId)?.name} · {billingCycle} billing
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedPlanId(null)}
                className="px-6 py-3 border border-zinc-200 text-zinc-700 rounded-xl font-medium hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                disabled={checkoutMutation.isPending}
                className="px-8 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 flex items-center gap-2 disabled:opacity-50"
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

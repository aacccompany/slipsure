'use client';

import React, { useState } from 'react';
import { Check, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, tokenManager } from '@/lib/api-client';
import type { BillingCycle } from '@/types/api';

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
        toast.success(response.message || 'Plan updated successfully');
        window.location.href = '/dashboard';
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create checkout session');
    },
  });

  const plans = plansData?.data?.plans?.filter((plan) => plan.is_active) ?? [];

  const handlePlanClick = (planId: string, price: number) => {
    if (!tokenManager.isAuthenticated()) {
      window.location.href = '/register';
      return;
    }

    if (price === 0) {
      window.location.href = '/dashboard';
      return;
    }

    checkoutMutation.mutate({ plan_id: planId, billing_cycle: billingCycle });
  };

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tight mb-6">
            Plans that match your slip volume
          </h1>
          <p className="text-zinc-500 font-medium text-lg leading-relaxed">
            Start free, then upgrade when LINE webhook automation and higher monthly quota become useful.
          </p>
        </div>

        <div className="flex justify-center mb-14">
          <div className="flex rounded-2xl border border-zinc-200 bg-white p-1">
            {(['monthly', 'yearly'] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl capitalize transition-colors ${
                  billingCycle === cycle ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {cycle}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => {
              const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
              const highlighted = plan.is_popular;

              return (
                <div
                  key={plan.id}
                  className={`relative p-10 rounded-[2rem] border transition-all duration-300 flex flex-col ${
                    highlighted
                      ? 'bg-zinc-900 border-zinc-800 shadow-2xl shadow-blue-500/20 lg:-translate-y-3'
                      : 'bg-[#fafafa] border-zinc-100 hover:border-blue-100 hover:bg-white'
                  }`}
                >
                  {highlighted && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-800 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Most popular
                    </div>
                  )}

                  <div className="mb-8">
                    <h3 className={`text-xl font-bold mb-2 ${highlighted ? 'text-white' : 'text-zinc-900'}`}>{plan.name}</h3>
                    <p className={`text-sm font-medium ${highlighted ? 'text-zinc-400' : 'text-zinc-500'}`}>{plan.description}</p>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-5xl font-black tracking-tighter ${highlighted ? 'text-white' : 'text-zinc-900'}`}>
                        {price === 0 ? 'Free' : `฿${price.toLocaleString()}`}
                      </span>
                      {price > 0 && (
                        <span className={`text-sm font-bold ${highlighted ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>
                    <p className={`mt-3 text-sm font-medium ${highlighted ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {plan.quota_per_month.toLocaleString()} verifications/month
                    </p>
                  </div>

                  <div className="space-y-4 mb-10 flex-1">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <Check className={`w-4 h-4 ${highlighted ? 'text-blue-500' : 'text-blue-800'}`} />
                        <span className={`text-sm font-medium ${highlighted ? 'text-zinc-300' : 'text-zinc-600'}`}>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePlanClick(plan.id, price)}
                    disabled={checkoutMutation.isPending}
                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60 ${
                      highlighted
                        ? 'bg-blue-800 text-white hover:bg-blue-900 shadow-lg shadow-blue-500/20'
                        : 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    {checkoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : price === 0 ? 'Start free' : 'Choose plan'}
                    {!checkoutMutation.isPending && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-sm text-zinc-500 mt-10">
          Already have an account? <Link href="/login" className="font-medium text-zinc-900 hover:underline">Sign in to manage billing</Link>
        </p>
      </div>
    </div>
  );
}

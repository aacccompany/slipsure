'use client';

import React from 'react';
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Settings,
  ChevronRight,
  Loader2,
  MessageSquare,
  CreditCard,
  User,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';

export default function MerchantProfilePage() {
  // Fetch merchant profile
  const { data: merchantData, isLoading: merchantLoading } = useQuery({
    queryKey: ['merchant-profile'],
    queryFn: () => api.getMerchantProfile(),
  });

  // Fetch subscription for overview
  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
  });

  // Fetch quota for overview
  const { data: quotaData } = useQuery({
    queryKey: ['quota'],
    queryFn: () => api.getQuota(),
  });

  // Fetch LINE webhook config for status
  const { data: lineConfigData } = useQuery({
    queryKey: ['line-webhook-config'],
    queryFn: () => api.getLINEWebhookConfig(),
  });

  const profile = merchantData?.data?.profile;
  const subscription = subscriptionData?.data?.subscription;
  const quota = quotaData?.data;
  const lineConfig = lineConfigData?.data?.config;

  if (merchantLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-800 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Merchant</h1>
        <p className="text-sm font-medium text-zinc-500">จัดการข้อมูลร้านค้าและการตั้งค่าต่างๆ</p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/merchant/profile"
          className="bg-white border border-zinc-200 rounded-2xl p-6 hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Store className="w-6 h-6 text-blue-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-zinc-900">Shop Profile</h3>
              <p className="text-xs text-zinc-500">ข้อมูลร้าน</p>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-colors">
            จัดการ <ChevronRight className="w-4 h-4" />
          </button>
        </Link>

        <Link
          href="/dashboard/merchant/line"
          className="bg-white border border-zinc-200 rounded-2xl p-6 hover:border-green-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <MessageSquare className="w-6 h-6 text-green-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-zinc-900">LINE Integration</h3>
              <p className="text-xs text-zinc-500">เชื่อมต่อ LINE</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lineConfig?.is_configured ? (
              <div className="flex items-center gap-1 text-xs font-medium text-green-700">
                <CheckCircle className="w-3 h-3" />
                Connected
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs font-medium text-zinc-400">
                <AlertCircle className="w-3 h-3" />
                Not configured
              </div>
            )}
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-800 transition-colors">
            จัดการ <ChevronRight className="w-4 h-4" />
          </button>
        </Link>

        <Link
          href="/dashboard/merchant/subscription"
          className="bg-white border border-zinc-200 rounded-2xl p-6 hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <CreditCard className="w-6 h-6 text-amber-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-zinc-900">Subscription</h3>
              <p className="text-xs text-zinc-500">แผนการใช้งาน</p>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-xl text-sm font-medium hover:bg-amber-800 transition-colors">
            จัดการ <ChevronRight className="w-4 h-4" />
          </button>
        </Link>

        <Link
          href="/dashboard/account"
          className="bg-white border border-zinc-200 rounded-2xl p-6 hover:border-purple-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <User className="w-6 h-6 text-purple-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-zinc-900">Account Settings</h3>
              <p className="text-xs text-zinc-500">ตั้งค่าบัญชี</p>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-700 text-white rounded-xl text-sm font-medium hover:bg-purple-800 transition-colors">
            จัดการ <ChevronRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Shop Info Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Shop Name</p>
              <h3 className="text-lg font-bold text-zinc-900">{profile?.shop_name || 'Not set'}</h3>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-zinc-600">
              <MapPin className="w-4 h-4" />
              {profile?.address || 'No address'}
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <Phone className="w-4 h-4" />
              {profile?.contact_phone || 'No phone'}
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <Mail className="w-4 h-4" />
              {profile?.contact_email || 'No email'}
            </div>
          </div>
          <Link
            href="/dashboard/merchant/profile"
            className="mt-4 block w-full py-2 text-center text-sm font-medium text-blue-800 hover:text-blue-900 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Edit Shop Info
          </Link>
        </div>

        {/* Subscription Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Current Plan</p>
              <h3 className="text-lg font-bold text-zinc-900">{subscription?.plan?.name || 'Free Plan'}</h3>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Status</span>
              <span className={`text-sm font-medium ${
                subscription?.status === 'active' ? 'text-green-700' : 'text-zinc-900'
              }`}>
                {subscription?.status || 'trial'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Quota Used</span>
              <span className="text-sm font-medium text-zinc-900">
                {quota?.used || 0} / {quota?.quota_limit || 50}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Remaining</span>
              <span className="text-sm font-medium text-blue-700">{quota?.remaining || 50}</span>
            </div>
          </div>
          <Link
            href="/dashboard/merchant/subscription"
            className="mt-4 block w-full py-2 text-center text-sm font-medium text-amber-800 hover:text-amber-900 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors"
          >
            Manage Subscription
          </Link>
        </div>

        {/* LINE Status Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">LINE Status</p>
              <h3 className="text-lg font-bold text-zinc-900">
                {lineConfig?.is_configured ? 'Connected' : 'Not Connected'}
              </h3>
            </div>
          </div>
          <div className="space-y-3">
            {lineConfig?.is_configured ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600">Reference ID</span>
                  <span className="text-sm font-mono text-blue-800">{lineConfig?.webhook_reference_id || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600">Configured</span>
                  <span className="text-sm text-zinc-900">
                    {lineConfig?.updated_at ? new Date(lineConfig.updated_at).toLocaleDateString('th-TH') : '—'}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-2">
                LINE webhook not configured yet
              </p>
            )}
          </div>
          <Link
            href="/dashboard/merchant/line"
            className="mt-4 block w-full py-2 text-center text-sm font-medium text-green-700 hover:text-green-900 border border-green-200 rounded-xl hover:bg-green-50 transition-colors"
          >
            {lineConfig?.is_configured ? 'Configure LINE' : 'Setup LINE Integration'}
          </Link>
        </div>
      </div>

      {/* Quick Settings */}
      <div className="max-w-2xl">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-700" />
            Quick Settings
          </h3>
          <div className="space-y-3">
            <Link
              href="/dashboard/merchant/profile"
              className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Store className="w-4 h-4 text-blue-700" />
                </span>
                <span className="text-sm font-medium text-zinc-900">Edit Shop Profile</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
            </Link>

            <Link
              href="/dashboard/merchant/line"
              className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-green-700" />
                </span>
                <span className="text-sm font-medium text-zinc-900">LINE Webhook Setup</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
            </Link>

            <Link
              href="/dashboard/merchant/subscription"
              className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-amber-700" />
                </span>
                <span className="text-sm font-medium text-zinc-900">Manage Subscription</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
            </Link>

            <Link
              href="/dashboard/account"
              className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-purple-700" />
                </span>
                <span className="text-sm font-medium text-zinc-900">Account Settings</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

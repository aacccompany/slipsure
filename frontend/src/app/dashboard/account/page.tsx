'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  CreditCard,
  Loader2,
  Crown,
  Save,
  MessageSquare,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AccountPage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingLine, setIsConnectingLine] = useState(false);

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

  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await api.updateProfile(profileData);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectLine = () => {
    const channelId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID;

    if (!channelId || channelId === 'your_line_login_channel_id_here') {
      toast.error('LINE login channel ID is not configured');
      return;
    }

    setIsConnectingLine(true);
    const redirectUri = process.env.NEXT_PUBLIC_LINE_LOGIN_CALLBACK_URL || `${window.location.origin}/auth/line/callback`;
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=connect&scope=profile%20openid%20email`;
  };

  const subscription = subscriptionData?.data?.subscription;
  const quota = quotaData?.data;

  if (!user) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-800 animate-spin" />
      </div>
    );
  }

  const initials = user.name?.split(' ').map(n => n[0]).join('') || 'U';

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Account Settings</h1>
        <p className="text-sm font-medium text-zinc-500">จัดการข้อมูลส่วนตัวและแผนการใช้งานของคุณ</p>
      </div>

      <div className="space-y-8">
        {/* User Profile Section */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-8">
          <h3 className="text-sm font-bold text-zinc-900 mb-6 uppercase tracking-widest flex items-center gap-2">
            <User className="w-4 h-4 text-blue-700" />
            Personal Information
          </h3>

          <div className="flex items-center gap-6 mb-10">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-900 text-2xl font-black border-4 border-white shadow-lg uppercase">
                {initials}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 mb-1">{user.name}</h3>
              <p className="text-sm font-medium text-zinc-500">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {user.email_verified ? (
                  <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                    ⚠ Not Verified
                  </span>
                )}
                {user.line_linked && (
                  <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                    LINE Connected
                  </span>
                )}
                {!user.line_linked && (
                  <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full">
                    LINE Not Connected
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-100 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-400 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 transition-all"
                  placeholder="+66812345678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Account Created</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : ''}
                  disabled
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-100 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-6 mt-6 border-t border-zinc-100">
            {!user.line_linked && (
              <button
                onClick={handleConnectLine}
                disabled={isConnectingLine}
                className="mr-3 bg-[#06C755] text-white px-8 py-4 rounded-2xl font-bold text-sm hover:brightness-105 transition-all shadow-xl flex items-center gap-2 disabled:opacity-50"
              >
                {isConnectingLine ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Connect LINE
              </button>
            )}
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </section>

        {/* Plan Overview */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-600" />
              Current Plan
            </h3>
            <Link
              href="/dashboard/subscription"
              className="text-sm font-medium text-blue-800 hover:text-blue-900 flex items-center gap-1"
            >
              Manage Plan →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-zinc-50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Plan</p>
                  <h4 className="text-lg font-bold text-zinc-900">
                    {subscription?.plan?.name || 'Free'}
                  </h4>
                </div>
              </div>
              <p className={`text-xs font-medium ${
                subscription?.status === 'active' ? 'text-green-700' : 'text-zinc-500'
              }`}>
                Status: {subscription?.status || 'trial'}
              </p>
            </div>

            <div className="bg-zinc-50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Quota</p>
                  <h4 className="text-lg font-bold text-zinc-900">
                    {quota?.used || 0} / {quota?.quota_limit || 50}
                  </h4>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                {quota?.remaining || 0} credits remaining
              </p>
            </div>

            <div className="bg-zinc-50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Resets</p>
                  <h4 className="text-sm font-bold text-zinc-900">
                    {quota?.reset_date ? new Date(quota.reset_date).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short'
                    }) : '—'}
                  </h4>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Next quota reset
              </p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-8">
          <h3 className="text-sm font-bold text-zinc-900 mb-6 uppercase tracking-widest">Quick Actions</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/dashboard/subscription"
              className="p-6 border border-zinc-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Crown className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Upgrade Plan</h4>
                  <p className="text-xs text-zinc-500">View pricing & features</p>
                </div>
              </div>
            </Link>

            <Link
              href="/forgot-password"
              className="p-6 border border-zinc-200 rounded-xl hover:border-rose-400 hover:bg-rose-50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                  <Shield className="w-6 h-6 text-rose-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Change Password</h4>
                  <p className="text-xs text-zinc-500">Update your password</p>
                </div>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

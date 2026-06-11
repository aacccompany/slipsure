'use client';

import React, { useState, useEffect } from 'react';
import { User, Building2, Mail, Phone, MapPin, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '@/services/dashboardApi';
import { authApi } from '@/services/authApi';
import { merchantApi } from '@/services/merchantApi';
import { toast } from 'sonner';
import axios from 'axios';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: dashboardApi.getUserProfile,
    retry: false,
  });

  const { data: merchant, isLoading: merchantLoading } = useQuery({
    queryKey: ['merchant-profile'],
    queryFn: dashboardApi.getMerchantProfile,
    retry: false,
  });

  const [accountForm, setAccountForm] = useState({ name: '', phone: '' });
  const [shopForm, setShopForm] = useState({
    shop_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
  });

  useEffect(() => {
    if (user) {
      setAccountForm({
        name: user.name || '',
        phone: '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (merchant) {
      setShopForm({
        shop_name: merchant.shop_name || '',
        contact_email: merchant.contact_email || '',
        contact_phone: '',
        address: '',
      });
    }
  }, [merchant]);

  const accountMutation = useMutation({
    mutationFn: () => authApi.updateProfile({ name: accountForm.name, phone: accountForm.phone || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Account updated.');
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg || 'Failed to update account.');
    },
  });

  const shopMutation = useMutation({
    mutationFn: () => merchantApi.updateProfile({
      shop_name: shopForm.shop_name,
      contact_email: shopForm.contact_email || undefined,
      contact_phone: shopForm.contact_phone || undefined,
      address: shopForm.address || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-profile'] });
      toast.success('Shop profile updated.');
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg || 'Failed to update shop profile.');
    },
  });

  const isLoading = userLoading || merchantLoading;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const labelClass = 'block font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2';
  const inputClass = 'w-full px-4 py-3 border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400 rounded-lg';
  const inputDisabledClass = 'w-full px-4 py-3 border border-zinc-100 bg-zinc-50 text-sm text-zinc-400 rounded-lg cursor-not-allowed';

  return (
    <div className="p-6 space-y-6 max-w-2xl">

      <div className="border-b border-zinc-200 pb-4">
        <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mb-1">/ SETTINGS</p>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Account Settings</h1>
      </div>

      {/* Account Section */}
      <section className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="border-b border-zinc-200 px-6 py-3 flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-zinc-400" />
          <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">/ Account</p>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
            <div className="w-12 h-12 bg-zinc-900 flex items-center justify-center text-white text-sm font-bold uppercase font-mono rounded-xl">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">{user?.name || '—'}</p>
              <p className="font-mono text-[10px] text-zinc-400">{user?.email}</p>
              {user?.email_verified && (
                <span className="inline-flex items-center gap-1 font-mono text-[9px] text-emerald-600 uppercase tracking-widest mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                placeholder="Your name"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className={inputDisabledClass}
              />
              <p className="font-mono text-[9px] text-zinc-400 mt-1">Email cannot be changed.</p>
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={accountForm.phone}
                onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                placeholder="0812345678"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <input
                type="text"
                value={user?.role || ''}
                disabled
                className={inputDisabledClass}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => accountMutation.mutate()}
              disabled={accountMutation.isPending}
              className="bg-blue-800 text-white px-6 py-2.5 text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center gap-2 rounded-lg"
            >
              {accountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Account
            </button>
          </div>
        </div>
      </section>

      {/* Shop Section */}
      <section className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="border-b border-zinc-200 px-6 py-3 flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-zinc-400" />
          <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">/ Shop Profile</p>
        </div>
        <div className="p-6 space-y-5">
          {!merchant ? (
            <div className="text-center py-6">
              <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest">No shop profile found.</p>
              <p className="text-xs text-zinc-400 mt-1">Complete onboarding to create your shop profile.</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Shop Name</label>
                  <input
                    type="text"
                    value={shopForm.shop_name}
                    onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })}
                    placeholder="Your shop name"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <Mail className="w-3 h-3 inline mr-1" />Contact Email
                  </label>
                  <input
                    type="email"
                    value={shopForm.contact_email}
                    onChange={(e) => setShopForm({ ...shopForm, contact_email: e.target.value })}
                    placeholder="shop@example.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <Phone className="w-3 h-3 inline mr-1" />Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={shopForm.contact_phone}
                    onChange={(e) => setShopForm({ ...shopForm, contact_phone: e.target.value })}
                    placeholder="0812345678"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    <MapPin className="w-3 h-3 inline mr-1" />Address
                  </label>
                  <input
                    type="text"
                    value={shopForm.address}
                    onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                    placeholder="123 Main St, Bangkok"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => shopMutation.mutate()}
                  disabled={shopMutation.isPending || !shopForm.shop_name}
                  className="bg-blue-800 text-white px-6 py-2.5 text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center gap-2 rounded-lg"
                >
                  {shopMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Shop
                </button>
              </div>
            </>
          )}
        </div>
      </section>

    </div>
  );
}

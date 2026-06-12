'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Mail,
  Save,
  Camera,
  Loader2,
  Phone,
  MapPin,
  Clock,
  Store,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import type { MerchantProfile, MerchantSettings, BusinessHours } from '@/types/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch merchant profile
  const { data: merchantData, isLoading: merchantLoading } = useQuery({
    queryKey: ['merchant-profile'],
    queryFn: () => api.getMerchantProfile(),
  });

  // Fetch merchant settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['merchant-settings'],
    queryFn: () => api.getMerchantSettings(),
  });

  const [profileData, setProfileData] = useState<Partial<MerchantProfile>>({
    shop_name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    business_hours: {
      open: '09:00',
      close: '18:00',
      days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    },
    strict_mode: false,
  });

  const [settingsDataLocal, setSettingsDataLocal] = useState<Partial<MerchantSettings>>({
    notification_preferences: {
      send_line_notifications: true,
      send_email_summary: true,
      notify_on_failed_verification: true,
      daily_summary_time: '18:00',
    },
    business_preferences: {
      currency: 'THB',
      timezone: 'Asia/Bangkok',
      language: 'th',
    },
  });

  useEffect(() => {
    if (merchantData?.data?.profile) {
      const profile = merchantData.data.profile;
      setProfileData({
        shop_name: profile.shop_name || '',
        address: profile.address || '',
        contact_email: profile.contact_email || '',
        contact_phone: profile.contact_phone || '',
        business_hours: profile.business_hours || {
          open: '09:00',
          close: '18:00',
          days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
        },
        strict_mode: profile.strict_mode || false,
      });
    }
  }, [merchantData]);

  useEffect(() => {
    if (settingsData?.data?.settings) {
      setSettingsDataLocal(settingsData.data.settings);
    }
  }, [settingsData]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<MerchantProfile>) => api.updateMerchantProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-profile'] });
      toast.success('Profile updated successfully!');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<MerchantSettings>) => api.updateMerchantSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-settings'] });
      toast.success('Settings updated successfully!');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    },
  });

  const handleProfileSave = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleSettingsSave = () => {
    updateSettingsMutation.mutate(settingsDataLocal);
  };

  if (merchantLoading || settingsLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('') || 'U';

  return (
    <div className="p-6 space-y-6 max-w-2xl">

      <div className="border-b border-zinc-200 pb-4">
        <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mb-1">/ SETTINGS</p>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Account Settings</h1>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-8">
          <div className="flex items-center gap-6 mb-10">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-900 text-2xl font-black border-4 border-white shadow-lg uppercase">
                {initials}
              </div>
              <button className="absolute -bottom-2 -right-2 p-2 bg-zinc-900 text-white rounded-xl shadow-lg hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 mb-1">{user?.name}</h3>
              <p className="text-sm font-medium text-zinc-500">{user?.email}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Business Section */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-8">
          <h3 className="text-sm font-bold text-zinc-900 mb-8 uppercase tracking-widest flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-700" />
            Shop Information
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Shop Name</label>
              <input
                type="text"
                value={profileData.shop_name || ''}
                onChange={(e) => setProfileData({ ...profileData, shop_name: e.target.value })}
                className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={profileData.address || ''}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 transition-all"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Contact Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    value={profileData.contact_email || ''}
                    onChange={(e) => setProfileData({ ...profileData, contact_email: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="tel"
                    value={profileData.contact_phone || ''}
                    onChange={(e) => setProfileData({ ...profileData, contact_phone: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Business Hours</label>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500">Opens at</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="time"
                      value={profileData.business_hours?.open || ''}
                      onChange={(e) => setProfileData({
                        ...profileData,
                        business_hours: { ...profileData.business_hours!, open: e.target.value }
                      })}
                      className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 border border-zinc-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500">Closes at</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="time"
                      value={profileData.business_hours?.close || ''}
                      onChange={(e) => setProfileData({
                        ...profileData,
                        business_hours: { ...profileData.business_hours!, close: e.target.value }
                      })}
                      className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 border border-zinc-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500">Operating Days</label>
                  <div className="flex flex-wrap gap-2 py-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                      const dayValue = day.toLowerCase();
                      const isSelected = profileData.business_hours?.days?.includes(dayValue);
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            const days = profileData.business_hours?.days || [];
                            const newDays = isSelected
                              ? days.filter(d => d !== dayValue)
                              : [...days, dayValue];
                            setProfileData({
                              ...profileData,
                              business_hours: { ...profileData.business_hours!, days: newDays }
                            });
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-blue-800 text-white'
                              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Strict Mode */}
            <div className="flex items-center justify-between py-4 border-t border-zinc-100">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">Strict Verification Mode</h4>
                <p className="text-xs text-zinc-500 mt-1">When enabled, duplicate slips will always be rejected</p>
              </div>
              <button
                onClick={() => setProfileData({ ...profileData, strict_mode: !profileData.strict_mode })}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  profileData.strict_mode ? 'bg-blue-800' : 'bg-zinc-200'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full transition-transform ${
                    profileData.strict_mode ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-zinc-100">
            <button
              onClick={handleProfileSave}
              disabled={updateProfileMutation.isPending}
              className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl flex items-center gap-2 disabled:opacity-50"
            >
              {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Shop Info
            </button>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-8">
          <h3 className="text-sm font-bold text-zinc-900 mb-8 uppercase tracking-widest">Notification Preferences</h3>
          <div className="space-y-6">
            {[
              { key: 'send_line_notifications', label: 'LINE Notifications', desc: 'Receive notifications via LINE' },
              { key: 'send_email_summary', label: 'Daily Email Summary', desc: 'Get daily summary via email' },
              { key: 'notify_on_failed_verification', label: 'Failed Verification Alerts', desc: 'Get notified when verification fails' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">{label}</h4>
                  <p className="text-xs text-zinc-500 mt-1">{desc}</p>
                </div>
                <button
                  onClick={() => {
                    const prefs = settingsDataLocal.notification_preferences!;
                    (prefs as any)[key] = !(prefs as any)[key];
                    setSettingsDataLocal({ ...settingsDataLocal, notification_preferences: prefs });
                  }}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    (settingsDataLocal.notification_preferences as any)?.[key]
                      ? 'bg-blue-800'
                      : 'bg-zinc-200'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      (settingsDataLocal.notification_preferences as any)?.[key]
                        ? 'translate-x-6 bg-white'
                        : 'translate-x-0 bg-white'
                    }`}
                  />
                </button>
              </div>
            ))}

            <div className="pt-4 border-t border-zinc-100">
              <button
                onClick={handleSettingsSave}
                disabled={updateSettingsMutation.isPending}
                className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl flex items-center gap-2 disabled:opacity-50"
              >
                {updateSettingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


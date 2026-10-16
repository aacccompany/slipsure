'use client';

import React, { useState, useEffect } from 'react';
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Save,
  Upload,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { MerchantProfile } from '@/types/api';
import { PageSkeleton } from '@/components/ui/Skeleton';

const inputClass = 'w-full px-4 py-3 text-sm transition-all focus:outline-none';
const inputStyle = { border: '1px solid var(--border)', color: 'var(--navy)', background: '#fff' };

export default function MerchantProfileDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch merchant profile
  const { data: merchantData, isLoading } = useQuery({
    queryKey: ['merchant-profile'],
    queryFn: async () => {
      try {
        return await api.getMerchantProfile();
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.toLowerCase().includes('merchant profile not found')) {
          return { success: true, data: undefined };
        }
        throw error;
      }
    },
  });

  const { data: userData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.getProfile(),
  });

  const [profileData, setProfileData] = useState<Partial<MerchantProfile>>({
    shop_name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    strict_mode: true,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (merchantData?.data?.profile) {
      const profile = merchantData.data.profile;
      setProfileData({
        shop_name: profile.shop_name || '',
        address: profile.address || '',
        contact_email: profile.contact_email || userData?.data?.email || '',
        contact_phone: profile.contact_phone || userData?.data?.phone || '',
        strict_mode: true,
      });
    }
  }, [merchantData, userData]);

  const saveProfileMutation = useMutation({
    mutationFn: (data: Partial<MerchantProfile>) => (
      merchantData?.data?.profile
        ? api.updateMerchantProfile(data)
        : api.createMerchantProfile(data)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-profile'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      toast.success(merchantData?.data?.profile ? 'Shop profile updated successfully!' : 'Shop profile created successfully!');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save shop profile');
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => api.uploadLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-profile'] });
      toast.success('Logo uploaded successfully!');
      setLogoFile(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
    },
  });

  const handleSaveProfile = () => {
    saveProfileMutation.mutate(profileData);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setIsUploadingLogo(true);
    try {
      await uploadLogoMutation.mutateAsync(logoFile);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  const profile = merchantData?.data?.profile;
  const initials = (profileData.shop_name || profile?.shop_name || 'Shop').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-full px-6 py-6 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/dashboard/merchant"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Merchant
            </Link>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
              Merchant settings
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-950">Shop Profile</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Manage the public shop name, logo, and contact details shown to customers.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard/merchant')}
              className="h-11 rounded-md border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saveProfileMutation.isPending}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-50"
            >
              {saveProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="grid lg:grid-cols-[360px_1fr]">
            <aside className="border-b border-zinc-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3">
                <Store className="h-4 w-4 text-blue-700" />
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Brand
                </p>
              </div>

              <div className="mt-8 flex flex-col items-center text-center">
                {profile?.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt="Shop logo"
                    className="h-28 w-28 rounded-lg border border-zinc-200 bg-white object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-3xl font-black uppercase text-blue-900 shadow-sm">
                    {initials}
                  </div>
                )}
                <h2 className="mt-5 max-w-full truncate text-xl font-black text-zinc-950">
                  {profileData.shop_name || 'Your Shop Name'}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {profileData.contact_email || 'No contact email yet'}
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <input
                  type="file"
                  id="logo-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="logo-upload"
                  className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-5 text-center text-sm font-semibold text-zinc-600 transition-colors hover:border-blue-400 hover:text-blue-700"
                >
                  <Upload className="mb-2 h-5 w-5" />
                  <span className="max-w-full truncate">{logoFile ? logoFile.name : 'Choose logo image'}</span>
                  <span className="mt-1 text-xs font-normal text-zinc-400">PNG, JPG, or WEBP</span>
                </label>
                {logoFile && (
                  <button
                    type="button"
                    onClick={handleLogoUpload}
                    disabled={isUploadingLogo}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-700 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:cursor-wait disabled:opacity-50"
                  >
                    {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload Logo
                  </button>
                )}
              </div>
            </aside>

            <div className="p-6 md:p-8">
              <div className="mb-6">
                <h3 className="text-base font-black text-zinc-950">Business Details</h3>
                <p className="mt-1 text-sm text-zinc-500">Keep these details accurate for receipts and customer replies.</p>
              </div>

              <div className="grid gap-5">
                <label className="space-y-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Shop Name</span>
                  <input
                    type="text"
                    value={profileData.shop_name || ''}
                    onChange={(e) => setProfileData({ ...profileData, shop_name: e.target.value })}
                    className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500"
                    placeholder="Enter your shop name"
                  />
                </label>

                <label className="space-y-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Address</span>
                  <span className="relative block">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={profileData.address || ''}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      className="h-11 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-3 text-sm font-semibold text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500"
                      placeholder="Enter your shop address"
                    />
                  </span>
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Contact Email</span>
                    <span className="relative block">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="email"
                        value={profileData.contact_email || ''}
                        onChange={(e) => setProfileData({ ...profileData, contact_email: e.target.value })}
                        className="h-11 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-3 text-sm font-semibold text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500"
                        placeholder="Enter contact email"
                      />
                    </span>
                  </label>

                  <label className="space-y-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Contact Phone</span>
                    <span className="relative block">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="tel"
                        value={profileData.contact_phone || ''}
                        onChange={(e) => setProfileData({ ...profileData, contact_phone: e.target.value })}
                        className="h-11 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-3 text-sm font-semibold text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500"
                        placeholder="Enter contact phone"
                      />
                    </span>
                  </label>
                </div>

                <label className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-slate-50 px-4 py-3">
                  <span>
                    <span className="block text-sm font-bold text-zinc-950">Strict duplicate checks</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">Repeated slips are always blocked during verification.</span>
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                    Always on
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

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

export default function MerchantProfileDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch merchant profile
  const { data: merchantData, isLoading } = useQuery({
    queryKey: ['merchant-profile'],
    queryFn: () => api.getMerchantProfile(),
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
    strict_mode: false,
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
        strict_mode: profile.strict_mode || false,
      });
    }
  }, [merchantData, userData]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<MerchantProfile>) => api.updateMerchantProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-profile'] });
      toast.success('Shop profile updated successfully!');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update shop profile');
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
    updateProfileMutation.mutate(profileData);
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
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-800 animate-spin" />
      </div>
    );
  }

  const profile = merchantData?.data?.profile;
  const initials = profile?.shop_name?.slice(0, 2).toUpperCase() || ' Shop';

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      {/* Back Button */}
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
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Shop Profile</h1>
        <p className="text-sm font-medium text-zinc-500">จัดการข้อมูลร้านค้าและข้อมูลติดต่อ</p>
      </div>

      <div className="space-y-8">
        {/* Shop Logo & Basic Info */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-8">
          <h3 className="text-sm font-bold text-zinc-900 mb-6 uppercase tracking-widest flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-700" />
            Shop Information
          </h3>

          <div className="mb-8">
            <div className="flex items-center gap-6 mb-6">
              <div className="relative group">
                {profile?.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt="Shop logo"
                    className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-900 text-2xl font-black border-4 border-white shadow-lg uppercase">
                    {initials}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-zinc-900 mb-1">{profile?.shop_name || 'Your Shop Name'}</h4>
                <p className="text-sm text-zinc-500">Upload your shop logo to build brand recognition</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="file"
                id="logo-upload"
                className="hidden"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="logo-upload"
                className="flex-1 py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm font-medium text-zinc-600 hover:border-blue-400 hover:text-blue-700 transition-all text-center cursor-pointer"
              >
                {logoFile ? logoFile.name : 'Choose new logo'}
              </label>
              {logoFile && (
                <button
                  onClick={handleLogoUpload}
                  disabled={isUploadingLogo}
                  className="px-6 py-3 bg-blue-800 text-white rounded-xl font-medium hover:bg-blue-900 flex items-center gap-2 disabled:opacity-50"
                >
                  {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Shop Name</label>
              <input
                type="text"
                value={profileData.shop_name || ''}
                onChange={(e) => setProfileData({ ...profileData, shop_name: e.target.value })}
                className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 transition-all"
                placeholder="Enter your shop name"
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
                  placeholder="Enter your shop address"
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
                    placeholder="Enter contact email"
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
                    placeholder="Enter contact phone"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            onClick={() => router.push('/dashboard/merchant')}
            className="px-6 py-4 border border-zinc-200 text-zinc-700 rounded-2xl font-bold text-sm hover:bg-zinc-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl flex items-center gap-2 disabled:opacity-50"
          >
            {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

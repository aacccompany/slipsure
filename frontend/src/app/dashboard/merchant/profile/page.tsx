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

const inputClass = 'w-full px-4 py-3 text-sm transition-all focus:outline-none';
const inputStyle = { border: '1px solid var(--border)', color: 'var(--navy)', background: '#fff' };

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
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  const profile = merchantData?.data?.profile;
  const initials = profile?.shop_name?.slice(0, 2).toUpperCase() || 'SH';

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl" style={{ background: 'var(--bg)' }}>
      <div>
        <Link
          href="/dashboard/merchant"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Merchant
        </Link>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
          / Merchant / Shop Profile
        </p>
        <h1 className="font-bold tracking-tight" style={{ fontSize: '1.4rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
          Shop Profile
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>จัดการข้อมูลร้านค้าและข้อมูลติดต่อ</p>
      </div>

      <section className="bg-white p-8" style={{ border: '1px solid var(--border)' }}>
        <p className="font-mono text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Store className="w-3.5 h-3.5" /> Shop Information
        </p>

        <div className="mb-8">
          <div className="flex items-center gap-6 mb-6">
            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt="Shop logo"
                className="w-20 h-20 object-cover"
                style={{ border: '1px solid var(--border)' }}
              />
            ) : (
              <div
                className="w-20 h-20 flex items-center justify-center text-white text-xl font-bold uppercase"
                style={{ background: 'var(--navy)' }}
              >
                {initials}
              </div>
            )}
            <div>
              <h4 className="font-bold text-lg mb-0.5" style={{ color: 'var(--navy)' }}>{profile?.shop_name || 'Your Shop Name'}</h4>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Upload your shop logo to build brand recognition</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              id="logo-upload"
              className="hidden"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
            <label
              htmlFor="logo-upload"
              className="flex-1 py-3 text-sm font-medium text-center cursor-pointer transition-colors"
              style={{ border: '1px dashed var(--border-strong)', color: 'var(--text-muted)' }}
            >
              {logoFile ? logoFile.name : 'Choose new logo'}
            </label>
            {logoFile && (
              <button
                onClick={handleLogoUpload}
                disabled={isUploadingLogo}
                className="px-6 py-3 text-sm font-semibold flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--navy)', color: '#fff' }}
              >
                {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Shop Name</label>
            <input
              type="text"
              value={profileData.shop_name || ''}
              onChange={(e) => setProfileData({ ...profileData, shop_name: e.target.value })}
              className={inputClass}
              style={inputStyle}
              placeholder="Enter your shop name"
              onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Address</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={profileData.address || ''}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                className={inputClass}
                style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                placeholder="Enter your shop address"
                onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Contact Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={profileData.contact_email || ''}
                  onChange={(e) => setProfileData({ ...profileData, contact_email: e.target.value })}
                  className={inputClass}
                  style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                  placeholder="Enter contact email"
                  onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  value={profileData.contact_phone || ''}
                  onChange={(e) => setProfileData({ ...profileData, contact_phone: e.target.value })}
                  className={inputClass}
                  style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                  placeholder="Enter contact phone"
                  onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-3 pt-6 mt-6"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => router.push('/dashboard/merchant')}
            className="px-6 py-3 text-sm font-semibold transition-all hover:opacity-90"
            style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            className="flex items-center gap-2 px-8 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--navy)', color: '#fff' }}
          >
            {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </section>
    </div>
  );
}

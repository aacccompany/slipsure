'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Store, ImageIcon, MessageSquare, ArrowRight, ArrowLeft, CheckCircle2, Loader2, AlertCircle, Upload, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { merchantApi } from '@/services/merchantApi';
import axios from 'axios';

const STEPS = [
  { id: 1, label: 'Shop Profile', icon: Store },
  { id: 2, label: 'Logo', icon: ImageIcon },
  { id: 3, label: 'LINE Bot', icon: MessageSquare },
];

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [shopName, setShopName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');

  // Step 2
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/login');
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('File must be under 2MB.');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await merchantApi.createProfile({
        shop_name: shopName,
        contact_email: contactEmail || undefined,
        contact_phone: contactPhone || undefined,
        address: address || undefined,
        strict_mode: false,
      });
      setStep(2);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Failed to save profile.'
        : 'Failed to save profile.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!logoFile) {
      setStep(3);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await merchantApi.uploadLogo(logoFile);
      setStep(3);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Failed to upload logo.'
        : 'Failed to upload logo.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    toast.success('Setup complete! Welcome to FlowSlip.');
    router.push('/dashboard');
  };

  const labelClass = 'block font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2';
  const inputClass = 'w-full px-4 py-3 border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400 rounded-lg';

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="font-mono text-sm font-bold text-zinc-900 tracking-tight block mb-6">
            ← FLOWSLIP
          </Link>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Account Setup</h1>
          <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mt-1">
            <span className="text-emerald-600">● </span>STEP {step} OF {STEPS.length}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = step > s.id;
            const isActive = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone ? 'bg-blue-800 border-blue-800 text-white'
                    : isActive ? 'bg-white border-zinc-900 text-zinc-900'
                    : 'bg-white border-zinc-200 text-zinc-400'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`font-mono text-[9px] uppercase tracking-widest ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 mb-4 ${step > s.id ? 'bg-blue-800' : 'bg-zinc-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="p-8 space-y-6">

            {/* Step 1: Shop Profile */}
            {step === 1 && (
              <form onSubmit={handleStep1} className="space-y-5">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center">
                      <Store className="w-5 h-5 text-blue-800" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-zinc-900 tracking-tight">Shop Profile</h2>
                      <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">Tell us about your business</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Shop Name <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Premium Coffee Hub"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="shop@example.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Contact Phone</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0812345678"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, Bangkok"
                    className={inputClass}
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-rose-500 bg-rose-50 border border-rose-200 px-4 py-3 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-xs">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-800 text-white py-3 text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 rounded-lg"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}

            {/* Step 2: Logo */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-blue-800" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-zinc-900 tracking-tight">Shop Logo</h2>
                    <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">Optional — you can skip this</p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {logoPreview ? (
                  <div className="flex flex-col items-center gap-4">
                    <img src={logoPreview} alt="Logo preview" className="w-24 h-24 rounded-xl object-cover border border-zinc-200" />
                    <button
                      type="button"
                      onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                      className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest hover:text-zinc-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-zinc-200 rounded-xl p-10 flex flex-col items-center gap-3 hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
                      <Upload className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider">Click to upload</p>
                      <p className="font-mono text-[10px] text-zinc-400 mt-1">PNG or JPG · Max 2MB</p>
                    </div>
                  </button>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-rose-500 bg-rose-50 border border-rose-200 px-4 py-3 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-xs">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-3 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-50 transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleStep2}
                    disabled={isLoading}
                    className="flex-1 bg-blue-800 text-white py-3 text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 rounded-lg"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>{logoFile ? 'Upload & Continue' : 'Skip for Now'}</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: LINE Bot */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-[#06C755]/10 border border-[#06C755]/20 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-[#06C755]" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-zinc-900 tracking-tight">LINE Bot</h2>
                    <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">Connect your LINE OA</p>
                  </div>
                </div>

                <div className="space-y-3 bg-zinc-50 border border-zinc-200 rounded-xl p-5">
                  <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">Setup Guide</p>
                  <ol className="space-y-2">
                    {[
                      'Go to LINE Developers Console',
                      'Create or select a Messaging API channel',
                      'Copy the Channel Access Token',
                      'Paste the Webhook URL from your Dashboard',
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="font-mono text-[10px] text-blue-800 mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                        <span className="text-xs text-zinc-600">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <a
                    href="https://developers.line.biz/console/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] text-blue-800 uppercase tracking-widest hover:underline mt-2"
                  >
                    Open LINE Console <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
                  You can configure this later from your Dashboard settings.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-3 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-50 transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleComplete}
                    className="flex-1 bg-blue-800 text-white py-3 text-sm font-medium hover:bg-blue-900 transition-colors flex items-center justify-center gap-2 rounded-lg"
                  >
                    Finish Setup <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest text-center mt-6">
          © 2026 FLOWSLIP
        </p>
      </div>
    </div>
  );
}

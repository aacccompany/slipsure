'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Store, ImageIcon, MessageSquare, ArrowRight, ArrowLeft, CheckCircle2, Loader2, AlertCircle, Upload, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { api, tokenManager } from '@/lib/api-client';

const STEPS = [
  { id: 1, label: 'Shop Profile', icon: Store },
  { id: 2, label: 'Logo',         icon: ImageIcon },
  { id: 3, label: 'LINE Bot',     icon: MessageSquare },
];

const inputClass = 'w-full px-4 py-3 border text-sm transition-colors placeholder:opacity-40 focus:outline-none';
const labelClass = 'block font-mono text-[10px] uppercase tracking-widest mb-2';

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [shopName, setShopName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenManager.isAuthenticated()) router.push('/login');
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('File must be under 2MB.'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      await api.createMerchantProfile({
        shop_name: shopName,
        contact_email: contactEmail || undefined,
        contact_phone: contactPhone || undefined,
        address: address || undefined,
        business_hours: { open: '09:00', close: '18:00', days: ['mon','tue','wed','thu','fri','sat'] },
        strict_mode: false,
      });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally { setIsLoading(false); }
  };

  const handleStep2 = async () => {
    if (!logoFile) { setStep(3); return; }
    setIsLoading(true); setError('');
    try {
      await api.uploadLogo(logoFile);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo.');
    } finally { setIsLoading(false); }
  };

  const handleComplete = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    toast.success('Setup complete! Welcome to FlowSlip.');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="thai-pattern fixed inset-0 pointer-events-none" />

      <div className="relative w-full max-w-lg">
        <Link href="/"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-8 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
          ← FLOWSLIP
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-4xl font-semibold mb-1" style={{ color: 'var(--navy)' }}>
            Account Setup
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
              Step {step} of {STEPS.length}
            </span>
          </div>
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
                  <div className="w-9 h-9 flex items-center justify-center border-2 transition-all"
                    style={{
                      background: isDone ? 'var(--gold)' : isActive ? 'var(--navy)' : '#fff',
                      borderColor: isDone ? 'var(--gold)' : isActive ? 'var(--navy)' : 'var(--border)',
                      color: isDone ? 'var(--navy)' : isActive ? 'var(--gold-pale)' : 'var(--text-muted)',
                    }}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest"
                    style={{ color: isActive ? 'var(--navy)' : 'var(--text-muted)' }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px mx-2 mb-4 transition-colors"
                    style={{ background: step > s.id ? 'var(--gold)' : 'var(--border)' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white p-8" style={{ border: '1px solid var(--border)' }}>

          {/* Step 1 */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center"
                  style={{ background: 'var(--gold-pale)', border: '1px solid var(--gold)' }}>
                  <Store className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--navy)' }}>Shop Profile</h2>
                  <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tell us about your business</p>
                </div>
              </div>

              {[
                { label: 'Shop Name *', type: 'text', value: shopName, setter: setShopName, placeholder: 'Premium Coffee Hub', required: true },
                { label: 'Contact Email', type: 'email', value: contactEmail, setter: setContactEmail, placeholder: 'shop@example.com', required: false },
                { label: 'Contact Phone', type: 'tel', value: contactPhone, setter: setContactPhone, placeholder: '0812345678', required: false },
                { label: 'Address', type: 'text', value: address, setter: setAddress, placeholder: '123 Main St, Bangkok', required: false },
              ].map(({ label, type, value, setter, placeholder, required }) => (
                <div key={label}>
                  <label className={labelClass} style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <input type={type} value={value} onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder} required={required} className={inputClass}
                    style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
                </div>
              ))}

              {error && <ErrorBox message={error} />}

              <button type="submit" disabled={isLoading}
                className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--navy)', color: 'var(--gold-pale)' }}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <span style={{ color: 'var(--gold)' }}>→</span></>}
              </button>
            </form>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center"
                  style={{ background: 'var(--gold-pale)', border: '1px solid var(--gold)' }}>
                  <ImageIcon className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--navy)' }}>Shop Logo</h2>
                  <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Optional — skip if you want</p>
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleFileChange} className="hidden" />

              {logoPreview ? (
                <div className="flex flex-col items-center gap-4">
                  <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-cover" style={{ border: '1px solid var(--border)' }} />
                  <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                    className="font-mono text-[10px] uppercase tracking-widest transition-colors"
                    style={{ color: 'var(--text-muted)' }}>Remove</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full p-10 flex flex-col items-center gap-3 border-2 border-dashed transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--gold)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  <div className="w-10 h-10 flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
                    <Upload className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Click to upload</p>
                    <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--border-strong)' }}>PNG or JPG · Max 2MB</p>
                  </div>
                </button>
              )}

              {error && <ErrorBox message={error} />}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="px-5 py-3 text-sm font-medium flex items-center gap-2 transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handleStep2} disabled={isLoading}
                  className="flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--navy)', color: 'var(--gold-pale)' }}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{logoFile ? 'Upload & Continue' : 'Skip for Now'} <span style={{ color: 'var(--gold)' }}>→</span></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center"
                  style={{ background: '#ECFDF5', border: '1px solid #6EE7B7' }}>
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--navy)' }}>LINE Bot</h2>
                  <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Connect your LINE OA</p>
                </div>
              </div>

              <div className="p-5 space-y-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Setup Guide</p>
                <ol className="space-y-2">
                  {[
                    'Go to LINE Developers Console',
                    'Create or select a Messaging API channel',
                    'Copy the Channel Access Token',
                    'Paste the Webhook URL from your Dashboard',
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="font-mono text-[10px] mt-0.5 shrink-0 font-bold" style={{ color: 'var(--gold)' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s}</span>
                    </li>
                  ))}
                </ol>
                <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest hover:underline mt-2"
                  style={{ color: 'var(--gold)' }}>
                  Open LINE Console <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                You can configure this later from Dashboard settings.
              </p>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)}
                  className="px-5 py-3 text-sm font-medium flex items-center gap-2 transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handleComplete}
                  className="flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{ background: 'var(--navy)', color: 'var(--gold-pale)' }}>
                  Finish Setup <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="font-mono text-[10px] uppercase tracking-widest text-center mt-6" style={{ color: 'var(--text-muted)' }}>
          © 2026 FLOWSLIP
        </p>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
      <p className="text-xs text-rose-600">{message}</p>
    </div>
  );
}

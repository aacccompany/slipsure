'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

function Input({ label, type, value, onChange, placeholder, required = false }: {
  label: string; type: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="w-full px-4 py-3 border text-sm transition-all focus:outline-none"
        style={{ borderColor: 'var(--border)', color: 'var(--navy)', background: '#fff' }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
    </div>
  );
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (password !== confirmPassword) { setError('รหัสผ่านไม่ตรงกัน'); return; }
    if (password.length < 8) { setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return; }
    setIsLoading(true);
    try {
      await api.register({ name, email, password, phone: phone || undefined });
      toast.success('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลของคุณ');
      router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'สมัครสมาชิกไม่สำเร็จ'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-[420px_1fr]">

      {/* Left panel */}
      <div className="hidden md:flex flex-col justify-between p-10 relative overflow-hidden" style={{ background: 'var(--navy)' }}>
        <div className="thai-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.07 }} />

        <Link href="/" className="relative font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--cyan)' }}>
          ← flowslip.ai
        </Link>

        <div className="relative space-y-5">
          <div className="font-black select-none leading-none" style={{ fontSize: '7rem', color: 'rgba(0,82,255,0.1)', letterSpacing: '-0.04em' }}>01</div>
          <h2 className="font-bold leading-tight" style={{ fontSize: '1.75rem', color: 'rgba(248,250,252,0.9)', letterSpacing: '-0.02em' }}>
            เริ่มต้นฟรี<br />
            <span style={{ color: 'var(--cyan)' }}>50 สลิป/เดือน</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(248,250,252,0.45)' }}>
            ไม่ต้องใช้บัตรเครดิต ไม่มีสัญญาผูกมัด
          </p>
          <div className="space-y-2 pt-2">
            {['ตรวจสอบผ่าน Bank Gateway จริง', 'เชื่อมต่อ LINE OA ได้ทันที', 'ดูสถิติแบบ Real-time'].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span style={{ color: 'var(--blue)', fontSize: 12 }}>✓</span>
                <span className="text-sm" style={{ color: 'rgba(248,250,252,0.6)' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(248,250,252,0.2)' }}>
          © 2026 FLOWSLIP.AI
        </p>
      </div>

      {/* Right — form */}
      <div className="flex flex-col justify-center px-8 py-12 md:px-16" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm mx-auto">
          <Link href="/" className="md:hidden inline-block font-mono text-[10px] uppercase tracking-widest mb-8" style={{ color: 'var(--text-muted)' }}>
            ← FLOWSLIP
          </Link>

          <div className="mb-8">
            <h1 className="font-bold mb-1" style={{ fontSize: '1.75rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
              สมัครสมาชิก
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>ฟรี 50 สลิป/เดือน ไม่ต้องใช้บัตรเครดิต</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="ชื่อ-นามสกุล" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="สมชาย ใจดี" required />
            <Input label="อีเมล" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
            <Input label="เบอร์โทร (ไม่บังคับ)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812345678" />
            <Input label="รหัสผ่าน" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" required />
            <Input label="ยืนยันรหัสผ่าน" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <p className="text-xs text-rose-600">{error}</p>
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--navy)', color: '#fff' }}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'สร้างบัญชี →'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--border-strong)' }}>มีบัญชีแล้ว?</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <Link href="/login"
            className="block w-full py-3 text-sm font-medium text-center border transition-all hover:opacity-75"
            style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}>
            เข้าสู่ระบบ
          </Link>

          <p className="font-mono text-[9px] uppercase tracking-widest text-center mt-6 leading-relaxed" style={{ color: 'var(--border-strong)' }}>
            การสมัครถือว่ายอมรับ Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}

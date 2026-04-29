'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate network delay for realistic UI feel
    await new Promise(resolve => setTimeout(resolve, 800));

    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('authToken', 'mock_token_for_demo_purposes');
      router.push('/dashboard');
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (admin/admin)');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 hero-gradient">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 group mb-6">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center transition-all group-hover:bg-emerald-500 shadow-lg shadow-emerald-600/20">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-zinc-900">
              Slipsure<span className="text-emerald-600">.ai</span>
            </span>
          </Link>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">เข้าสู่ระบบจัดการ</h1>
          <p className="text-zinc-500 font-medium text-sm mt-2 text-balance">
            สำหรับนักพัฒนาและผู้ใช้งานระบบหลังบ้าน Slipsure
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-emerald-600/5">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-300"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-300"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-4 py-3 rounded-xl border border-rose-100 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl shadow-zinc-900/10 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  เข้าสู่ระบบ
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-zinc-50 text-center">
             <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
               มีปัญหาในการเข้าสู่ระบบ? <br/>
               <a href="#" className="text-emerald-600 hover:underline mt-2 inline-block">ติดต่อฝ่ายสนับสนุนทางเทคนิค</a>
             </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center mt-10 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            © 2026 Slipsure.Ai - Bank-Grade Security
        </p>
      </div>
    </div>
  );
}

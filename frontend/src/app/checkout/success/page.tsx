'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Zap, Receipt, Shield, Loader2 } from 'lucide-react';
import { api, tokenManager } from '@/lib/api-client';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id') ?? '';
  const [countdown, setCountdown] = useState(8);
  const [state, setState] = useState<'checking' | 'confirmed' | 'expired' | 'delayed' | 'login'>('checking');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!sessionId) { setState('delayed'); return; }
    if (!tokenManager.isAuthenticated()) { setState('login'); return; }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const check = async () => {
      attempts++;
      try {
        const response = await api.confirmCheckout(sessionId);
        if (cancelled) return;
        if (response.data?.state === 'confirmed') { setState('confirmed'); return; }
        if (response.data?.state === 'expired') { setState('expired'); return; }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && error.message.includes('UNAUTHORIZED')) {
          setState('login');
          return;
        }
        if (error instanceof Error && (error.message.includes('CHECKOUT_OWNER_MISMATCH') || error.message.includes('OLDER_CHECKOUT'))) {
          setState('delayed');
          return;
        }
      }
      if (attempts >= 20) { setState('delayed'); return; }
      timer = setTimeout(check, 3000);
    };
    setState('checking');
    void check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [sessionId, retryKey]);

  useEffect(() => {
    if (state !== 'confirmed') return;
    if (countdown <= 0) { router.push('/dashboard/subscription'); return; }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router, state]);

  if (state !== 'confirmed') {
    const title = state === 'expired' ? 'เซสชันชำระเงินหมดอายุ'
      : state === 'login' ? 'กรุณาเข้าสู่ระบบ'
      : state === 'delayed' ? 'ยังยืนยันการชำระเงินไม่ได้'
      : 'กำลังยืนยันการชำระเงิน';
    const detail = state === 'checking'
      ? 'ระบบกำลังตรวจสอบรายการกับ Stripe และบันทึกเครดิต กรุณารอสักครู่'
      : state === 'expired' ? 'รายการนี้หมดอายุแล้ว กรุณากลับไปเลือกแพ็กเกจใหม่'
      : state === 'login' ? 'เข้าสู่ระบบด้วยบัญชีที่ใช้ชำระเงินเพื่อตรวจสอบรายการนี้'
      : 'ยังไม่มีเครดิตหรือประวัติชำระเงินในระบบ หาก Stripe แสดงว่าจ่ายแล้ว กรุณาลองตรวจอีกครั้งหรือติดต่อผู้ดูแล';
    return (
      <main className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-lg border p-6 sm:p-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {state === 'checking' && <Loader2 className="mb-5 h-7 w-7 animate-spin text-blue-600" />}
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{title}</h1>
          <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>{detail}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {state === 'login' ? <Link href="/login" className="bg-blue-700 px-4 py-2 text-sm font-semibold text-white">เข้าสู่ระบบ</Link>
              : state !== 'checking' && <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="bg-blue-700 px-4 py-2 text-sm font-semibold text-white">ตรวจสอบอีกครั้ง</button>}
            <Link href="/dashboard/subscription" className="border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}>ดูแพ็กเกจ</Link>
          </div>
        </div>
      </main>
    );
  }

  const shortRef = sessionId ? sessionId.slice(-8).toUpperCase() : '—';

  return (
    <div className="min-h-screen pt-20" style={{ background: 'var(--bg)' }}>
      <div className="thai-pattern fixed inset-0 pointer-events-none" />

      {/* Top bar */}
      <div className="relative" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              ชำระเงินสำเร็จ
            </span>
          </div>
          <span className="font-mono text-[10px]" style={{ color: 'var(--border-strong)' }}>
            FLOWSLIP / ชำระเงิน / สำเร็จ
          </span>
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-6 py-16">
        {/* Main card */}
        <div className="bg-white mb-8" style={{ border: '1px solid var(--border)' }}>
          {/* Gold top */}
          <div className="h-1" style={{ background: 'var(--gold)' }} />

          <div className="p-10">
            {/* Icon */}
            <div className="w-14 h-14 flex items-center justify-center mb-8"
              style={{ background: 'var(--gold-pale)', border: '1px solid var(--gold)' }}>
              <span style={{ color: 'var(--gold)', fontSize: 24 }}>✓</span>
            </div>

            <p className="font-mono text-[11px] uppercase tracking-widest mb-3" style={{ color: 'var(--gold)' }}>
              / ชำระเงินสำเร็จ
            </p>
            <h1 className="font-display text-4xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>
              ยืนยันการชำระเงินแล้ว
            </h1>
            <p className="text-sm leading-relaxed mb-10" style={{ color: 'var(--text-muted)' }}>
              แพ็กเกจของคุณเปิดใช้งานแล้ว สามารถเริ่มใช้สิทธิ์ตามแพ็กเกจได้ทันที
            </p>

            {/* Details */}
            <div className="mb-10" style={{ border: '1px solid var(--border)' }}>
              {[
                { label: 'สถานะ',    value: 'ใช้งานอยู่',                  isGold: true },
                { label: 'หมายเลขอ้างอิง', value: `#${shortRef}`,            isGold: false },
                { label: 'กำลังไปยัง',  value: `หน้าภาพรวมใน ${countdown} วินาที`, isGold: false },
              ].map(({ label, value, isGold }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </span>
                  <span className="text-sm font-bold" style={{ color: isGold ? 'var(--gold)' : 'var(--ink)' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <Link href="/dashboard/subscription"
              className="flex items-center justify-center gap-2 w-full py-4 text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--navy)', color: 'var(--gold-pale)' }}>
              <LayoutDashboard className="w-4 h-4" />
              ไปที่หน้าภาพรวม
              <span style={{ color: 'var(--gold)' }}>→</span>
            </Link>
          </div>
        </div>

        {/* Next steps */}
        <p className="font-mono text-[11px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
          / ขั้นตอนถัดไป
        </p>
        <div className="space-y-3">
          {[
            { icon: Zap,     title: 'โควต้าพร้อมใช้งาน',     desc: 'เริ่มตรวจสอบสลิปได้ทันทีตามสิทธิ์ในแพ็กเกจ' },
            { icon: Receipt, title: 'ดูประวัติสลิป',     desc: 'ติดตามผลการตรวจสอบและประวัติการชำระเงินได้ในหน้าภาพรวม' },
            { icon: Shield,  title: 'ตั้งค่า LINE',  desc: 'เชื่อมต่อ LINE OA เพื่อรับและตรวจสอบสลิปอัตโนมัติ' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-8 h-8 flex items-center justify-center shrink-0"
                style={{ background: 'var(--gold-pale)', border: '1px solid var(--border)' }}>
                <Icon className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--ink)' }}>{title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--gold)' }} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

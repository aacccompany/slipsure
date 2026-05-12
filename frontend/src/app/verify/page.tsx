'use client';

import React, { useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { FileUpload } from '@/components/features/FileUpload';
import { ResultCard } from '@/components/features/ResultCard';
import { SlipVerificationResult } from '@/types/slip';
import { verifySlip } from '@/services/api';

export default function VerifyPage() {
  const [verificationResult, setVerificationResult] = useState<SlipVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleScanSuccess = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await verifySlip(file);
      if (result.success) {
        setVerificationResult(result);
      } else {
        setError(result.message || 'ไม่พบข้อมูลสลิปในฐานข้อมูลธนาคาร หรือรหัส QR ไม่ถูกต้อง');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อกับธนาคาร โปรดลองอีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanError = (errMsg: string) => {
    setError(errMsg);
    setVerificationResult(null);
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-white pt-20">

      {/* Page Header */}
      <div className="border-b border-zinc-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-900 transition-colors text-sm">
              <ArrowLeft className="w-3.5 h-3.5" />
              กลับ
            </Link>
            <div className="h-4 w-px bg-zinc-200" />
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-800" />
              <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">SLIP VERIFICATION</span>
            </div>
          </div>
          <span className="font-mono text-[10px] text-zinc-400">FLOWSLIP / VERIFY</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-16">

          {/* Left Info */}
          <div className="lg:col-span-4 space-y-8">
            <div>
              <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mb-3">/ HOW IT WORKS</p>
              <h1 className="text-3xl font-black text-zinc-900 tracking-tight leading-tight">
                ตรวจสอบ<br />สลิปธนาคาร
              </h1>
            </div>

            <div className="space-y-4">
              {[
                { num: '01', text: 'อัปโหลดรูปภาพสลิปที่ต้องการตรวจสอบ' },
                { num: '02', text: 'ระบบดึง QR Code และส่งไปยัง Bank Gateway' },
                { num: '03', text: 'ผลลัพธ์แสดงจากแหล่งข้อมูลธนาคารโดยตรง' },
              ].map((step) => (
                <div key={step.num} className="flex items-start gap-4 border border-zinc-100 p-4">
                  <span className="font-mono text-[11px] text-zinc-300 shrink-0">{step.num}</span>
                  <p className="text-sm text-zinc-500">{step.text}</p>
                </div>
              ))}
            </div>

            <div className="border border-zinc-200 p-5 space-y-3">
              <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">/ SPECS</p>
              {[
                ['รองรับธนาคาร', 'ทุกธนาคารในไทย'],
                ['ประเภทไฟล์', 'PNG, JPG, JPEG'],
                ['Avg. Response', '~0.8 วินาที'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{k}</span>
                  <span className="font-medium text-zinc-900">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Upload / Result */}
          <div className="lg:col-span-8">
            {isLoading && (
              <div className="border border-zinc-200 p-24 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-4" />
                <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest">VERIFYING WITH BANK GATEWAY...</p>
              </div>
            )}

            {!isLoading && !verificationResult && !error && (
              <FileUpload onScanSuccess={handleScanSuccess} onScanError={handleScanError} />
            )}

            {!isLoading && (verificationResult || error) && (
              <div className="animate-in slide-in-from-bottom-4 duration-300">
                <ResultCard result={verificationResult} error={error} onReset={resetVerification} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { ShieldCheck, Loader2, Lock, Info } from 'lucide-react';
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
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อกับธนาคาร โปรดลองอีกครั้งในภายหลัง');
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
    <div className="min-h-screen bg-[#fafafa] pt-24 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 bg-white border border-zinc-200 rounded-full shadow-sm">
            <Lock className="w-3 h-3 text-zinc-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Secure Verification</span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 mb-4 tracking-tight">ตรวจสอบสลิปโอนเงิน</h1>
          <p className="text-zinc-500 font-medium">อัปโหลดรูปภาพสลิปเพื่อตรวจสอบความถูกต้องทันที</p>
        </div>

        <div className="relative max-w-2xl mx-auto">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md rounded-3xl border border-zinc-100 animate-in fade-in duration-300">
              <Loader2 className="w-8 h-8 text-zinc-900 animate-spin mb-4" />
              <p className="text-sm font-bold text-zinc-900 tracking-tight">กำลังตรวจสอบข้อมูลสลิป...</p>
            </div>
          )}

          {!verificationResult && !error ? (
            <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-12 md:p-20 shadow-sm transition-all hover:border-zinc-200">
              <FileUpload 
                onScanSuccess={handleScanSuccess} 
                onScanError={handleScanError} 
              />
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <ResultCard 
                result={verificationResult} 
                error={error} 
                onReset={resetVerification} 
              />
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-16 max-w-2xl mx-auto">
          <div className="bg-white border border-zinc-100 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-4 h-4 text-zinc-400" />
              <h3 className="font-bold text-zinc-900 text-sm">คำแนะนำ</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-medium">
              อัปโหลดรูปภาพสลิปที่เห็น QR Code ชัดเจน ระบบจะสแกนเฉพาะรหัสเพื่อส่งไปตรวจสอบกับธนาคารเท่านั้น
            </p>
          </div>
          <div className="bg-zinc-900 rounded-3xl p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
              <h3 className="font-bold text-sm text-white tracking-tight">ความปลอดภัย</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              ข้อมูลทุกรายการจะถูกส่งผ่านระบบเข้ารหัสมาตรฐานเดียวกับธนาคาร และไม่มีการบันทึกภาพสลิปของคุณ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

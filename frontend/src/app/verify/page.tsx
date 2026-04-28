'use client';

import React, { useState } from 'react';
import { ShieldCheck, Loader2, Lock, Info, CheckCircle2, Zap, ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-[#fafafa] pt-32 pb-20 px-6 hero-gradient">
      <div className="max-w-5xl mx-auto">
        
        {/* Back Link */}
        <div className="mb-12">
            <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-emerald-600 transition-colors font-bold text-sm">
                <ArrowLeft className="w-4 h-4" />
                กลับหน้าหลัก
            </Link>
        </div>

        <div className="grid lg:grid-cols-12 gap-16">
            
            {/* Header Content */}
            <div className="lg:col-span-5 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Bank-Grade Verification</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tight leading-[0.95]">
                    ตรวจสอบ <br/>
                    <span className="text-emerald-600">สลิปธนาคาร.</span>
                </h1>
                <p className="text-zinc-500 font-medium text-lg leading-relaxed">
                    เพียงอัปโหลดรูปภาพสลิปที่ต้องการตรวจสอบ ระบบจะทำการยืนยันกับธนาคารกสิกรไทย (KBank) และแสดงข้อมูลจริงให้ทราบทันที
                </p>

                <div className="space-y-4 pt-6">
                    {[
                        "ยืนยันข้อมูลโดยตรงจาก KBank",
                        "แม่นยำ 100% ตรวจสอบได้ทุกฟิลด์",
                        "ไม่มีค่าธรรมเนียมสำหรับผู้เริ่มต้น"
                    ].map((text, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <span className="text-sm font-bold text-zinc-700">{text}</span>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-white border border-zinc-100 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        ความเร็วในการประมวลผล
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="w-[95%] h-full bg-emerald-500 rounded-full" />
                    </div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">~0.8 Seconds Average Speed</p>
                </div>
            </div>

            {/* Verification Core */}
            <div className="lg:col-span-7">
                <div className="relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-zinc-100 animate-in fade-in duration-300">
                            <div className="relative">
                                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                                <div className="absolute inset-0 w-12 h-12 border-4 border-emerald-100 rounded-full" />
                            </div>
                            <p className="text-sm font-bold text-zinc-900 tracking-tight">กำลังตรวจสอบข้อมูลสลิป...</p>
                        </div>
                    )}

                    {!verificationResult && !error ? (
                        <div className="bg-white border border-zinc-100 rounded-[3rem] p-1 shadow-2xl shadow-emerald-600/5">
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
            </div>

        </div>

        {/* FAQ/Info Section */}
        <div className="mt-32 pt-16 border-t border-zinc-100 grid md:grid-cols-3 gap-12 text-center md:text-left">
            <div>
                <h4 className="font-bold text-zinc-900 mb-3">ต้องใช้อะไรบ้าง?</h4>
                <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                    คุณต้องการเพียงรูปภาพสลิปที่เห็น QR Code ชัดเจน ระบบจะดึงรหัสมาตรวจสอบให้โดยอัตโนมัติ
                </p>
            </div>
            <div>
                <h4 className="font-bold text-zinc-900 mb-3">รองรับธนาคารไหนบ้าง?</h4>
                <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                    ปัจจุบันรองรับสลิปจากทุกธนาคารในไทย โดยใช้ช่องทางตรวจสอบผ่าน KBank Direct Gateway
                </p>
            </div>
            <div>
                <h4 className="font-bold text-zinc-900 mb-3">ปลอดภัยแค่ไหน?</h4>
                <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                    เราใช้การเข้ารหัสระดับ 256-bit และไม่มีการบันทึกภาพสลิปลงในฐานข้อมูลของเราอย่างถาวร
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { 
  CheckCircle2, 
  User, 
  Building2, 
  Calendar, 
  Clock, 
  Fingerprint,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { SlipVerificationResult } from '@/types/slip';
import { formatCurrency } from '@/lib/utils';

interface ResultCardProps {
  result: SlipVerificationResult | null;
  error: string | null;
  onReset: () => void;
}


export const ResultCard: React.FC<ResultCardProps> = ({ result, error, onReset }) => {
  if (error) {
    return (
      <div className="w-full bg-white border border-rose-100 rounded-[2.5rem] p-10 md:p-20 text-center shadow-2xl shadow-rose-600/5">
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-rose-100">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
        </div>
        <h3 className="text-3xl font-black text-zinc-900 mb-3 tracking-tight">ตรวจสอบไม่สำเร็จ</h3>
        <p className="text-zinc-500 font-medium mb-12 max-w-sm mx-auto leading-relaxed">{error}</p>
        <button 
          onClick={onReset}
          className="bg-zinc-900 text-white px-12 py-5 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl active:scale-95"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  if (!result || !result.data) return null;

  const { data } = result;

  return (
    <div className="w-full space-y-8">
      <div className="bg-white border border-zinc-100 rounded-[3rem] overflow-hidden shadow-2xl shadow-emerald-600/5">
        {/* Verified Status Banner */}
        <div className="bg-emerald-600 px-10 py-5 flex items-center justify-between">
           <div className="flex items-center gap-3 text-white">
              <CheckCircle className="w-6 h-6" />
              <span className="font-bold text-sm uppercase tracking-widest">ยืนยันสลิปสำเร็จ</span>
           </div>
           <div className="px-3 py-1 bg-white/20 rounded-full text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm border border-white/10">
              Direct Bank API
           </div>
        </div>

        <div className="p-10 md:p-16">
          {/* Amount Display */}
          <div className="text-center mb-16 relative">
            <div className="absolute top-1/2 left-0 w-full h-px bg-zinc-50 -z-10" />
            <div className="inline-block bg-white px-8">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">จำนวนเงินที่โอนสำเร็จ</p>
                <h2 className="text-6xl md:text-8xl font-black text-zinc-900 tracking-tighter">
                  {formatCurrency(data.amount)}
                </h2>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Parties Section */}
            <div className="space-y-10">
                <div className="relative pl-12">
                    <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center">
                        <User className="w-5 h-5 text-zinc-400" />
                    </div>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-[0.2em] mb-2">ผู้โอนเงิน (Sender)</p>
                    <h4 className="text-xl font-bold text-zinc-900 mb-1">{data.sender.displayName}</h4>
                    <p className="text-[10px] font-bold text-zinc-400 mb-2">{data.sender.name}</p>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{data.sendingBank}</p>
                </div>

                <div className="relative pl-12">
                    <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-zinc-400" />
                    </div>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-[0.2em] mb-2">ผู้รับเงิน (Receiver)</p>
                    <h4 className="text-xl font-bold text-zinc-900 mb-1">{data.receiver.displayName}</h4>
                    <p className="text-[10px] font-bold text-zinc-400 mb-2">{data.receiver.name}</p>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{data.receivingBank}</p>
                </div>
            </div>

            {/* Info Section */}
            <div className="bg-zinc-50/50 rounded-3xl p-8 border border-zinc-100 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-2">วันที่โอน</p>
                        <p className="font-bold text-zinc-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            {data.transDate}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-2">เวลา</p>
                        <p className="font-bold text-zinc-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            {data.transTime}
                        </p>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-3">รหัสอ้างอิงธุรกรรม (Transaction Ref.)</p>
                    <div className="bg-white p-4 rounded-2xl border border-zinc-100 flex items-center justify-between group">
                        <code className="text-sm font-bold text-zinc-600 tracking-wider">{data.transRef}</code>
                        <Fingerprint className="w-5 h-5 text-emerald-100 group-hover:text-emerald-500 transition-colors" />
                    </div>
                </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Footer */}
        <div className="bg-emerald-50/50 p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-emerald-50">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                 <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">ความถูกต้องระดับสูงสุด</p>
                <p className="text-[10px] font-medium text-emerald-600/70">Verified by Slipsure.ai via Secure Bank Gateway</p>
              </div>
           </div>
           
           <button 
             onClick={onReset}
             className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 active:scale-95"
           >
              <RotateCcw className="w-4 h-4" />
              ตรวจสอบสลิปใหม่
           </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <ExternalLink className="w-3 h-3" />
            ต้องการระบบออโต้โอนเงิน? 
        </p>
        <Link href="/pricing" className="text-xs font-bold text-emerald-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
            ดูแผนราคาสำหรับธุรกิจ
        </Link>
      </div>
    </div>
  );
};

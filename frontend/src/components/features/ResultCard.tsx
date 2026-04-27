'use client';

import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  User, 
  Building2, 
  Calendar, 
  Clock, 
  Fingerprint,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { SlipVerificationResult } from '@/types/slip';

interface ResultCardProps {
  result: SlipVerificationResult | null;
  error: string | null;
  onReset: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, error, onReset }) => {
  if (error) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-10 md:p-14 text-center shadow-sm">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">ตรวจสอบไม่สำเร็จ</h3>
        <p className="text-slate-500 font-medium mb-10 max-w-sm mx-auto">{error}</p>
        <button 
          onClick={onReset}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  if (!result || !result.data) return null;

  const { data } = result;

  return (
    <div className="w-full space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Success Banner */}
        <div className="bg-emerald-600 px-8 py-4 flex items-center justify-between">
           <div className="flex items-center gap-2 text-white">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold text-xs uppercase tracking-widest">Verified Success</span>
           </div>
           <span className="text-emerald-100 text-[10px] font-bold uppercase tracking-[0.2em]">Bank API Gateway</span>
        </div>

        <div className="p-8 md:p-12">
          {/* Amount Display */}
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">จำนวนเงินสุทธิ</p>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
              ฿{data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>

          {/* Details Grid */}
          <div className="grid md:grid-cols-2 gap-y-10 gap-x-16 pt-10 border-t border-slate-100">
            <div className="space-y-8">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-3">ผู้โอนเงิน (Sender)</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-none mb-1">{data.sender.displayName}</p>
                    <p className="text-xs font-bold text-blue-600">{data.sendingBank}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-3">ผู้รับเงิน (Receiver)</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-none mb-1">{data.receiver.displayName}</p>
                    <p className="text-xs font-bold text-emerald-600">{data.receivingBank}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">วันที่ทำรายการ</p>
                  <p className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {data.transDate}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">เวลาที่ทำรายการ</p>
                  <p className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {data.transTime}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">หมายเลขอ้างอิง (Ref. ID)</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between group">
                  <p className="font-mono text-sm font-bold text-slate-600 tracking-wider">{data.transRef}</p>
                  <Fingerprint className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Info */}
        <div className="bg-slate-50 border-t border-slate-100 p-6 flex items-center justify-center gap-4">
           <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" />
              Verified by Slipsure.Ai Secure Gateway
           </div>
        </div>
      </div>

      <div className="text-center">
        <button 
          onClick={onReset}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          ตรวจสอบสลิปใบอื่น
        </button>
      </div>
    </div>
  );
};

'use client';

import React from 'react';
import {
  User,
  Building2,
  Calendar,
  Clock,
  RotateCcw,
  AlertTriangle,
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
      <div className="w-full bg-white border border-zinc-200 rounded-2xl p-12 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-6" />
        <h3 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">ตรวจสอบไม่สำเร็จ</h3>
        <p className="text-sm text-zinc-500 mb-8 max-w-sm mx-auto leading-relaxed">{error}</p>
        <button
          onClick={onReset}
          className="border border-zinc-900 text-zinc-900 px-8 py-3 text-sm font-medium hover:bg-zinc-900 hover:text-white transition-colors rounded-full"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  if (!result || !result.data) return null;

  const { data } = result;

  return (
    <div className="w-full space-y-4">
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">

        {/* Status Header */}
        <div className="border-b border-zinc-200 px-8 py-3 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-800 inline-block" />
            <span className="font-mono text-[11px] text-zinc-600 uppercase tracking-widest">VERIFIED — DIRECT BANK API</span>
          </div>
          <span className="font-mono text-[10px] text-zinc-400">{data.transDate} {data.transTime}</span>
        </div>

        <div className="p-8 md:p-12">
          {/* Amount */}
          <div className="mb-10">
            <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2">AMOUNT TRANSFERRED</p>
            <h2 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter">
              {formatCurrency(data.amount)}
            </h2>
          </div>

          {/* Parties */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="border border-zinc-100 p-6">
              <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <User className="w-3 h-3" /> SENDER
              </p>
              <p className="font-bold text-zinc-900">{data.sender.displayName}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{data.sender.name}</p>
              <p className="font-mono text-[10px] text-blue-800 uppercase tracking-widest mt-2">{data.sendingBank}</p>
            </div>
            <div className="border border-zinc-100 p-6">
              <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Building2 className="w-3 h-3" /> RECEIVER
              </p>
              <p className="font-bold text-zinc-900">{data.receiver.displayName}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{data.receiver.name}</p>
              <p className="font-mono text-[10px] text-blue-800 uppercase tracking-widest mt-2">{data.receivingBank}</p>
            </div>
          </div>

          {/* Transaction Ref */}
          <div className="border border-zinc-100 p-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-1">TRANSACTION REF</p>
              <code className="text-sm font-mono font-bold text-zinc-700 tracking-wider">{data.transRef}</code>
            </div>
            <div className="flex items-center gap-4 text-zinc-400 font-mono text-[10px]">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {data.transDate}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {data.transTime}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-8 py-4 flex items-center justify-between bg-zinc-50">
          <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
            Verified by FlowSlip via Bank Gateway
          </p>
          <button
            onClick={onReset}
            className="flex items-center gap-2 border border-zinc-300 text-zinc-600 text-xs font-medium px-4 py-2 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            ตรวจสอบใหม่
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-center">
        <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">ต้องการ API สำหรับธุรกิจ?</p>
        <Link href="/pricing" className="font-mono text-[10px] text-zinc-900 uppercase tracking-widest underline underline-offset-4">
          ดูแผนราคา
        </Link>
      </div>
    </div>
  );
};

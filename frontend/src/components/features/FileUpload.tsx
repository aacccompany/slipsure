'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

interface FileUploadProps {
  onScanSuccess: (file: File) => void;
  onScanError: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onScanSuccess, onScanError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onScanError('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (PNG, JPG)');
      return;
    }
    onScanSuccess(file); 
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-[2rem] p-12 md:p-20
          flex flex-col items-center justify-center text-center 
          transition-all cursor-pointer overflow-hidden
          ${isDragging 
            ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
            : 'border-zinc-200 bg-zinc-50/30 hover:bg-white hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-600/5'}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          accept="image/*"
          className="hidden"
        />

        <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-8 border border-emerald-100 group-hover:scale-110 transition-transform">
          <Upload className="w-10 h-10 text-emerald-600" />
        </div>
        
        <h3 className="text-2xl font-bold text-zinc-900 mb-3">วางรูปสลิปของคุณที่นี่</h3>
        <p className="text-zinc-500 font-medium mb-10 max-w-xs text-sm">
          รองรับไฟล์ PNG, JPG และ JPEG <br/> หรือคลิกเพื่อเลือกไฟล์จากโฟลเดอร์
        </p>
        
        <div className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95">
          เลือกไฟล์รูปภาพ
        </div>

        {/* Decorative corner element */}
        <div className="absolute bottom-0 right-0 p-6 opacity-10">
            <CheckCircle2 className="w-24 h-24 text-emerald-900" />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-4 p-5 bg-white border border-zinc-100 rounded-2xl shadow-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
                <h4 className="font-bold text-zinc-900 text-sm mb-1">ความปลอดภัยสูง</h4>
                <p className="text-xs text-zinc-500 leading-relaxed font-medium">ภาพสลิปจะถูกประมวลผลทันทีและไม่มีการจัดเก็บข้อมูลส่วนตัว</p>
            </div>
        </div>
        <div className="flex items-start gap-4 p-5 bg-white border border-zinc-100 rounded-2xl shadow-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
                <h4 className="font-bold text-zinc-900 text-sm mb-1">แม่นยำ 100%</h4>
                <p className="text-xs text-zinc-500 leading-relaxed font-medium">ยืนยันผลลัพธ์ผ่านระบบ API ตรงจากธนาคารกสิกรไทย</p>
            </div>
        </div>
      </div>
    </div>
  );
};

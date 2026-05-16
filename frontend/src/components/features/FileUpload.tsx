'use client';

import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onScanSuccess: (file: File) => void;
  onScanError: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onScanSuccess, onScanError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
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
    <div className="w-full space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed p-16 md:p-24
          flex flex-col items-center justify-center text-center
          cursor-pointer transition-colors
          rounded-2xl
        ${isDragging
            ? 'border-zinc-900 bg-zinc-50'
            : 'border-zinc-300 hover:border-zinc-500 hover:bg-zinc-50'}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          accept="image/*"
          className="hidden"
        />

        <Upload className="w-8 h-8 text-zinc-400 mb-6" />
        <h3 className="text-base font-bold text-zinc-900 mb-2">วางรูปสลิปของคุณที่นี่</h3>
        <p className="text-sm text-zinc-500 mb-8 max-w-xs">
          รองรับไฟล์ PNG, JPG และ JPEG
        </p>
        <button className="bg-blue-800 text-white text-sm font-medium px-6 py-2.5 hover:bg-blue-900 transition-colors rounded-full">
          เลือกไฟล์รูปภาพ
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'ความปลอดภัยสูง', desc: 'ภาพสลิปประมวลผลทันทีและไม่มีการจัดเก็บ' },
          { label: 'แม่นยำ 100%', desc: 'ยืนยันผ่าน API ตรงจากธนาคาร' },
        ].map((item) => (
          <div key={item.label} className="p-4 border border-zinc-200 bg-white">
            <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-1">{item.label}</p>
            <p className="text-xs text-zinc-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

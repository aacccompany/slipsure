'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { scanQRCode } from '@/lib/qr-scanner';

interface FileUploadProps {
  onScanSuccess: (file: File) => void;
  onScanError: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onScanSuccess, onScanError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onScanError('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (PNG, JPG)');
      return;
    }

    // ส่งไฟล์ไปให้ VerifyPage เพื่อเรียกใช้ verifySlip(file)
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
          relative border-2 border-dashed rounded-xl p-12 md:p-20
          flex flex-col items-center justify-center text-center 
          transition-all cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50/50' 
            : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-300'}
          ${isScanning ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          accept="image/*"
          className="hidden"
        />

        <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <Upload className="w-8 h-8 text-slate-400" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 mb-2">อัปโหลดสลิปโอนเงิน</h3>
        <p className="text-slate-500 font-medium mb-8 max-w-xs">
          วางไฟล์รูปภาพตรงนี้ หรือคลิกเพื่อเลือกไฟล์จากเครื่องของคุณ
        </p>
        
        <div className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all shadow-sm">
          Browse Files
        </div>
      </div>

      <div className="mt-8 flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 font-medium leading-relaxed">
          ความปลอดภัย: ระบบจะประมวลผล QR Code เบื้องต้นภายในเบราว์เซอร์ของท่าน 
          ข้อมูลรูปภาพจะไม่ถูกส่งไปยังฐานข้อมูลโดยไม่จำเป็น
        </p>
      </div>
    </div>
  );
};

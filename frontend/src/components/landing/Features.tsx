'use client';

import React from 'react';

const features = [
  {
    number: '01',
    tag: 'QR Extraction',
    title: 'ดึงข้อมูล QR โดยตรง',
    desc: 'ระบบอ่านค่า EMVCo จาก QR Code ในสลิปโดยตรง ไม่ใช้ OCR ไม่มีการเดา อ่านได้แม้ภาพไม่คมชัด',
  },
  {
    number: '02',
    tag: 'Bank Verify',
    title: 'ยืนยันผ่านธนาคารจริง',
    desc: 'ส่งข้อมูลตรวจสอบผ่าน Bank Gateway ของจริงทุกครั้ง ผลลัพธ์มาจากธนาคาร ไม่ใช่การวิเคราะห์ภาพ',
  },
  {
    number: '03',
    tag: 'Duplicate Detection',
    title: 'ตรวจจับสลิปซ้ำ',
    desc: 'ตรวจสอบรายการซ้ำย้อนหลัง 24 ชั่วโมงอัตโนมัติ ป้องกันการนำสลิปเก่ามาใช้ซ้ำได้ทันที',
  },
];

export const Features = () => {
  return (
    <section style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="max-w-7xl mx-auto">

        {/* Section label — left-aligned, tight */}
        <div
          className="px-6 md:px-12 pt-16 pb-8 flex items-center justify-between"
        >
          <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            ระบบทำงานอย่างไร
          </span>
          <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--border-strong)' }}>
            3 ขั้นตอน
          </span>
        </div>

        {/* Editorial numbered list — not cards */}
        <div className="px-6 md:px-12 pb-16">
          {features.map((f, i) => (
            <div
              key={f.number}
              className="group grid grid-cols-[auto_1fr] gap-8 md:gap-16 py-10 transition-colors"
              style={{
                borderTop: '1px solid var(--border)',
                borderBottom: i === features.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {/* Big ghost number — decorative, not functional */}
              <div
                className="font-bold select-none transition-colors duration-300 w-16 md:w-24"
                style={{
                  fontSize: 'clamp(3rem, 6vw, 5rem)',
                  lineHeight: 1,
                  color: 'var(--border)',
                  letterSpacing: '-0.04em',
                }}
              >
                {f.number}
              </div>

              {/* Content */}
              <div className="py-1">
                <p
                  className="font-mono text-[10px] uppercase tracking-widest mb-2"
                  style={{ color: 'var(--blue)' }}
                >
                  {f.tag}
                </p>
                <h3
                  className="font-bold mb-3 transition-colors duration-200"
                  style={{
                    fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)',
                    color: 'var(--navy)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                  }}
                >
                  {f.title}
                </h3>
                <p className="text-base leading-relaxed max-w-lg" style={{ color: 'var(--text-muted)' }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

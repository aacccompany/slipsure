import React from 'react';
import { Terminal, Code, BookOpen } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-24">
          <h1 className="text-5xl font-bold mb-6 text-zinc-900 tracking-tight">API Documentation</h1>
          <p className="text-zinc-500 text-lg max-w-xl mx-auto font-medium">คู่มือการเชื่อมต่อระบบตรวจสอบสลิปสำหรับนักพัฒนา</p>
        </div>

        <div className="space-y-12">
          <section className="bg-white border border-zinc-100 p-12 rounded-[2rem]">
            <div className="flex items-center gap-3 mb-8 text-zinc-900">
               <Terminal className="w-6 h-6" />
               <h2 className="text-2xl font-bold tracking-tight">Quick Start</h2>
            </div>
            <p className="text-zinc-500 font-medium mb-8 leading-relaxed">
              ส่งรูปภาพสลิปไปยัง Endpoint ของเราเพื่อรับข้อมูลการทำรายการที่ตรวจสอบแล้วจากธนาคาร
            </p>
            <div className="bg-zinc-900 p-6 rounded-2xl">
              <code className="text-zinc-400 text-sm">
                POST /verify-slip <br/>
                Content-Type: multipart/form-data <br/>
                file: [IMAGE_FILE]
              </code>
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border border-zinc-100 p-10 rounded-[2rem]">
               <div className="flex items-center gap-3 mb-6 text-zinc-900">
                  <Code className="w-5 h-5" />
                  <h3 className="text-xl font-bold tracking-tight">REST API</h3>
               </div>
               <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                 เชื่อมต่อผ่าน HTTP Request มาตรฐาน รองรับทุกภาษาโปรแกรม
               </p>
            </div>
            <div className="bg-white border border-zinc-100 p-10 rounded-[2rem]">
               <div className="flex items-center gap-3 mb-6 text-zinc-900">
                  <BookOpen className="w-5 h-5" />
                  <h3 className="text-xl font-bold tracking-tight">Webhooks</h3>
               </div>
               <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                 รับการแจ้งเตือนแบบ Real-time เมื่อมีการทำรายการผ่าน Line OA
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

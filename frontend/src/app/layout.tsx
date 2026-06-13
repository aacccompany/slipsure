import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "FLOWSLIP.Ai - ระบบตรวจสอบสลิปโอนเงินอัตโนมัติด้วย AI",
  description: "FLOWSLIP.Ai บริการเช็กสลิปโอนเงินอัตโนมัติผ่านการทำงานของ AI พร้อมมอบความอุ่นใจให้ธุรกิจของคุณ ป้องกันสลิปปลอม แม่นยำ รวดเร็ว",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">
        <Providers>
          <Navbar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

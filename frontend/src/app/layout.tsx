import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SLIPSURE - ระบบตรวจสอบสลิปโอนเงินอัตโนมัติด้วย AI",
  description: "SLIPSURE บริการเช็กสลิปโอนเงินอัตโนมัติผ่านการทำงานของ AI พร้อมมอบความอุ่นใจให้ธุรกิจของคุณ ป้องกันสลิปปลอม แม่นยำ รวดเร็ว",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <Navbar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Anuphan, Bricolage_Grotesque, IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import Providers from "./providers";

// Latin + numerals come from Plus Jakarta Sans, Thai glyphs from Anuphan
// (the browser falls back per glyph, see --font-sans in globals.css).
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const anuphan = Anuphan({
  subsets: ["thai", "latin"],
  variable: "--font-anuphan",
  display: "swap",
});
// Characterful Latin display face for headlines; Thai glyphs fall back to Anuphan.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

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
    <html lang="th" className={`${jakarta.variable} ${anuphan.variable} ${plexMono.variable} ${bricolage.variable}`}>
      <body className="soft-ui antialiased">
        <Providers>
          <Navbar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة وكلاء محسومة",
  description: "AI Agent Platform — مساعد ذكي قابل للتضمين لكل منتج",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

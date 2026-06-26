import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "스테리케어 대시보드",
  description: "스테리케어 손익 및 원가 분석 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

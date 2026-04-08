import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ISCawards 관리자 콘솔",
  description: "보험사 시상 계산기 관리자 화면",
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

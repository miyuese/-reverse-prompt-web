import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "反推工具",
  description: "面向单人使用的图片反推 Web 工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

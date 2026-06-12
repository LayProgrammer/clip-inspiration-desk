import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "剪辑灵感台",
  description: "上传一堆素材，帮你发现里面能剪成什么故事。",
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

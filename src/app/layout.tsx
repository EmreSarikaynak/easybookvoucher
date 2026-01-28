import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyBook - Voucher Yönetim Sistemi",
  description: "EasyBook Tours Bodrum Voucher Yönetim Sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}

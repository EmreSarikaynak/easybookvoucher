import type { Metadata, Viewport } from "next";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { BackgroundTraffic } from "@/components/BackgroundTraffic";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyBook Voucher",
  description: "EasyBook Tours Bodrum - Voucher ve Tekne Kiralama Sistemi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EasyBook",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0d9488",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="font-sans antialiased">
        {children}
        <InstallPrompt />
        <BackgroundTraffic />
      </body>
    </html>
  );
}

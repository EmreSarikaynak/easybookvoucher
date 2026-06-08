import type { Metadata, Viewport } from "next";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { BackgroundTraffic } from "@/components/BackgroundTraffic";
import "./globals.css";

const SITE_URL = "https://bodrumdayiz.com.tr";
const SITE_NAME = "Bodrumdayız";
const SITE_TITLE = "Bodrumdayız | Bodrum Tekne Turu ve Voucher Rezervasyon Platformu";
const SITE_DESCRIPTION =
  "Bodrumdayız — Bodrum tekne turları için hızlı online voucher ve rezervasyon platformu. Günlük tekne turu, özel tekne kiralama ve acente bilet kesim sistemi.";
const OG_IMAGE = `${SITE_URL}/icons/icon-512x512.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  keywords: [
    "bodrumdayız",
    "bodrumdayiz",
    "bodrum tekne turu",
    "bodrum günlük tekne turu",
    "bodrum tekne kiralama",
    "özel tekne kiralama bodrum",
    "voucher rezervasyon",
    "bilet kesim sistemi",
    "bodrum tatil",
    "bodrum gezi",
    "orak adası tekne turu",
    "easybook tours",
  ],
  authors: [
    { name: "Emre Sarıkaynak", url: "https://secesta.com" },
  ],
  creator: "Emre Sarıkaynak",
  publisher: "Secesta",
  category: "travel",
  classification: "Travel & Tourism",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
    shortcut: "/favicon.svg",
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      "tr-TR": SITE_URL,
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 512,
        height: 512,
        alt: `${SITE_NAME} Logo`,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
    creator: "@secesta",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  referrer: "origin-when-cross-origin",
  verification: {
    google: "aZMX1CBKlRGFzaviDLqS1D8-2-9W3HCpa8t4gv0Fr3w",
  },
  other: {
    "google": "notranslate",
    "format-detection": "telephone=no",
    "ai-content-declaration": "human-authored",
    "GPTBot": "index, follow",
    "ChatGPT-User": "index, follow",
    "ClaudeBot": "index, follow",
    "Claude-Web": "index, follow",
    "PerplexityBot": "index, follow",
    "Google-Extended": "index, follow",
    "Applebot-Extended": "index, follow",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: OG_IMAGE,
        width: 512,
        height: 512,
      },
      sameAs: [],
      founder: {
        "@type": "Person",
        name: "Emre Sarıkaynak",
        url: "https://secesta.com",
        email: "info@secesta.com",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "info@secesta.com",
        contactType: "customer support",
        areaServed: "TR",
        availableLanguage: ["Turkish", "English"],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "tr-TR",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "TravelAgency",
      "@id": `${SITE_URL}/#travelagency`,
      name: SITE_NAME,
      url: SITE_URL,
      image: OG_IMAGE,
      description: SITE_DESCRIPTION,
      priceRange: "₺₺",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bodrum",
        addressRegion: "Muğla",
        addressCountry: "TR",
      },
      areaServed: {
        "@type": "Place",
        name: "Bodrum",
      },
      author: {
        "@type": "Person",
        name: "Emre Sarıkaynak",
        url: "https://secesta.com",
        email: "info@secesta.com",
      },
    },
  ],
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <InstallPrompt />
        <BackgroundTraffic />
      </body>
    </html>
  );
}

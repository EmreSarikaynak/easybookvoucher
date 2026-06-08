"use client";

import { useState } from "react";
import { QrCode, Copy, Check, Download } from "lucide-react";

interface AgencyQrCardProps {
  agencyCode: string;
  catalogUrl: string;
  qrDataUrl: string;
}

export function AgencyQrCard({ agencyCode, catalogUrl, qrDataUrl }: AgencyQrCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sessizce yut
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-katalog-${agencyCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 border border-blue-200 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-2 mb-3">
        <div className="rounded-lg bg-blue-600 p-1.5">
          <QrCode className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
            Online Katalog QR Kod
          </h3>
          <p className="text-xs text-gray-500">
            Müşteriler tarayınca direkt rezervasyon sayfanıza gider.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
        <div className="bg-white border rounded-lg p-2 shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={`QR ${agencyCode}`} className="w-36 h-36 sm:w-40 sm:h-40" />
        </div>

        <div className="flex-1 w-full space-y-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
              Katalog URL
            </p>
            <p className="text-xs sm:text-sm font-mono break-all bg-white border rounded px-2 py-1 mt-1">
              {catalogUrl}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              type="button"
              className="flex items-center gap-1 text-xs font-medium bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md transition"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-600" /> Kopyalandı
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Linki Kopyala
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              type="button"
              className="flex items-center gap-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-md transition"
            >
              <Download className="h-3.5 w-3.5" /> QR İndir
            </button>
          </div>

          <p className="text-[11px] text-gray-400">
            Acente Kodu: <span className="font-mono">{agencyCode}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

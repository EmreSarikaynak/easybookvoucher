"use client";

import { useState } from "react";
import { Download, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

export interface TourCostRowForPdf {
  tourName: string;
  costAdultEur: number;
  costChildEur: number;
  costAdultTry: number;
  costChildTry: number;
  isCustom: boolean;
}

interface TourCostsPdfActionsProps {
  rows: TourCostRowForPdf[];
  agencyName?: string | null;
  agencyPhone?: string | null;
}

function generateTourCostsPdf(
  rows: TourCostRowForPdf[],
  agencyName?: string | null
): jsPDF {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = 14;
  const contentW = pageW - margin * 2;

  // Header bar
  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 0, pageW, 26, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  pdf.text("EasyBook Tours", margin, 11);

  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("Tur Maliyetleri Raporu", margin, 19);

  const today = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  pdf.text(today, pageW - margin, 19, { align: "right" });

  let y = 34;

  if (agencyName) {
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(agencyName, margin, y);
    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(110, 110, 110);
    pdf.text("Acenteye Ozel Fiyat Listesi", margin, y);
    y += 9;
  }

  // Column positions (right-aligned for numbers)
  const col1x = margin; // Tour name start
  const col1max = margin + contentW * 0.52; // Tour name end
  const col2x = margin + contentW * 0.63; // EUR Yet
  const col3x = margin + contentW * 0.74; // EUR Coc
  const col4x = margin + contentW * 0.87; // TL Yet
  const col5x = margin + contentW; // TL Coc

  const rowH = 7;

  // Table header
  pdf.setFillColor(37, 99, 235);
  pdf.rect(margin, y, contentW, rowH + 1, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("Tur Adi", col1x + 2, y + 5);
  pdf.text("EUR Yet", col2x, y + 5, { align: "right" });
  pdf.text("EUR Coc", col3x, y + 5, { align: "right" });
  pdf.text("TL Yet", col4x, y + 5, { align: "right" });
  pdf.text("TL Coc", col5x, y + 5, { align: "right" });

  y += rowH + 1;

  rows.forEach((row, i) => {
    if (y > 272) {
      pdf.addPage();
      y = 14;

      // Repeat header on new page
      pdf.setFillColor(37, 99, 235);
      pdf.rect(margin, y, contentW, rowH + 1, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "bold");
      pdf.text("Tur Adi", col1x + 2, y + 5);
      pdf.text("EUR Yet", col2x, y + 5, { align: "right" });
      pdf.text("EUR Coc", col3x, y + 5, { align: "right" });
      pdf.text("TL Yet", col4x, y + 5, { align: "right" });
      pdf.text("TL Coc", col5x, y + 5, { align: "right" });
      y += rowH + 1;
    }

    // Alternating row background
    if (i % 2 === 0) {
      pdf.setFillColor(247, 249, 253);
      pdf.rect(margin, y, contentW, rowH, "F");
    }

    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");

    // Truncate long tour names
    let name = row.tourName;
    const maxW = col1max - col1x - 3;
    while (pdf.getTextWidth(name) > maxW && name.length > 3) {
      name = name.slice(0, -1);
    }
    if (name !== row.tourName) name += "..";

    pdf.setTextColor(30, 30, 30);
    if (row.isCustom) pdf.setFont("helvetica", "bold");
    pdf.text(name, col1x + 2, y + 4.8);
    pdf.setFont("helvetica", "normal");

    // EUR prices (blue)
    pdf.setTextColor(37, 99, 235);
    pdf.text(`${Math.round(row.costAdultEur)} EUR`, col2x, y + 4.8, {
      align: "right",
    });
    pdf.setTextColor(96, 165, 250);
    pdf.text(`${Math.round(row.costChildEur)} EUR`, col3x, y + 4.8, {
      align: "right",
    });

    // TL prices (gray)
    pdf.setTextColor(80, 80, 80);
    pdf.text(`${Math.round(row.costAdultTry)} TL`, col4x, y + 4.8, {
      align: "right",
    });
    pdf.setTextColor(130, 130, 130);
    pdf.text(`${Math.round(row.costChildTry)} TL`, col5x, y + 4.8, {
      align: "right",
    });

    // Row bottom border (subtle)
    pdf.setDrawColor(220, 225, 235);
    pdf.line(margin, y + rowH, margin + contentW, y + rowH);

    y += rowH;
  });

  // Footer
  y += 6;
  pdf.setDrawColor(180, 180, 200);
  pdf.line(margin, y, pageW - margin, y);
  y += 5;
  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(7);
  pdf.text(
    "Bu belge EasyBook Tours tarafından otomatik oluşturulmuştur.",
    margin,
    y
  );
  pdf.text(`${rows.length} tur listelendi`, pageW - margin, y, {
    align: "right",
  });

  return pdf;
}

export function TourCostsPdfActions({
  rows,
  agencyName,
  agencyPhone,
}: TourCostsPdfActionsProps) {
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const pdf = generateTourCostsPdf(rows, agencyName);
      const date = new Date()
        .toLocaleDateString("tr-TR")
        .replace(/\./g, "-");
      pdf.save(`tur-maliyetleri-${date}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!agencyPhone) {
      setMessage({
        type: "error",
        text: "Acente telefon numarası bulunamadı",
      });
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const pdf = generateTourCostsPdf(rows, agencyName);
      const blob = pdf.output("blob");
      const date = new Date()
        .toLocaleDateString("tr-TR")
        .replace(/\./g, "-");
      const file = new File([blob], `tur-maliyetleri-${date}.pdf`, {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("phone", agencyPhone);
      formData.append("agencyName", agencyName || "");

      const res = await fetch("/api/tour-costs/send-whatsapp", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error || "Gönderilemedi" });
      } else {
        setMessage({ type: "success", text: "WhatsApp mesajı gönderildi ✓" });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch {
      setMessage({ type: "error", text: "Bağlantı hatası" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading || rows.length === 0}
        >
          {downloading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-4 w-4" />
          )}
          PDF İndir
        </Button>

        {agencyPhone && (
          <Button
            size="sm"
            onClick={handleSendWhatsApp}
            disabled={sending || rows.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {sending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="mr-1.5 h-4 w-4" />
            )}
            WhatsApp&apos;a Gönder
          </Button>
        )}
      </div>

      {message && (
        <p
          className={`text-xs ${
            message.type === "success" ? "text-green-600" : "text-red-500"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

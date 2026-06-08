import Link from "next/link";
import { Megaphone, ChevronRight } from "lucide-react";
import { listActiveAnnouncements } from "@/app/actions/announcements";
import { whatsappMarkdownToPlain } from "@/lib/whatsapp-markdown";
import type { UserRole } from "@/lib/types";

interface AnnouncementMarqueeProps {
  role?: UserRole | null;
}

export async function AnnouncementMarquee({
  role,
}: AnnouncementMarqueeProps) {
  const announcements = await listActiveAnnouncements(role ?? null);
  if (announcements.length === 0) return null;

  // Tek satır kayan yazıda biçim etiketleri görünmemeli; düz metne çevir
  // ve newline'ları tek boşluğa indir.
  const items = announcements.map(
    (a) =>
      `${whatsappMarkdownToPlain(a.title)} — ${whatsappMarkdownToPlain(
        a.message
      ).replace(/\s*\n+\s*/g, " ")}`
  );
  // Tekrarlama: kayan animasyon kesintisiz olsun diye 2 kez duplike ediyoruz
  const trackItems = [...items, ...items];

  const totalLen = items.join("").length;
  const durationSec = Math.min(26, Math.max(10, Math.round(totalLen * 0.022)));
  const durationMobileSec = Math.max(6, Math.round(durationSec * 0.55));

  return (
    <Link
      href="/announcements"
      aria-label="Tüm duyuruları görüntüle"
      className="group relative block overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
    >
      <div className="flex items-center">
        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-500 text-white shrink-0">
          <Megaphone className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Duyuru
          </span>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div
            className="flex animate-marquee whitespace-nowrap py-2.5"
            style={
              {
                "--marquee-d": `${durationSec}s`,
                "--marquee-d-mobile": `${durationMobileSec}s`,
              } as React.CSSProperties
            }
          >
            {trackItems.map((text, i) => (
              <span
                key={i}
                className="mx-6 text-sm font-medium text-amber-900 inline-flex items-center gap-2"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                {text}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-amber-700 shrink-0 transition group-hover:text-amber-900">
          Detay
          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

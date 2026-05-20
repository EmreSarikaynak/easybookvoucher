import { Megaphone } from "lucide-react";
import { listActiveAnnouncements } from "@/app/actions/announcements";
import type { UserRole } from "@/lib/types";

interface AnnouncementMarqueeProps {
  role?: UserRole | null;
}

export async function AnnouncementMarquee({
  role,
}: AnnouncementMarqueeProps) {
  const announcements = await listActiveAnnouncements(role ?? null);
  if (announcements.length === 0) return null;

  const items = announcements.map((a) => `${a.title} — ${a.message}`);
  // Tekrarlama: kayan animasyon kesintisiz olsun diye 2 kez duplike ediyoruz
  const trackItems = [...items, ...items];

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 shadow-sm">
      <div className="flex items-center">
        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-500 text-white shrink-0">
          <Megaphone className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Duyuru
          </span>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap py-2.5">
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
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Megaphone, Clock, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormattedWhatsAppText } from "@/components/ui/formatted-whatsapp-text";
import { listActiveAnnouncements, type Announcement } from "@/app/actions/announcements";
import type { UserRole } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  agency_admin: "Acente Yöneticileri",
  sales: "Satış Temsilcileri",
  admin: "Adminler",
  super_admin: "Süper Adminler",
};

function formatRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Süresi doldu";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} dk kaldı`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat kaldı`;
  return `${Math.floor(hours / 24)} gün kaldı`;
}

interface AnnouncementsViewProps {
  role: UserRole | null;
}

export function AnnouncementsView({ role }: AnnouncementsViewProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listActiveAnnouncements(role).then((data) => {
      setAnnouncements(data);
      setLoading(false);
    });
  }, [role]);

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50/40 px-6 py-8 shadow-sm">
        <div className="relative z-10 max-w-xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-900">
            <Megaphone className="h-3.5 w-3.5" />
            Güncel duyurular
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-amber-950 sm:text-3xl">
            Duyurular
          </h1>
          <p className="mt-2 text-sm text-amber-900/80 sm:text-base">
            Size yönelik aktif duyurular. Dashboard üstündeki kayan yazıda da
            görünür; kalın ve vurgulu kısımlar burada da aynı şekilde gösterilir.
          </p>
        </div>
        <Megaphone
          className="pointer-events-none absolute -right-4 -bottom-4 h-32 w-32 text-amber-500/10 sm:h-40 sm:w-40"
          aria-hidden
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-5 w-2/3 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-4/5 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium">Şu an aktif duyuru yok</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Yeni bir duyuru yayımlandığında burada ve dashboard kayan yazısında
              görünecektir.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {announcements.map((a, index) => (
            <Card
              key={a.id}
              className="overflow-hidden border-amber-100/80 shadow-sm transition hover:shadow-md"
            >
              <div
                className={`h-1 ${
                  index === 0
                    ? "bg-gradient-to-r from-amber-500 to-orange-400"
                    : "bg-gradient-to-r from-amber-300 to-amber-400"
                }`}
              />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg leading-snug">{a.title}</CardTitle>
                  <Badge
                    variant="outline"
                    className="shrink-0 gap-1 border-amber-200 bg-amber-50 text-amber-900"
                  >
                    <Clock className="h-3 w-3" />
                    {formatRemaining(a.expires_at)}
                  </Badge>
                </div>
                {a.target_role && (
                  <p className="text-xs text-muted-foreground">
                    Hedef: {ROLE_LABEL[a.target_role] ?? a.target_role}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <FormattedWhatsAppText text={a.message} />
                <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

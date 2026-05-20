"use client";

import { useEffect, useState } from "react";
import { Megaphone, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-7 w-7 text-primary" />
          Duyurular
        </h1>
        <p className="text-muted-foreground mt-1">
          Size yönelik güncel duyurular. Dashboard üstündeki kayan yazıda da görünür.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Şu an görüntülenecek aktif duyuru yok.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{a.title}</CardTitle>
                  <Badge variant="secondary" className="shrink-0 gap-1">
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
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  {new Date(a.created_at).toLocaleString("tr-TR")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { Megaphone, Send, Trash2, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAllAnnouncements,
  type Announcement,
} from "@/app/actions/announcements";

const DURATION_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 15, label: "15 dakika" },
  { value: 60, label: "1 saat" },
  { value: 60 * 6, label: "6 saat" },
  { value: 60 * 24, label: "1 gün" },
  { value: 60 * 24 * 3, label: "3 gün" },
  { value: 60 * 24 * 7, label: "1 hafta" },
  { value: 60 * 24 * 30, label: "1 ay" },
];

function formatRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Süresi doldu";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} dk kaldı`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat kaldı`;
  const days = Math.floor(hours / 24);
  return `${days} gün kaldı`;
}

const ROLE_LABEL: Record<string, string> = {
  agency_admin: "Acente Yöneticileri",
  sales: "Satış Temsilcileri",
  admin: "Adminler",
  super_admin: "Süper Adminler",
};

export function AnnouncementsManager() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [durationMinutes, setDurationMinutes] = useState(60 * 24);
  const [sendPush, setSendPush] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const refresh = async () => {
    setLoading(true);
    const data = await listAllAnnouncements();
    setAnnouncements(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setResult("❌ Başlık ve mesaj zorunludur.");
      return;
    }
    setSending(true);
    setResult(null);

    const res = await createAnnouncement({
      title: title.trim(),
      message: message.trim(),
      targetRole: targetRole === "all" ? null : targetRole,
      durationMinutes,
      sendPush,
    });

    if (res.success) {
      const pushInfo =
        sendPush && typeof res.pushSent === "number"
          ? ` (${res.pushSent} kişiye push)`
          : "";
      setResult(`✅ Duyuru yayımlandı${pushInfo}`);
      setTitle("");
      setMessage("");
      await refresh();
      setTimeout(() => setResult(null), 5000);
    } else {
      setResult(`❌ ${res.error || "Beklenmeyen hata"}`);
    }
    setSending(false);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteAnnouncement(id);
      if (res.success) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      }
    });
  };

  const activeOnes = announcements.filter(
    (a) => new Date(a.expires_at).getTime() > Date.now()
  );
  const expiredOnes = announcements.filter(
    (a) => new Date(a.expires_at).getTime() <= Date.now()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          Duyuru Yönetimi
        </CardTitle>
        <CardDescription>
          Acentelere ve kullanıcılara kayan yazı + push bildirim olarak duyuru gönderin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Yeni duyuru formu */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Başlık</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Önemli duyuru"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Mesaj</Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Acentelerimize özel kampanya başladı..."
              maxLength={300}
              rows={3}
              className="flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Hedef Kitle</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Herkes</SelectItem>
                  <SelectItem value="agency_admin">
                    Acente Yöneticileri
                  </SelectItem>
                  <SelectItem value="sales">Satış Temsilcileri</SelectItem>
                  <SelectItem value="admin">Adminler</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Geçerlilik Süresi</Label>
              <Select
                value={String(durationMinutes)}
                onValueChange={(v) => setDurationMinutes(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendPush}
              onChange={(e) => setSendPush(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span>Bildirim olarak da gönder (zil sesli push)</span>
          </label>

          <Button onClick={handleSend} disabled={sending} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Yayımlanıyor..." : "Duyuru Yayımla"}
          </Button>

          {result && <p className="text-sm">{result}</p>}
        </div>

        {/* Aktif duyurular listesi */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Aktif Duyurular {activeOnes.length > 0 && `(${activeOnes.length})`}
          </h3>

          {loading ? (
            <p className="text-xs text-muted-foreground">Yükleniyor...</p>
          ) : activeOnes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Şu an aktif duyuru yok.
            </p>
          ) : (
            <div className="space-y-2">
              {activeOnes.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border bg-card p-3 flex items-start gap-3"
                >
                  <Megaphone className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{a.title}</p>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                        Aktif
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">
                      {a.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRemaining(a.expires_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {a.target_role
                          ? ROLE_LABEL[a.target_role] ?? a.target_role
                          : "Herkes"}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => handleDelete(a.id)}
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Geçmiş duyurular */}
        {expiredOnes.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Geçmiş duyurular ({expiredOnes.length})
            </summary>
            <div className="mt-2 space-y-1">
              {expiredOnes.slice(0, 10).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/50"
                >
                  <span className="truncate">
                    <span className="font-medium">{a.title}</span>
                    <span className="text-muted-foreground"> — {a.message}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive shrink-0"
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Megaphone,
  Send,
  Trash2,
  Clock,
  Users,
  Bell,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { WhatsAppEditor } from "@/components/ui/whatsapp-editor";
import { FormattedWhatsAppText } from "@/components/ui/formatted-whatsapp-text";
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
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
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
      sendWhatsApp,
    });

    if (res.success) {
      const parts: string[] = [];
      if (sendPush && typeof res.pushSent === "number") {
        parts.push(`${res.pushSent} kişiye push`);
      }
      if (sendWhatsApp && res.whatsapp) {
        parts.push(
          `WhatsApp: ${res.whatsapp.sent}/${res.whatsapp.attempted}` +
            (res.whatsapp.failed > 0 ? ` (${res.whatsapp.failed} başarısız)` : "")
        );
      }
      const detail = parts.length > 0 ? ` (${parts.join(" · ")})` : "";
      setResult(`✅ Duyuru yayımlandı${detail}`);
      setTitle("");
      setMessage("");
      await refresh();
      setTimeout(() => setResult(null), 6000);
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      {/* Yeni duyuru formu */}
      <Card className="border-amber-200/60 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-amber-50/80 via-yellow-50/50 to-transparent pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Yeni Duyuru</CardTitle>
              <CardDescription className="mt-1">
                Kayan yazı, push ve isteğe bağlı WhatsApp. Mesajda{" "}
                <code className="rounded bg-muted px-1 text-[11px]">**kalın**</code>{" "}
                kullanın; duyuru ve WhatsApp&apos;ta aynı görünür.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-2">
            <Label htmlFor="announcement-title">Başlık</Label>
            <Input
              id="announcement-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Önemli duyuru"
              className="text-base"
            />
            <p className="text-[11px] text-muted-foreground">
              WhatsApp&apos;ta başlık otomatik kalın gönderilir.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcement-message">Mesaj</Label>
            <WhatsAppEditor
              id="announcement-message"
              value={message}
              onChange={setMessage}
              placeholder="Acentelerimize özel **kampanya** başladı. Detaylar için panele girin."
              rows={6}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Hedef kitle</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Herkes</SelectItem>
                  <SelectItem value="agency_admin">Acente Yöneticileri</SelectItem>
                  <SelectItem value="sales">Satış Temsilcileri</SelectItem>
                  <SelectItem value="admin">Adminler</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Geçerlilik süresi</Label>
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

          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={sendPush}
                onChange={(e) => setSendPush(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-amber-600"
              />
              <Bell className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Bildirim olarak da gönder (zil sesli push)</span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-amber-600"
              />
              <MessageCircle className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                WhatsApp ile de gönder
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Hedef role bağlı kayıtlı numaralara. 24 saat penceresi dışındaki
                  numaralarda teslim edilemeyebilir.
                </span>
              </span>
            </label>
          </div>

          <Button
            onClick={handleSend}
            disabled={sending}
            size="lg"
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Yayımlanıyor..." : "Duyuru Yayımla"}
          </Button>

          {result && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                result.startsWith("✅")
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {result}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Aktif / geçmiş liste */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-amber-600" />
              Aktif duyurular
              {activeOnes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeOnes.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            ) : activeOnes.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center">
                <Megaphone className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Şu an yayında duyuru yok.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOnes.map((a) => (
                  <AnnouncementListItem
                    key={a.id}
                    announcement={a}
                    active
                    onDelete={() => handleDelete(a.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {expiredOnes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Geçmiş ({expiredOnes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {expiredOnes.slice(0, 8).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.message.replace(/\*\*/g, "").slice(0, 80)}
                      {a.message.length > 80 ? "…" : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive"
                    onClick={() => handleDelete(a.id)}
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function AnnouncementListItem({
  announcement: a,
  active,
  onDelete,
}: {
  announcement: Announcement;
  active?: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <Megaphone className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-sm">{a.title}</p>
            {active && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">
                Yayında
              </Badge>
            )}
          </div>
          <FormattedWhatsAppText
            text={a.message}
            className="mt-1.5 text-muted-foreground"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRemaining(a.expires_at)}
            </span>
            <span className="inline-flex items-center gap-1">
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
          className="h-8 w-8 shrink-0 text-destructive opacity-70 group-hover:opacity-100"
          onClick={onDelete}
          title="Sil"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

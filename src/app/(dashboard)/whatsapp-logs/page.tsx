"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  RefreshCw,
  Send,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { WhatsAppLog, Profile } from "@/lib/types";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { resendVoucherWhatsApp } from "@/app/actions/voucher";
import {
  describeWhatsAppStatus,
  explainWhatsAppError,
  type WhatsAppStatusTone,
} from "@/lib/whatsapp-status";

const RESENDABLE_STATUSES = new Set(["failed", "undelivered", "queued", "sent"]);
const AUTO_REFRESH_MS = 4000;

const toneClasses: Record<WhatsAppStatusTone, string> = {
  success: "bg-green-100 text-green-800 border-green-200",
  progress: "bg-blue-100 text-blue-800 border-blue-200",
  error: "bg-red-100 text-red-800 border-red-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function WhatsAppLogsPage() {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  // Sadece "Tekrar Gönder" sonrası kısa süre otomatik güncelle — sürekli değil.
  const [autoUpdating, setAutoUpdating] = useState(false);

  // Tekrar gönder dialog state
  const [resendTarget, setResendTarget] = useState<WhatsAppLog | null>(null);
  const [resendPhone, setResendPhone] = useState("");
  const [resending, setResending] = useState(false);

  // Filtre + arama
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "progress" | "error">("all");

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("whatsapp_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Logs fetch error:", error);
    } else {
      setLogs((data as WhatsAppLog[]) || []);
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // "Tekrar Gönder" sonrası ~40 sn boyunca 4 saniyede bir sessizce güncelle
  // (Twilio durum geri bildirimi gelsin). Süre dolunca kendiliğinden durur.
  useEffect(() => {
    if (!autoUpdating) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchLogs(true);
    }, AUTO_REFRESH_MS);
    const stop = setTimeout(() => setAutoUpdating(false), 40000);
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [autoUpdating, fetchLogs]);

  // Load profile (for admin check) once
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data as Profile | null);
    })();
  }, []);

  const isAdmin = profile?.role === "super_admin" || profile?.role === "admin";

  const counts = useMemo(() => {
    let success = 0;
    let progress = 0;
    let error = 0;
    for (const l of logs) {
      const tone = describeWhatsAppStatus(l.status).tone;
      if (tone === "success") success++;
      else if (tone === "progress") progress++;
      else if (tone === "error") error++;
    }
    return { total: logs.length, success, progress, error };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (statusFilter !== "all" && describeWhatsAppStatus(log.status).tone !== statusFilter) {
        return false;
      }
      if (q) {
        const hay = `${log.phone_number} ${log.voucher_no ?? ""} ${log.body ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, statusFilter]);

  const openResend = (log: WhatsAppLog) => {
    setResendTarget(log);
    setResendPhone("");
    setFeedback(null);
  };

  const confirmResend = async () => {
    const log = resendTarget;
    if (!log?.voucher_no) {
      setFeedback({ kind: "error", text: "Bu kayıtta bilet numarası yok, yeniden gönderilemez" });
      setResendTarget(null);
      return;
    }
    setResending(true);
    try {
      const res = await resendVoucherWhatsApp(log.voucher_no, {
        customerPhoneOverride: resendPhone.trim() || null,
      });
      if (res.error) {
        setFeedback({ kind: "error", text: res.error });
      } else {
        const sent = res.sent ?? 0;
        const failed = res.failed ?? 0;
        const text =
          failed > 0
            ? `${log.voucher_no}: ${sent} alıcıya gönderildi, ${failed} başarısız`
            : `${log.voucher_no}: tüm alıcılara (${sent}) tekrar gönderildi`;
        setFeedback({ kind: failed > 0 ? "error" : "success", text });
      }
      setResendTarget(null);
      // Hemen yenile + kısa süre (40 sn) durum güncellemesi için otomatik yenile.
      await fetchLogs(true);
      setAutoUpdating(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            WhatsApp Mesaj Geçmişi
          </h1>
          <p className="text-muted-foreground">Gönderilen ve alınan son 100 mesaj</p>
        </div>
        <div className="flex items-center gap-3">
          {autoUpdating && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Durumlar güncelleniyor…
            </span>
          )}
          <Button variant="outline" onClick={() => fetchLogs()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-md p-3 text-sm ${
            feedback.kind === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Özet + durum filtresi + arama */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          { key: "all", label: "Tümü", n: counts.total, active: "bg-slate-800 text-white border-slate-800", dot: "" },
          { key: "success", label: "Başarılı", n: counts.success, active: "bg-green-600 text-white border-green-600", dot: "bg-green-500" },
          { key: "progress", label: "Bekliyor", n: counts.progress, active: "bg-blue-600 text-white border-blue-600", dot: "bg-blue-500" },
          { key: "error", label: "Başarısız", n: counts.error, active: "bg-red-600 text-white border-red-600", dot: "bg-red-500" },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.key
                ? f.active
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.dot && <span className={`h-2 w-2 rounded-full ${f.dot}`} />}
            {f.label}
            <span
              className={`rounded-full px-1.5 text-xs ${
                statusFilter === f.key ? "bg-white/25" : "bg-slate-100 text-slate-600"
              }`}
            >
              {f.n}
            </span>
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Numara, bilet no veya mesaj ara…"
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih</TableHead>
              <TableHead>Yön</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Bilet No</TableHead>
              <TableHead>Mesaj (Özet)</TableHead>
              <TableHead>Durum</TableHead>
              {isAdmin && <TableHead className="text-right">İşlem</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-10 text-muted-foreground">
                  {logs.length === 0 ? "Kayıt bulunamadı." : "Filtreye uygun kayıt yok."}
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const canResend =
                  isAdmin &&
                  log.direction === "outbound" &&
                  !!log.voucher_no &&
                  RESENDABLE_STATUSES.has(log.status);
                const statusInfo = describeWhatsAppStatus(log.status);
                const errorHint = explainWhatsAppError(log.error_message);
                const isInbound = log.direction === "inbound";
                const preview =
                  (log.body || "").split("\n").find((l) => l.trim()) || log.body || "";
                return (
                  <TableRow
                    key={log.id}
                    className={statusInfo.tone === "error" ? "bg-red-50/50" : undefined}
                  >
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {format(new Date(log.created_at), "dd MMM HH:mm", { locale: tr })}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          isInbound ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {isInbound ? (
                          <ArrowDownLeft className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {isInbound ? "Gelen" : "Giden"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {log.phone_number}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.voucher_no || "-"}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate text-sm" title={log.body}>
                        {preview}
                      </div>
                      {log.error_message && (
                        <div className="mt-1 text-xs text-red-600">
                          {errorHint ? (
                            <span title={log.error_message}>⚠ {errorHint}</span>
                          ) : (
                            <span className="truncate" title={log.error_message}>
                              Hata: {log.error_message}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={toneClasses[statusInfo.tone]}>{statusInfo.label}</Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {canResend ? (
                          <Button size="sm" variant="outline" onClick={() => openResend(log)}>
                            <Send className="mr-1 h-3 w-3" />
                            Tekrar Gönder
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Tekrar Gönder dialog — numara düzeltme imkânıyla */}
      <Dialog open={!!resendTarget} onOpenChange={(open) => !open && setResendTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tekrar Gönder</DialogTitle>
            <DialogDescription>
              {resendTarget?.voucher_no} biletini tüm alıcılara (müşteri, admin, acente)
              yeniden gönderir. Müşteri numarası yanlış girildiyse aşağıdan düzeltebilirsiniz —
              düzeltilen numara bilete kalıcı olarak kaydedilir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Müşteri telefonu (düzeltmek için)</Label>
            <Input
              value={resendPhone}
              onChange={(e) => setResendPhone(e.target.value)}
              placeholder="Boş bırakırsanız mevcut numara kullanılır"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendTarget(null)} disabled={resending}>
              İptal
            </Button>
            <Button onClick={confirmResend} disabled={resending}>
              {resending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

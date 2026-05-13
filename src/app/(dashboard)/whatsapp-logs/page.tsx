"use client";

import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw, Send, Loader2 } from "lucide-react";
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
import { resendVoucherWhatsApp } from "@/app/actions/voucher";

const RESENDABLE_STATUSES = new Set([
  "failed",
  "undelivered",
  "queued",
]);

export default function WhatsAppLogsPage() {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resendingFor, setResendingFor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

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

  const handleResend = async (log: WhatsAppLog) => {
    if (!log.voucher_no) {
      setFeedback({ kind: "error", text: "Bu kayıtta bilet numarası yok, yeniden gönderilemez" });
      return;
    }
    setResendingFor(log.id);
    setFeedback(null);
    try {
      const res = await resendVoucherWhatsApp(log.voucher_no);
      if (res.error) {
        setFeedback({ kind: "error", text: res.error });
      } else {
        const sent = res.sent ?? 0;
        const failed = res.failed ?? 0;
        const text =
          failed > 0
            ? `${log.voucher_no}: ${sent} gönderildi, ${failed} başarısız`
            : `${log.voucher_no}: tüm alıcılara (${sent}) tekrar gönderildi`;
        setFeedback({ kind: failed > 0 ? "error" : "success", text });
        await fetchLogs();
      }
    } finally {
      setResendingFor(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
      case "read":
        return <Badge className="bg-green-100 text-green-800 border-green-200">{status}</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">{status}</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 border-red-200">{status}</Badge>;
      case "received":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDirectionIcon = (direction: string) => {
    if (direction === "inbound") {
      return <span className="text-purple-600 font-medium">Gelen</span>;
    }
    return <span className="text-blue-600 font-medium">Giden</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            WhatsApp Mesaj Geçmişi
          </h1>
          <p className="text-muted-foreground">Gönderilen ve alınan son 100 mesaj</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
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

      <div className="rounded-md border bg-white shadow-sm">
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
            {logs.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const canResend =
                  isAdmin &&
                  log.direction === "outbound" &&
                  log.voucher_no &&
                  RESENDABLE_STATUSES.has(log.status);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), "dd MMM HH:mm", { locale: tr })}
                    </TableCell>
                    <TableCell>{getDirectionIcon(log.direction)}</TableCell>
                    <TableCell>{log.phone_number}</TableCell>
                    <TableCell>{log.voucher_no || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate" title={log.body}>
                      {log.body}
                      {log.error_message && (
                        <div className="text-xs text-red-500 mt-1 truncate" title={log.error_message}>
                          Hata: {log.error_message}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {canResend ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resendingFor === log.id}
                            onClick={() => handleResend(log)}
                          >
                            {resendingFor === log.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="mr-1 h-3 w-3" />
                            )}
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
    </div>
  );
}

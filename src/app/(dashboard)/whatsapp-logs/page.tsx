"use client";

import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { WhatsAppLog } from "@/lib/types";
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

export default function WhatsAppLogsPage() {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  replyToTicket,
  updateTicketStatus,
  closeSupportTicket,
} from "@/app/actions/support";
import type { SupportTicket, SupportTicketStatus } from "@/lib/types";
import {
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_COLORS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_PRIORITY_COLORS,
} from "@/lib/types";

interface TicketDetailDialogProps {
  ticket: SupportTicket | null;
  isAdmin: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function TicketDetailDialog({
  ticket,
  isAdmin,
  onClose,
  onUpdated,
}: TicketDetailDialogProps) {
  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] = useState<SupportTicketStatus>(
    "in_progress"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ticket) return null;

  const isClosed =
    ticket.status === "closed" || ticket.status === "resolved";

  const handleReply = async () => {
    if (!reply.trim()) {
      setError("Cevap boş olamaz.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await replyToTicket(ticket.id, reply, replyStatus);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setReply("");
      onUpdated();
    }
  };

  const handleStatusChange = async (status: SupportTicketStatus) => {
    setLoading(true);
    await updateTicketStatus(ticket.id, status);
    setLoading(false);
    onUpdated();
  };

  const handleClose = async () => {
    setLoading(true);
    await closeSupportTicket(ticket.id);
    setLoading(false);
    onUpdated();
  };

  return (
    <Dialog open={!!ticket} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base pr-6">{ticket.subject}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap gap-2 items-center">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                SUPPORT_STATUS_COLORS[ticket.status]
              )}
            >
              {SUPPORT_STATUS_LABELS[ticket.status]}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                SUPPORT_PRIORITY_COLORS[ticket.priority]
              )}
            >
              {SUPPORT_PRIORITY_LABELS[ticket.priority]}
            </span>
            {ticket.user && (
              <span className="text-xs text-muted-foreground">
                {ticket.user.full_name}
                {ticket.agency && ` — ${ticket.agency.name}`}
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {format(new Date(ticket.created_at), "dd MMM yyyy HH:mm", {
                locale: tr,
              })}
            </span>
          </div>

          {/* Message */}
          <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
            {ticket.message}
          </div>

          {/* Admin reply (if any) */}
          {ticket.admin_reply && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm">
              <p className="text-xs font-semibold text-green-700 mb-1">
                Cevap
                {ticket.replied_by_profile &&
                  ` — ${ticket.replied_by_profile.full_name}`}
                {ticket.replied_at &&
                  ` · ${format(new Date(ticket.replied_at), "dd MMM yyyy HH:mm", { locale: tr })}`}
              </p>
              <p className="whitespace-pre-wrap">{ticket.admin_reply}</p>
            </div>
          )}

          {/* Admin controls */}
          {isAdmin && !isClosed && (
            <div className="space-y-3 pt-2 border-t">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Durum Güncelle</Label>
                  <Select
                    value={ticket.status}
                    onValueChange={(v) =>
                      handleStatusChange(v as SupportTicketStatus)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.entries(SUPPORT_STATUS_LABELS) as [
                          SupportTicketStatus,
                          string,
                        ][]
                      ).map(([val, label]) => (
                        <SelectItem key={val} value={val} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Yanıt Sonrası Durum</Label>
                  <Select
                    value={replyStatus}
                    onValueChange={(v) =>
                      setReplyStatus(v as SupportTicketStatus)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        ["in_progress", "resolved", "closed"] as SupportTicketStatus[]
                      ).map((val) => (
                        <SelectItem key={val} value={val} className="text-xs">
                          {SUPPORT_STATUS_LABELS[val]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Cevap Yaz</Label>
                <textarea
                  className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Talebe yanıtınızı yazın..."
                  maxLength={2000}
                />
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <Button
                size="sm"
                onClick={handleReply}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Kaydediliyor..." : "Yanıt Gönder"}
              </Button>
            </div>
          )}

          {/* User close button */}
          {!isAdmin && !isClosed && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={loading}
              >
                Talebi Kapat
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} size="sm">
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

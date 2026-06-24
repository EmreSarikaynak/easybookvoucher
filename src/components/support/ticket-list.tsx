"use client";

import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SupportTicket } from "@/lib/types";
import {
  SUPPORT_STATUS_LABELS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_COLORS,
  SUPPORT_PRIORITY_COLORS,
} from "@/lib/types";

interface TicketListProps {
  tickets: SupportTicket[];
  onSelect?: (ticket: SupportTicket) => void;
}

export function TicketList({ tickets, onSelect }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Henüz destek talebi yok.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-md border overflow-hidden">
      {tickets.map((ticket) => (
        <button
          key={ticket.id}
          type="button"
          onClick={() => onSelect?.(ticket)}
          className={cn(
            "w-full text-left p-4 hover:bg-muted/50 transition-colors",
            ticket.status === "closed" || ticket.status === "resolved"
              ? "opacity-70"
              : ""
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">
                  {ticket.subject}
                </span>
                {ticket.admin_reply && (
                  <span className="inline-flex items-center text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                    Yanıt Var
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {ticket.message}
              </p>
              {ticket.user && (
                <p className="text-xs text-muted-foreground mt-1">
                  {ticket.user.full_name}
                  {ticket.agency && ` — ${ticket.agency.name}`}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
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
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(ticket.created_at), {
                  addSuffix: true,
                  locale: tr,
                })}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

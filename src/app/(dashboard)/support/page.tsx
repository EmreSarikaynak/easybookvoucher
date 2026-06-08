"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketForm } from "@/components/support/ticket-form";
import { TicketList } from "@/components/support/ticket-list";
import { TicketDetailDialog } from "@/components/support/ticket-detail-dialog";
import { getSupportTickets } from "@/app/actions/support";
import { createClient } from "@/lib/supabase";
import type { SupportTicket, SupportTicketStatus } from "@/lib/types";

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"open" | "all">("open");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const result = await getSupportTickets();
    if (result.data) {
      setTickets(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setIsAdmin(
          profile?.role === "super_admin" || profile?.role === "admin"
        );
      }
      await loadTickets();
    };
    init();
  }, [loadTickets]);

  const handleUpdated = async () => {
    setSelectedTicket(null);
    await loadTickets();
  };

  const openStatuses: SupportTicketStatus[] = ["open", "in_progress"];
  const openTickets = tickets.filter((t) =>
    openStatuses.includes(t.status)
  );
  const allTickets = tickets;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Headphones className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Destek Talepleri</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Tüm destek taleplerini yönetin"
                : "Sorunlarınızı bildirin, ekibimiz yardımcı olsun"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTickets}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Yenile
          </Button>
          {!isAdmin && (
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Yeni Talep
            </Button>
          )}
        </div>
      </div>

      {/* Yeni talep formu */}
      {showForm && !isAdmin && (
        <TicketForm
          onSuccess={() => {
            setShowForm(false);
            loadTickets();
          }}
        />
      )}

      {/* Talepler listesi */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "open" | "all")}
      >
        <TabsList>
          <TabsTrigger value="open">
            Açık / İşlemde
            {openTickets.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                {openTickets.length > 99 ? "99+" : openTickets.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Tümü ({allTickets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          <TicketList
            tickets={openTickets}
            onSelect={setSelectedTicket}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <TicketList
            tickets={allTickets}
            onSelect={setSelectedTicket}
          />
        </TabsContent>
      </Tabs>

      {/* Detay Dialog */}
      <TicketDetailDialog
        ticket={selectedTicket}
        isAdmin={isAdmin}
        onClose={() => setSelectedTicket(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}

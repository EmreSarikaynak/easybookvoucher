"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupportTicket } from "@/app/actions/support";
import type { SupportTicketPriority } from "@/lib/types";
import { SUPPORT_PRIORITY_LABELS } from "@/lib/types";

interface TicketFormProps {
  onSuccess?: () => void;
}

export function TicketForm({ onSuccess }: TicketFormProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<SupportTicketPriority>("normal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError("Konu ve mesaj zorunludur.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createSupportTicket(subject, message, priority);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSubject("");
      setMessage("");
      setPriority("normal");
      onSuccess?.();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Yeni Destek Talebi</CardTitle>
        <CardDescription>
          Bir sorun bildirin veya yardım isteyin. Ekibimiz en kısa sürede size
          geri dönecektir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Konu *</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Talebinizin konusunu yazın"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Öncelik</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as SupportTicketPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(SUPPORT_PRIORITY_LABELS) as [
                      SupportTicketPriority,
                      string,
                    ][]
                  ).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mesaj *</Label>
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Sorununuzu veya talebinizi detaylıca açıklayın..."
              maxLength={2000}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={loading}>
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Gönderiliyor..." : "Talep Gönder"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

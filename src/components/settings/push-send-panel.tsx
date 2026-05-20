"use client";

import { useState } from "react";
import { Send } from "lucide-react";
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

export function PushSendPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setResult("❌ Başlık ve mesaj zorunludur.");
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: "/dashboard",
          targetRole: targetRole === "all" ? null : targetRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult(`❌ Hata: ${data.error || "Bilinmeyen hata"}`);
      } else {
        setResult(
          `✅ ${data.sent} kişiye gönderildi${data.failed > 0 ? `, ${data.failed} başarısız` : ""}.`
        );
        setTitle("");
        setBody("");
      }
    } catch (err) {
      setResult(`❌ İstek hatası: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4" />
          Push Bildirim Gönder
        </CardTitle>
        <CardDescription>
          Uygulamayı kullanan kullanıcılara anlık bildirim gönderin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Hedef Kitle</Label>
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
          <Label>Başlık</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bildirim başlığı"
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label>Mesaj</Label>
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Bildirim mesajı"
            maxLength={300}
          />
        </div>

        <Button onClick={handleSend} disabled={sending} className="w-full">
          <Send className="mr-2 h-4 w-4" />
          {sending ? "Gönderiliyor..." : "Gönder"}
        </Button>

        {result && (
          <p className="text-sm mt-1">{result}</p>
        )}
      </CardContent>
    </Card>
  );
}

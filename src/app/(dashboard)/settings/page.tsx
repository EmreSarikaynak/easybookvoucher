"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";

export default function SettingsPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null })
      .eq("id", profile.id);

    if (error) {
      setMessage("Profil g\u00FCncellenirken hata olu\u015Ftu.");
    } else {
      setMessage("Profil ba\u015Far\u0131yla g\u00FCncellendi.");
    }
    setSaving(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage("\u015Eifre en az 6 karakter olmal\u0131d\u0131r.");
      return;
    }
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage("\u015Eifre g\u00FCncellenirken hata olu\u015Ftu.");
    } else {
      setMessage("\u015Eifre ba\u015Far\u0131yla g\u00FCncellendi.");
      setCurrentPassword("");
      setNewPassword("");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground">Profil ve hesap ayarlar&#305;n&#305;z</p>
      </div>

      {message && (
        <div className="rounded-md bg-primary/10 p-3 text-sm">{message}</div>
      )}

      {/* Profil Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profil Bilgileri</CardTitle>
          <CardDescription>Ad&#305;n&#305;z&#305; ve ileti&#351;im bilgilerinizi g&uuml;ncelleyin</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input value={profile?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
              />
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Kaydet
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* &#350;ifre De&#287;i&#351;tirme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">&Scedil;ifre De&#287;i&#351;tir</CardTitle>
          <CardDescription>Hesap &#351;ifrenizi g&uuml;ncelleyin</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Yeni &#350;ifre</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              &#350;ifreyi G&uuml;ncelle
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

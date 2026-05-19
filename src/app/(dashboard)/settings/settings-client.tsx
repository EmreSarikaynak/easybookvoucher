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
import { createClient } from "@/lib/supabase";
import { ExchangeRates } from "@/components/settings/exchange-rates";
import { LogoSettings } from "@/components/settings/logo-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import type { Profile } from "@/lib/types";

interface SettingsClientProps {
    profile: Profile | null;
    siteLogo: string | null;
    adminWhatsappPhone: string | null;
}

export function SettingsClient({ profile, siteLogo: initialSiteLogo, adminWhatsappPhone: initialAdminPhone }: SettingsClientProps) {
    const supabase = createClient();

    const [fullName, setFullName] = useState(profile?.full_name ?? "");
    const [phone, setPhone] = useState(profile?.phone ?? "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // Custom: Site Logo State
    const [siteLogo, setSiteLogo] = useState<string | null>(initialSiteLogo);

    // Admin WhatsApp Phone
    const [adminPhone, setAdminPhone] = useState(initialAdminPhone ?? "");
    const [savingAdminPhone, setSavingAdminPhone] = useState(false);
    const [adminPhoneMessage, setAdminPhoneMessage] = useState<string | null>(null);

    // Note: We don't need useEffect to sync profile -> state unless we expect specific changes,
    // because "initial state" pattern works well if profile is fetched server-side.
    // But if the user updates profile via form, local state is updated.

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
            setMessage("Profil güncellenirken hata oluştu.");
        } else {
            setMessage("Profil başarıyla güncellendi.");
        }
        setSaving(false);
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setMessage("Şifre en az 6 karakter olmalıdır.");
            return;
        }
        setSaving(true);
        setMessage(null);

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            setMessage("Şifre güncellenirken hata oluştu.");
        } else {
            setMessage("Şifre başarıyla güncellendi.");
            setCurrentPassword("");
            setNewPassword("");
        }
        setSaving(false);
    };

    const isAdmin = profile?.role === "super_admin" || profile?.role === "admin";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Ayarlar</h1>
                <p className="text-muted-foreground">Profil ve hesap ayarlarınız</p>
            </div>

            {message && (
                <div className="rounded-md bg-primary/10 p-3 text-sm">{message}</div>
            )}

            {/* Profil Bilgileri */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Profil Bilgileri</CardTitle>
                    <CardDescription>Adınızı ve iletişim bilgilerinizi güncelleyin</CardDescription>
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

            {/* Şifre Değiştirme */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Şifre Değiştir</CardTitle>
                    <CardDescription>Hesap şifrenizi güncelleyin</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Yeni Şifre</Label>
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
                            Şifreyi Güncelle
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Separator />

            {/* Push Notifications */}
            <NotificationSettings />

            {/* Only Admin Sections */}
            {isAdmin && (
                <>
                    <Separator />

                    {/* Admin WhatsApp Numarası */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">📱 Admin WhatsApp Numarası</CardTitle>
                            <CardDescription>
                                Her kesilen bilet bu numaraya da gönderilir. +905366029397 zaten otomatik alıyor —
                                farklı bir numara girmek isterseniz buraya ekleyin (aynı numarayı girerseniz tekrar göndermez).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-3">
                                <Input
                                    value={adminPhone}
                                    onChange={(e) => setAdminPhone(e.target.value)}
                                    placeholder="+90 5XX XXX XX XX"
                                    className="flex-1"
                                />
                                <Button
                                    onClick={async () => {
                                        setSavingAdminPhone(true);
                                        setAdminPhoneMessage(null);
                                        const { updateSetting } = await import("@/app/actions/settings");
                                        const result = await updateSetting("admin_whatsapp_phone", adminPhone.trim());
                                        if (result?.error) {
                                            setAdminPhoneMessage("❌ " + result.error);
                                        } else {
                                            setAdminPhoneMessage("✅ Kaydedildi!");
                                        }
                                        setSavingAdminPhone(false);
                                    }}
                                    disabled={savingAdminPhone}
                                >
                                    {savingAdminPhone ? "Kaydediliyor..." : "Kaydet"}
                                </Button>
                            </div>
                            {adminPhoneMessage && (
                                <p className="mt-2 text-sm">{adminPhoneMessage}</p>
                            )}
                        </CardContent>
                    </Card>

                    <Separator />

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Site Logosu</CardTitle>
                            <CardDescription>Sitenizin logosunu güncelleyin</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <LogoSettings currentLogo={siteLogo} />
                        </CardContent>
                    </Card>

                    <Separator />

                    <ExchangeRates />
                </>
            )}
        </div>
    );
}

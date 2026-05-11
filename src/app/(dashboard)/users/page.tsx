"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Edit, Shield, Trash2 } from "lucide-react";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase";
import { ROLE_LABELS } from "@/lib/types";
import type { Profile, UserRole, Agency } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { deleteUser } from "@/app/actions/user";

export default function UsersPage() {
  const router = useRouter();
  const { profile: currentUser, isAdmin, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "sales" as UserRole,
    agency_id: "",
    phone: "",
  });

  const supabase = createClient();

  const fetchData = async () => {
    const [profilesRes, agenciesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("agencies").select("*").eq("is_active", true).order("name"),
    ]);
    setProfiles(profilesRes.data ?? []);
    setAgencies(agenciesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    fetchData();
  }, []);

  const openEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      agency_id: profile.agency_id ?? "none",
      phone: profile.phone ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingProfile) return;

    await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        role: formData.role,
        agency_id: formData.agency_id === "none" ? null : formData.agency_id,
        phone: formData.phone || null,
      })
      .eq("id", editingProfile.id);

    setDialogOpen(false);
    fetchData();
  };

  const toggleActive = async (profile: Profile) => {
    await supabase
      .from("profiles")
      .update({ is_active: !profile.is_active })
      .eq("id", profile.id);
    fetchData();
  };

  const handleDelete = async (profile: Profile) => {
    if (profile.id === currentUser?.id) {
      alert("Kendi hesabınızı silemezsiniz.");
      return;
    }

    if (!confirm(`${profile.full_name} kullanıcısını tamamen silmek istediğinize emin misiniz?`)) {
      return;
    }

    const result = await deleteUser(profile.id);
    if (result.success) {
      fetchData();
    } else {
      alert(result.error || "Silme işlemi sırasında bir hata oluştu.");
    }
  };

  const roleColor: Record<UserRole, string> = {
    super_admin: "bg-red-100 text-red-800",
    admin: "bg-blue-100 text-blue-800",
    agency_admin: "bg-purple-100 text-purple-800",
    sales: "bg-green-100 text-green-800",
  };

  if (authLoading || (loading && profiles.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kullanıcılar</h1>
            <p className="text-muted-foreground">Kullanıcı yönetimi</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kullanıcılar</h1>
          <p className="text-muted-foreground">Kullanıcı yönetimi</p>
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Kullanıcı bulunamadı</h3>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card key={profile.id} className={!profile.is_active ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{profile.full_name}</CardTitle>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleColor[profile.role]}`}
                >
                  {ROLE_LABELS[profile.role]}
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                {profile.phone && (
                  <p className="text-sm text-muted-foreground">{profile.phone}</p>
                )}
                <Badge variant={profile.is_active ? "success" : "secondary"}>
                  {profile.is_active ? "Aktif" : "Pasif"}
                </Badge>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(profile)}>
                    <Edit className="mr-1 h-3 w-3" />
                    Düzenle
                  </Button>
                  <Button
                    size="sm"
                    variant={profile.is_active ? "destructive" : "default"}
                    onClick={() => toggleActive(profile)}
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    {profile.is_active ? "Deaktif Et" : "Aktif Et"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(profile)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Sil
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Kullanıcı Düzenle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input
                value={formData.full_name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, full_name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input value={formData.email} disabled />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, role: val as UserRole }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Süper Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="agency_admin">Acente Yöneticisi</SelectItem>
                  <SelectItem value="sales">Satıcı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Acente</Label>
              <Select
                value={formData.agency_id}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, agency_id: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Acente seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Yok</SelectItem>
                  {agencies.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSave}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

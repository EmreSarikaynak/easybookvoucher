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
import { createUser, deleteUser } from "@/app/actions/user";

type DialogMode = "create" | "edit";

const EMPTY_FORM = {
  full_name: "",
  email: "",
  password: "",
  role: "sales" as UserRole,
  agency_id: "none",
  phone: "",
};

export default function UsersPage() {
  const router = useRouter();
  const { profile: currentUser, isAdmin, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("edit");
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const supabase = createClient();

  const fetchData = async () => {
    setFetchError(null);
    try {
      const [profilesRes, agenciesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase
          .from("agencies")
          .select("*")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (agenciesRes.error) throw agenciesRes.error;

      setProfiles(profilesRes.data ?? []);
      setAgencies(agenciesRes.data ?? []);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Veriler yüklenemedi."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setDialogMode("create");
    setEditingProfile(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (profile: Profile) => {
    setDialogMode("edit");
    setEditingProfile(profile);
    setFormData({
      full_name: profile.full_name,
      email: profile.email,
      password: "",
      role: profile.role,
      agency_id: profile.agency_id ?? "none",
      phone: profile.phone ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    setSubmitting(true);

    try {
      if (dialogMode === "create") {
        if (!formData.email || !formData.password || !formData.full_name) {
          setFormError("Ad soyad, e-posta ve şifre zorunludur.");
          return;
        }
        if (formData.password.length < 6) {
          setFormError("Şifre en az 6 karakter olmalı.");
          return;
        }

        const result = await createUser({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          agency_id:
            formData.agency_id === "none" ? null : formData.agency_id,
          phone: formData.phone || null,
        });

        if (result.error) {
          setFormError(result.error);
          return;
        }
      } else {
        if (!editingProfile) return;

        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            role: formData.role,
            agency_id:
              formData.agency_id === "none" ? null : formData.agency_id,
            phone: formData.phone || null,
          })
          .eq("id", editingProfile.id);

        if (error) {
          setFormError(error.message);
          return;
        }
      }

      setDialogOpen(false);
      await fetchData();
    } finally {
      setSubmitting(false);
    }
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

    if (
      !confirm(
        `${profile.full_name} kullanıcısını tamamen silmek istediğinize emin misiniz?`
      )
    ) {
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

  if (!authLoading && !isAdmin) return null;

  const showSkeleton = authLoading || (loading && !fetchError);

  const requiresAgency =
    formData.role === "agency_admin" || formData.role === "sales";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kullanıcılar</h1>
          <p className="text-muted-foreground">Kullanıcı yönetimi</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Yeni Kullanıcı
        </Button>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Veriler yüklenirken hata oluştu: {fetchError}
        </div>
      )}

      {showSkeleton ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Kullanıcı bulunamadı</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Yukarıdaki butondan ilk kullanıcıyı ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card
              key={profile.id}
              className={!profile.is_active ? "opacity-60" : ""}
            >
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
                  <p className="text-sm text-muted-foreground">
                    {profile.phone}
                  </p>
                )}
                <Badge variant={profile.is_active ? "success" : "secondary"}>
                  {profile.is_active ? "Aktif" : "Pasif"}
                </Badge>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(profile)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Düzenle
                  </Button>
                  <Button
                    size="sm"
                    variant={profile.is_active ? "destructive" : "default"}
                    onClick={() => toggleActive(profile)}
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    {profile.is_active ? "Deaktif" : "Aktif"}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create"
                ? "Yeni Kullanıcı Ekle"
                : "Kullanıcı Düzenle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

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
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, email: e.target.value }))
                }
                disabled={dialogMode === "edit"}
              />
            </div>

            {dialogMode === "create" && (
              <div className="space-y-2">
                <Label>Şifre</Label>
                <Input
                  type="password"
                  placeholder="En az 6 karakter"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, password: e.target.value }))
                  }
                />
              </div>
            )}

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
              <Label>
                Acente {requiresAgency && <span className="text-red-500">*</span>}
              </Label>
              <Select
                value={formData.agency_id}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, agency_id: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Acente seçin" />
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
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              İptal
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting
                ? "Kaydediliyor..."
                : dialogMode === "create"
                  ? "Oluştur"
                  : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

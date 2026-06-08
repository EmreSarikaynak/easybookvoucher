"use client";

import { useState } from "react";
import { Plus, Building2, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createAgencyWithUser,
  updateAgency,
  updateAgencyPassword,
  deleteAgency,
  saveAgencyTourPricingMatrix,
  type AgencyTourPricingCell,
} from "@/app/actions/agency";
import type { Agency } from "@/lib/types";
import { useRouter } from "next/navigation";
import { AgencyTourPricing } from "./agency-tour-pricing";

interface AgenciesContentProps {
  agencies: Agency[];
  isAdmin?: boolean;
}

export function AgenciesContent({ agencies, isAdmin = false }: AgenciesContentProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pricingCells, setPricingCells] = useState<AgencyTourPricingCell[]>([]);
  const [pricingDirty, setPricingDirty] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    agency_code: "",
    phone: "",
    email: "",
    admin_name: "",
    password: "",
  });

  const openNew = () => {
    setEditingAgency(null);
    setFormData({
      name: "",
      agency_code: "",
      phone: "",
      email: "",
      admin_name: "",
      password: "",
    });
    setPricingCells([]);
    setPricingDirty(false);
    setError(null);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const openEdit = (agency: Agency) => {
    setEditingAgency(agency);
    setFormData({
      name: agency.name,
      agency_code: agency.agency_code || "",
      phone: agency.phone ?? "",
      email: agency.email ?? "",
      admin_name: "",
      password: "",
    });
    setPricingCells([]);
    setPricingDirty(false);
    setError(null);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    // Yeni acente için validasyon
    if (!editingAgency) {
      if (!formData.admin_name.trim()) {
        setError("Yönetici adı gereklidir");
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setError("Şifre en az 6 karakter olmalıdır");
        return;
      }
      if (!formData.email.trim()) {
        setError("E-posta adresi gereklidir");
        return;
      }
    } else if (formData.password && formData.password.length < 6) {
      // Düzenleme modunda şifre opsiyonel; girildiyse en az 6 karakter.
      setError("Yeni şifre en az 6 karakter olmalıdır");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result;
      if (editingAgency) {
        result = await updateAgency(editingAgency.id, {
          name: formData.name,
          agency_code: formData.agency_code || undefined,
          phone: formData.phone,
          email: formData.email,
        });
      } else {
        result = await createAgencyWithUser({
          name: formData.name,
          agency_code: formData.agency_code || undefined,
          phone: formData.phone,
          email: formData.email,
          admin_name: formData.admin_name,
          password: formData.password,
        });
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      // Düzenleme modunda yeni şifre girildiyse acente yöneticisinin şifresini güncelle.
      if (editingAgency && formData.password) {
        const pwResult = await updateAgencyPassword(
          editingAgency.id,
          formData.password
        );
        if (pwResult.error) {
          setError(`Acente kaydedildi ama şifre güncellenemedi: ${pwResult.error}`);
          return;
        }
      }

      // Save per-tour pricing if any rows were edited (admin + editing only).
      if (isAdmin && editingAgency && pricingDirty && pricingCells.length > 0) {
        const pricingResult = await saveAgencyTourPricingMatrix(
          editingAgency.id,
          pricingCells
        );
        if (pricingResult.error) {
          setError(`Acente kaydedildi ama fiyatlar kaydedilemedi: ${pricingResult.error}`);
          return;
        }
      }

      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu acenteyi silmek istediğinize emin misiniz?")) return;

    const result = await deleteAgency(id);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? 'Acenteler' : 'Acente Profili'}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? 'Acente yönetimi (yalnızca admin)' : 'Kendi acente profilinizi görüntüleyin'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Acente
          </Button>
        )}
      </div>

      {agencies.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Acente bulunamadı</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Yeni acente eklemek için yukarıdaki butonu kullanın.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agencies.map((agency) => (
            <Card key={agency.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{agency.name}</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono">{agency.agency_code}</p>
                </div>
                <Badge variant={agency.is_active ? "success" : "secondary"}>
                  {agency.is_active ? "Aktif" : "Pasif"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {agency.phone && (
                  <p className="text-sm text-muted-foreground">{agency.phone}</p>
                )}
                {agency.email && (
                  <p className="text-sm text-muted-foreground">{agency.email}</p>
                )}
                <div className="flex gap-2 pt-2">
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(agency)}>
                      <Edit className="mr-1 h-3 w-3" />
                      Düzenle
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(agency.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Sil
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Acente Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={editingAgency ? "max-w-3xl" : "max-w-lg"}>
          <DialogHeader>
            <DialogTitle>
              {editingAgency ? "Acente Düzenle" : "Yeni Acente"}
            </DialogTitle>
            {!editingAgency && (
              <DialogDescription>
                Yeni acente oluştururken aynı zamanda bir yönetici hesabı da oluşturulacaktır.
              </DialogDescription>
            )}
          </DialogHeader>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {/* Acente Bilgileri */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Acente Bilgileri</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Acente Adı *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Örn: Bodrum Tours"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Acente Kodu</Label>
                  <Input
                    value={formData.agency_code}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, agency_code: e.target.value.toUpperCase() }))
                    }
                    placeholder="Boş = otomatik"
                    maxLength={10}
                  />
                </div>
              </div>

              {editingAgency ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Telefon</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, phone: e.target.value }))
                        }
                        placeholder="+90 5XX XXX XX XX"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>E-posta</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder="ornek@email.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Yeni Şifre</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, password: e.target.value }))
                        }
                        placeholder="Değiştirmek için yeni şifre girin"
                        className="pr-10"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Boş bırakırsanız acente yöneticisinin mevcut şifresi korunur.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label>Telefon</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="+90 5XX XXX XX XX"
                  />
                </div>
              )}
            </div>

            {/* Yönetici Hesabı - Sadece yeni acente için */}
            {!editingAgency && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium text-sm text-muted-foreground">Yönetici Hesabı</h3>
                <div className="space-y-2">
                  <Label>Yönetici Adı Soyadı *</Label>
                  <Input
                    value={formData.admin_name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, admin_name: e.target.value }))
                    }
                    placeholder="Örn: Ahmet Yılmaz"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-posta (Giriş için) *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="ornek@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Şifre *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, password: e.target.value }))
                      }
                      placeholder="En az 6 karakter"
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bu bilgilerle acente yöneticisi sisteme giriş yapabilecek.
                  </p>
                </div>
              </div>
            )}

            {/* Tur Bazında Fiyatlandırma — sadece düzenleme modunda ve admin */}
            {editingAgency && isAdmin && (
              <div className="space-y-3 pt-4 border-t">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Tur Bazında Fiyatlandırma
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bu acenteye özel tur maliyeti ve satış fiyatlarını yetişkin/çocuk
                    ayrımıyla girin. Boş bırakılan maliyet alanları için tur varsayılan
                    maliyeti kullanılır.
                  </p>
                </div>
                <AgencyTourPricing
                  agencyId={editingAgency.id}
                  onChange={(cells, dirty) => {
                    setPricingCells(cells);
                    setPricingDirty(dirty);
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Kaydediliyor..." : editingAgency ? "Güncelle" : "Acente Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, Edit, Trash2 } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase";
import type { Agency } from "@/lib/types";

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    commission_rate: 0,
  });

  const supabase = createClient();

  const fetchAgencies = async () => {
    const { data } = await supabase
      .from("agencies")
      .select("*")
      .order("name");
    setAgencies(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

  const openNew = () => {
    setEditingAgency(null);
    setFormData({ name: "", address: "", phone: "", email: "", commission_rate: 0 });
    setDialogOpen(true);
  };

  const openEdit = (agency: Agency) => {
    setEditingAgency(agency);
    setFormData({
      name: agency.name,
      address: agency.address ?? "",
      phone: agency.phone ?? "",
      email: agency.email ?? "",
      commission_rate: agency.commission_rate,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingAgency) {
      await supabase
        .from("agencies")
        .update(formData)
        .eq("id", editingAgency.id);
    } else {
      await supabase.from("agencies").insert(formData);
    }
    setDialogOpen(false);
    fetchAgencies();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu acenteyi silmek istedi\u011Finize emin misiniz?")) return;
    await supabase.from("agencies").update({ is_active: false }).eq("id", id);
    fetchAgencies();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Acenteler</h1>
          <p className="text-muted-foreground">Acente y&ouml;netimi (yaln&#305;zca admin)</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Acente
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : agencies.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Acente bulunamad&#305;</h3>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agencies.map((agency) => (
            <Card key={agency.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{agency.name}</CardTitle>
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
                <p className="text-sm">
                  Komisyon: <span className="font-semibold">%{agency.commission_rate}</span>
                </p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(agency)}>
                    <Edit className="mr-1 h-3 w-3" />
                    D&uuml;zenle
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(agency.id)}
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

      {/* Acente Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAgency ? "Acente D&uuml;zenle" : "Yeni Acente"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Acente Ad&#305;</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Adres</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, address: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Komisyon Oran&#305; (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={formData.commission_rate}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    commission_rate: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              &#304;ptal
            </Button>
            <Button onClick={handleSave}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

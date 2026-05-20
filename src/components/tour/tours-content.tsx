"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TourCard } from "./tour-card";
import { TourForm } from "./tour-form";
import { deleteTour } from "@/app/actions/tour";
import type { Tour } from "@/lib/types";

interface ToursContentProps {
  initialTours: Tour[];
  isAdmin: boolean;
}

export function ToursContent({ initialTours, isAdmin }: ToursContentProps) {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>(initialTours);

  useEffect(() => {
    setTours(initialTours);
  }, [initialTours]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);

  const handleNewTour = () => {
    setEditingTour(null);
    setFormOpen(true);
  };

  const handleEditTour = (tour: Tour) => {
    setEditingTour(tour);
    setFormOpen(true);
  };

  const handleDeleteTour = async (tour: Tour) => {
    if (!confirm(`"${tour.name}" turunu silmek istediğinize emin misiniz?`))
      return;

    const result = await deleteTour(tour.id);
    if (!result.error) {
      router.refresh();
    } else {
      alert(result.error);
    }
  };

  const activeTours = tours.filter((t) => t.is_active);
  const inactiveTours = tours.filter((t) => !t.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Turlar</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Tur ekleme, düzenleme ve yönetim"
              : "Turları görüntüleyin, müşteri URL ve PDF broşür indirin"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleNewTour}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Tur
          </Button>
        )}
      </div>

      {tours.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Tur bulunamadı</h3>
          {isAdmin && (
            <p className="mt-2 text-muted-foreground">
              Yeni bir tur ekleyerek başlayın
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeTours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                isAdmin={isAdmin}
                onEdit={isAdmin ? handleEditTour : undefined}
                onDelete={isAdmin ? handleDeleteTour : undefined}
              />
            ))}
          </div>

          {isAdmin && inactiveTours.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-muted-foreground mb-4">
                Pasif Turlar
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
                {inactiveTours.map((tour) => (
                  <TourCard
                    key={tour.id}
                    tour={tour}
                    isAdmin={isAdmin}
                    onEdit={handleEditTour}
                    onDelete={handleDeleteTour}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {isAdmin && (
        <TourForm
          open={formOpen}
          onOpenChange={setFormOpen}
          tour={editingTour}
          onSave={() => router.refresh()}
        />
      )}
    </div>
  );
}

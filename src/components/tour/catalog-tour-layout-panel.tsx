"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Loader2,
  GripVertical,
  Plus,
  Save,
  RotateCcw,
  LayoutPanelTop,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  saveCatalogTourLayout,
  type CatalogTourLayoutEntry,
  type CatalogTourLayoutRow,
} from "@/app/actions/tour-catalog";
import { getTourContentForLang, type CatalogLang } from "@/lib/tour-i18n";
import type { Tour } from "@/lib/types";

interface CatalogTourLayoutPanelProps {
  tours: Tour[];
  initialLayout: Record<string, CatalogTourLayoutEntry>;
  previewLang: CatalogLang;
  onSaved: (next: Record<string, CatalogTourLayoutEntry>) => void;
}

type SlotValue = Tour | null;
type Page = [SlotValue, SlotValue];

interface SlotLocation {
  kind: "slot";
  pageIdx: number;
  slotIdx: 0 | 1;
}
interface UnassignedLocation {
  kind: "unassigned";
}
type Location = SlotLocation | UnassignedLocation;

const UNASSIGNED_DROP_ID = "unassigned";

function buildInitialState(
  tours: Tour[],
  layout: Record<string, CatalogTourLayoutEntry>
): { pages: Page[]; unassigned: Tour[] } {
  const tourById = new Map(tours.map((t) => [t.id, t]));
  const layoutEntries = Object.entries(layout).filter(([id]) => tourById.has(id));

  // layout boşsa: tüm turları alfabetik sırala, 2'şer böl
  if (layoutEntries.length === 0) {
    const sorted = [...tours].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    const pages: Page[] = [];
    for (let i = 0; i < sorted.length; i += 2) {
      pages.push([sorted[i] ?? null, sorted[i + 1] ?? null]);
    }
    if (pages.length === 0) pages.push([null, null]);
    return { pages, unassigned: [] };
  }

  let maxPage = 0;
  for (const [, e] of layoutEntries) {
    if (e.page_number > maxPage) maxPage = e.page_number;
  }
  const pages: Page[] = Array.from({ length: maxPage }, () => [null, null] as Page);

  const assignedIds = new Set<string>();
  for (const [tourId, e] of layoutEntries) {
    const idx = e.page_number - 1;
    if (idx < 0 || idx >= pages.length) continue;
    const tour = tourById.get(tourId);
    if (!tour) continue;
    pages[idx][e.slot === 1 ? 1 : 0] = tour;
    assignedIds.add(tourId);
  }

  const unassigned = tours
    .filter((t) => !assignedIds.has(t.id))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return { pages, unassigned };
}

function locateTour(
  tourId: string,
  pages: Page[],
  unassigned: Tour[]
): Location | null {
  for (let i = 0; i < pages.length; i++) {
    for (let j = 0; j < 2; j++) {
      if (pages[i][j as 0 | 1]?.id === tourId) {
        return { kind: "slot", pageIdx: i, slotIdx: j as 0 | 1 };
      }
    }
  }
  if (unassigned.some((t) => t.id === tourId)) {
    return { kind: "unassigned" };
  }
  return null;
}

function parseDropTarget(overId: string): Location | null {
  if (overId === UNASSIGNED_DROP_ID) return { kind: "unassigned" };
  const match = /^slot-(\d+)-([01])$/.exec(overId);
  if (!match) return null;
  return {
    kind: "slot",
    pageIdx: Number(match[1]),
    slotIdx: Number(match[2]) as 0 | 1,
  };
}

function applyMove(
  pages: Page[],
  unassigned: Tour[],
  tour: Tour,
  from: Location,
  to: Location
): { pages: Page[]; unassigned: Tour[] } {
  const nextPages: Page[] = pages.map((p) => [p[0], p[1]] as Page);
  const nextUnassigned: Tour[] = [...unassigned];

  const removeFrom = (loc: Location): Tour | null => {
    if (loc.kind === "slot") {
      const v = nextPages[loc.pageIdx][loc.slotIdx];
      nextPages[loc.pageIdx][loc.slotIdx] = null;
      return v;
    }
    const idx = nextUnassigned.findIndex((t) => t.id === tour.id);
    if (idx >= 0) {
      const [removed] = nextUnassigned.splice(idx, 1);
      return removed;
    }
    return null;
  };

  // Hedef slot doluysa swap için occupant'ı al
  const occupant: SlotValue =
    to.kind === "slot" ? nextPages[to.pageIdx][to.slotIdx] : null;

  // Önce tour'u from'dan çıkar
  removeFrom(from);

  // tour'u hedefe koy
  if (to.kind === "slot") {
    nextPages[to.pageIdx][to.slotIdx] = tour;
  } else {
    // unassigned'a koy (zaten orada değilse)
    if (!nextUnassigned.find((t) => t.id === tour.id)) {
      nextUnassigned.push(tour);
      nextUnassigned.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    }
  }

  // occupant'ı (varsa) from yerine yerleştir
  if (occupant && occupant.id !== tour.id) {
    if (from.kind === "slot") {
      nextPages[from.pageIdx][from.slotIdx] = occupant;
    } else {
      nextUnassigned.push(occupant);
      nextUnassigned.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    }
  }

  return { pages: nextPages, unassigned: nextUnassigned };
}

function toRows(pages: Page[]): CatalogTourLayoutRow[] {
  const rows: CatalogTourLayoutRow[] = [];
  pages.forEach((p, i) => {
    if (p[0])
      rows.push({ tour_id: p[0].id, page_number: i + 1, slot: 0 });
    if (p[1])
      rows.push({ tour_id: p[1].id, page_number: i + 1, slot: 1 });
  });
  return rows;
}

function tourDisplayName(tour: Tour, lang: CatalogLang): string {
  return getTourContentForLang(tour.translations, lang, tour.name, tour.description).name;
}

// --- Drag/Drop child components ---

function DraggableTourChip({
  tour,
  lang,
  compact,
}: {
  tour: Tour;
  lang: CatalogLang;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tour.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group flex items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 text-xs font-medium shadow-sm cursor-grab active:cursor-grabbing transition ${
        isDragging ? "opacity-40" : "hover:border-primary hover:shadow"
      } ${compact ? "py-1 px-1.5" : ""}`}
      title={tour.name}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0" />
      <span className="truncate">{tourDisplayName(tour, lang)}</span>
    </div>
  );
}

function DroppableSlot({
  pageIdx,
  slotIdx,
  tour,
  lang,
}: {
  pageIdx: number;
  slotIdx: 0 | 1;
  tour: SlotValue;
  lang: CatalogLang;
}) {
  const id = `slot-${pageIdx}-${slotIdx}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border-2 border-dashed p-1.5 min-h-[44px] transition flex items-center ${
        isOver
          ? "border-primary bg-primary/5"
          : tour
            ? "border-transparent bg-slate-50"
            : "border-slate-300 bg-slate-50/50"
      }`}
    >
      {tour ? (
        <DraggableTourChip tour={tour} lang={lang} compact />
      ) : (
        <span className="text-[11px] text-muted-foreground italic px-1">
          Boş — bir tur sürükleyin
        </span>
      )}
    </div>
  );
}

function DroppableUnassigned({
  tours,
  lang,
}: {
  tours: Tour[];
  lang: CatalogLang;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: UNASSIGNED_DROP_ID });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border-2 border-dashed p-2 min-h-[56px] transition ${
        isOver
          ? "border-primary bg-primary/5"
          : "border-slate-300 bg-slate-50/50"
      }`}
    >
      {tours.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Tüm turlar bir sayfaya atanmış.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tours.map((t) => (
            <DraggableTourChip key={t.id} tour={t} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CatalogTourLayoutPanel({
  tours,
  initialLayout,
  previewLang,
  onSaved,
}: CatalogTourLayoutPanelProps) {
  const initial = useMemo(
    () => buildInitialState(tours, initialLayout),
    [tours, initialLayout]
  );
  const [pages, setPages] = useState<Page[]>(initial.pages);
  const [unassigned, setUnassigned] = useState<Tour[]>(initial.unassigned);
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [dirty, setDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const tourById = useMemo(() => new Map(tours.map((t) => [t.id, t])), [tours]);
  const activeTour = activeTourId ? tourById.get(activeTourId) ?? null : null;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveTourId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTourId(null);
    const tourId = String(e.active.id);
    const over = e.over;
    if (!over) return;
    const tour = tourById.get(tourId);
    if (!tour) return;

    const from = locateTour(tourId, pages, unassigned);
    if (!from) return;

    const to = parseDropTarget(String(over.id));
    if (!to) return;

    // Aynı konuma bırakıldıysa no-op
    if (
      from.kind === to.kind &&
      (from.kind === "unassigned" ||
        (from.kind === "slot" &&
          to.kind === "slot" &&
          from.pageIdx === to.pageIdx &&
          from.slotIdx === to.slotIdx))
    ) {
      return;
    }

    const next = applyMove(pages, unassigned, tour, from, to);
    setPages(next.pages);
    setUnassigned(next.unassigned);
    setDirty(true);
  };

  const handleAddPage = useCallback(() => {
    setPages((p) => [...p, [null, null] as Page]);
    setDirty(true);
  }, []);

  const handleRemoveEmptyPages = useCallback(() => {
    setPages((p) => {
      const next = p.filter((page) => page[0] !== null || page[1] !== null);
      if (next.length === 0) return [[null, null] as Page];
      return next;
    });
    setDirty(true);
  }, []);

  const handleReset = useCallback(() => {
    setPages(initial.pages);
    setUnassigned(initial.unassigned);
    setDirty(false);
    setFeedback(null);
  }, [initial]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const rows = toRows(pages);
      const res = await saveCatalogTourLayout(rows);
      if (res.error) {
        setFeedback({ type: "error", text: res.error });
        return;
      }
      const nextLayout: Record<string, CatalogTourLayoutEntry> = {};
      for (const r of rows) {
        nextLayout[r.tour_id] = { page_number: r.page_number, slot: r.slot };
      }
      onSaved(nextLayout);
      setDirty(false);
      setFeedback({
        type: "success",
        text: `Sıralama kaydedildi (${rows.length} tur)`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (e) {
      setFeedback({
        type: "error",
        text: e instanceof Error ? e.message : "Kayıt başarısız",
      });
    } finally {
      setSaving(false);
    }
  }, [pages, saving, onSaved]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutPanelTop className="h-4 w-4" />
              Tur Sıralaması (Admin)
            </CardTitle>
            <CardDescription>
              Turları sürükleyerek hangi sayfada ve hangi slotta görünmesini istediğinizi
              belirleyin. Her sayfada en fazla 2 tur yer alır.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!dirty || saving}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Geri Al
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Kaydet
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Atanmamış Turlar ({unassigned.length})
                </h4>
              </div>
              <DroppableUnassigned tours={unassigned} lang={previewLang} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Sayfalar ({pages.length})
                </h4>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleRemoveEmptyPages}
                    className="h-7 text-xs"
                    title="Tamamı boş olan sayfaları kaldır"
                  >
                    Boş Sayfaları Temizle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddPage}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Yeni Sayfa
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {pages.map((page, pageIdx) => (
                  <div
                    key={pageIdx}
                    className="rounded-lg border bg-white p-2 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Sayfa {pageIdx + 3}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Tur sayfası #{pageIdx + 1}
                      </span>
                    </div>
                    <DroppableSlot
                      pageIdx={pageIdx}
                      slotIdx={0}
                      tour={page[0]}
                      lang={previewLang}
                    />
                    <DroppableSlot
                      pageIdx={pageIdx}
                      slotIdx={1}
                      tour={page[1]}
                      lang={previewLang}
                    />
                  </div>
                ))}
              </div>
            </div>

            {feedback && (
              <p
                className={`text-sm ${
                  feedback.type === "success"
                    ? "text-emerald-700"
                    : "text-destructive"
                }`}
              >
                {feedback.text}
              </p>
            )}
            {dirty && !feedback && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5 inline-block">
                Kaydedilmemiş değişiklikler var.
              </p>
            )}
          </div>

          <DragOverlay>
            {activeTour ? (
              <div className="flex items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 text-xs font-medium shadow-md">
                <GripVertical className="h-3 w-3 text-primary" />
                <span>{tourDisplayName(activeTour, previewLang)}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
}

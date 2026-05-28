import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { AnnouncementsManager } from "@/components/settings/announcements-manager";
import { AnnouncementsView } from "@/components/announcements/announcements-view";

export default async function AnnouncementsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");

  const isAdmin =
    profile.role === "super_admin" || profile.role === "admin";

  if (isAdmin) {
    return (
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-yellow-50/80 to-transparent px-6 py-7 shadow-sm">
          <div className="relative z-10">
            <div className="mb-2 inline-flex items-center gap-2 text-amber-800">
              <Megaphone className="h-5 w-5" />
              <span className="text-sm font-medium">Yönetim</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Duyuru Yönetimi
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Kayan yazı, push bildirimi ve WhatsApp ile duyuru oluşturun.
              Mesajda <strong className="font-semibold text-foreground">**kalın**</strong>{" "}
              biçimlendirmesi kullanın; uygulama ve WhatsApp&apos;ta aynı görünür.
            </p>
          </div>
        </div>
        <AnnouncementsManager />
      </div>
    );
  }

  return <AnnouncementsView role={profile.role} />;
}

import { redirect } from "next/navigation";
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Duyurular</h1>
          <p className="text-muted-foreground">
            Kayan yazı ve push bildirimi ile duyuru oluşturun ve yönetin.
          </p>
        </div>
        <AnnouncementsManager />
      </div>
    );
  }

  return <AnnouncementsView role={profile.role} />;
}

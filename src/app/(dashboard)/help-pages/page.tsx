import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { HelpPagesManager } from "@/components/help/help-pages-manager";

export default async function HelpPagesAdminPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin =
    profile?.role === "super_admin" || profile?.role === "admin";

  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Sayfa Yönetimi</h1>
        <p className="text-muted-foreground">
          Kullanım rehberi ve footer bağlantılarını düzenleyin. Değişiklikler
          anında /help ve footer&apos;da görünür.
        </p>
      </div>
      <HelpPagesManager />
    </div>
  );
}

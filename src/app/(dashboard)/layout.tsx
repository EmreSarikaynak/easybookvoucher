import { createServerSupabaseClient } from "@/lib/supabase-server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { Profile } from "@/lib/types";

async function getProfile(): Promise<Profile | null> {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}

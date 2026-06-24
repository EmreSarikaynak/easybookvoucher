import { createServerSupabaseClient } from "@/lib/supabase-server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { fetchFooterHelpLinks } from "@/lib/help/help-pages-server";
import type { Profile } from "@/lib/types";

async function getProfile(): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient();

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
  const [profile, footerLinks] = await Promise.all([
    getProfile(),
    fetchFooterHelpLinks(),
  ]);

  return (
    <DashboardShell profile={profile} footerLinks={footerLinks}>
      {children}
    </DashboardShell>
  );
}

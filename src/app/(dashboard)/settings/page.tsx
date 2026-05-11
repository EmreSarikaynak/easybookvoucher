import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSetting } from "@/app/actions/settings";
import { SettingsClient } from "./settings-client";
import type { Profile } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = createServerSupabaseClient();

  // 1. Get Logged In User
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let siteLogo: string | null = null;

  if (user) {
    // 2. Fetch Profile
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  // 3. Fetch Settings (Site Logo)
  // getSetting is a Server Action but can be called directly here too.
  try {
    const logo = await getSetting("site_logo");
    if (typeof logo === 'string') {
      siteLogo = logo;
    }
  } catch (err) {
    console.error("Error fetching site logo:", err);
  }

  return (
    <SettingsClient profile={profile} siteLogo={siteLogo} />
  );
}

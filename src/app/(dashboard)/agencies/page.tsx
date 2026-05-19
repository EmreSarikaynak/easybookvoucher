import { createServerSupabaseClient } from "@/lib/supabase-server";
import { AgenciesContent } from "@/components/agency/agencies-content";
import type { Agency } from "@/lib/types";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";

async function getAgencies(userIsAdmin: boolean, agencyId?: string | null): Promise<Agency[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase.from("agencies").select("*").eq("is_active", true);
  
  if (!userIsAdmin && agencyId) {
    query = query.eq("id", agencyId);
  }

  const { data, error } = await query.order("name");

  if (error) {
    console.error("Agencies fetch error:", error);
    return [];
  }

  return data ?? [];
}

export default async function AgenciesPage() {
  const user = await getCurrentUser();
  const userIsAdmin = isAdmin(user);
  
  if (!userIsAdmin && !user?.agency_id) {
    return <div className="p-8 text-center text-muted-foreground">Kayıtlı bir acenteniz bulunmamaktadır.</div>;
  }

  const agencies = await getAgencies(userIsAdmin, user?.agency_id);

  return <AgenciesContent agencies={agencies} isAdmin={userIsAdmin} />;
}

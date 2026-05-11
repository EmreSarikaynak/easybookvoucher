"use server";

import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { formatDbError } from "@/lib/error-messages";

const SIGN_IN_ERROR_MESSAGE = "E-posta veya şifre hatalı. Lütfen tekrar deneyin.";

export async function signInWithIdentifier(identifier: string, password: string) {
  const trimmed = identifier.trim();
  if (!trimmed || !password) {
    return { error: SIGN_IN_ERROR_MESSAGE };
  }

  let email: string;

  if (trimmed.includes("@")) {
    email = trimmed;
  } else {
    const phoneNormalized = trimmed.replace(/\s+/g, "").replace(/-/g, "");
    const serviceClient = createServiceRoleClient();
    let profile: { email: string } | null = null;
    const { data: byTrimmed } = await serviceClient
      .from("profiles")
      .select("email")
      .eq("phone", trimmed)
      .limit(1)
      .maybeSingle();
    if (byTrimmed?.email) {
      profile = byTrimmed;
    } else if (phoneNormalized !== trimmed) {
      const { data: byNormalized } = await serviceClient
        .from("profiles")
        .select("email")
        .eq("phone", phoneNormalized)
        .limit(1)
        .maybeSingle();
      profile = byNormalized;
    }
    if (!profile?.email) {
      return { error: SIGN_IN_ERROR_MESSAGE };
    }
    email = profile.email;
  }

  const supabase = createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: SIGN_IN_ERROR_MESSAGE };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function signOutAction() {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Sign out error:", error);
    return { error: formatDbError({ message: error.message }) };
  }

  // Clear all paths
  revalidatePath("/", "layout");

  return { success: true };
}

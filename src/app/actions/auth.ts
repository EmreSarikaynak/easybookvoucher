"use server";

import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { formatDbError } from "@/lib/error-messages";
import { normalizePhoneDigits, normalizeStoredPhone } from "@/lib/phone";

const SIGN_IN_ERROR_MESSAGE = "E-posta veya şifre hatalı. Lütfen tekrar deneyin.";

/**
 * Telefonla girişte, kullanıcının girdiği numarayı kayıtlı olabilecek tüm
 * makul biçimlere çevirir. profiles.phone alanı geçmişte normalize edilmeden
 * (ham) kaydedildiği için tek bir biçimle eşleşmek yetmiyor; bu yüzden olası
 * biçimleri üretip .in() ile arıyoruz.
 */
function buildPhoneCandidates(input: string): string[] {
  const t = input.trim();
  const set = new Set<string>();
  if (t) set.add(t);
  const noSep = t.replace(/[\s-]/g, "");
  if (noSep) set.add(noSep);
  const e164 = normalizeStoredPhone(t); // +905551234567
  if (e164) set.add(e164);
  const digits = normalizePhoneDigits(t); // 905551234567
  if (digits) {
    set.add(digits);
    if (digits.startsWith("90") && digits.length >= 12) {
      set.add("0" + digits.slice(2)); // 05551234567
      set.add(digits.slice(2)); // 5551234567
    }
  }
  return [...set];
}

/**
 * Girilen tanımlayıcı (e-posta veya telefon) için giriş yapılacak e-postayı
 * döndürür. Telefonsa profiles tablosundan e-postaya çözer (service role —
 * RLS'i aşar). Eşleşme yoksa null. Telefonla giriş bu çözücüye dayanır çünkü
 * kullanıcılar Supabase Auth'a yalnızca e-posta ile kayıtlı; telefon sadece
 * profiles tablosunda tutuluyor.
 */
export async function resolveEmailFromIdentifier(
  identifier: string
): Promise<string | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) return trimmed;

  const candidates = buildPhoneCandidates(trimmed);
  if (candidates.length === 0) return null;
  const serviceClient = createServiceRoleClient();

  // Hızlı yol: bilinen biçimlerle doğrudan eşleştir (indeksli sorgu).
  const { data: byCandidate } = await serviceClient
    .from("profiles")
    .select("email")
    .in("phone", candidates)
    .limit(1)
    .maybeSingle();
  if (byCandidate?.email) return byCandidate.email;

  // Yedek: kayıtlı numara beklenmeyen biçimdeyse (boşluk, farklı önek vb.)
  // iki tarafı da E.164'e normalize edip karşılaştır. profiles küçük tablo.
  const target = normalizeStoredPhone(trimmed);
  if (target) {
    const { data: all } = await serviceClient
      .from("profiles")
      .select("email, phone")
      .not("phone", "is", null);
    const hit = all?.find((p) => normalizeStoredPhone(p.phone) === target);
    if (hit?.email) return hit.email;
  }

  return null;
}

export async function signInWithIdentifier(identifier: string, password: string) {
  const trimmed = identifier.trim();
  if (!trimmed || !password) {
    return { error: SIGN_IN_ERROR_MESSAGE };
  }

  const email = await resolveEmailFromIdentifier(trimmed);
  if (!email) {
    return { error: SIGN_IN_ERROR_MESSAGE };
  }

  const supabase = await createServerSupabaseClient();
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
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Sign out error:", error);
    return { error: formatDbError({ message: error.message }) };
  }

  // Clear all paths
  revalidatePath("/", "layout");

  return { success: true };
}

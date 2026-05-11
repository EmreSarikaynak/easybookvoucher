/**
 * Veritabanı ve Supabase hata kodlarını kullanıcıya anlamlı Türkçe mesajlara çevirir.
 */

const PG_CODE_MESSAGES: Record<string, string> = {
  "23505": "Bu kayıt zaten mevcut. Benzersiz bir değer kullanın.",
  "23503": "İlişkili bir kayıt bulunamadı veya silinmiş.",
  "23502": "Zorunlu bir alan eksik.",
  "23514": "Girilen değer kabul edilen aralıkta değil.",
  "22P02": "Geçersiz veri formatı.",
  "42P01": "Tablo bulunamadı.",
  "42501": "Bu işlem için yetkiniz yok.",
};

const AUTH_ERROR_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /user already registered|already been registered/i, message: "Bu e-posta adresi zaten kayıtlı." },
  { pattern: /invalid login credentials|invalid email or password/i, message: "E-posta veya şifre hatalı." },
  { pattern: /email not confirmed/i, message: "E-posta adresi henüz onaylanmamış." },
  { pattern: /password should be at least/i, message: "Şifre en az 6 karakter olmalıdır." },
  { pattern: /duplicate key|unique constraint|profiles_pkey/i, message: "Bu kullanıcı profili zaten mevcut." },
];

export function formatDbError(error: { code?: string; message?: string } | null): string {
  if (!error) return "Beklenmeyen bir hata oluştu.";

  const code = error.code ?? "";
  const msg = (error.message ?? "").trim();

  if (PG_CODE_MESSAGES[code]) return PG_CODE_MESSAGES[code];

  for (const { pattern, message } of AUTH_ERROR_PATTERNS) {
    if (pattern.test(msg)) return message;
  }

  // Genel unique/duplicate
  if (code === "23505" || /unique|duplicate/i.test(msg)) return "Bu kayıt zaten mevcut. Benzersiz bir değer kullanın.";

  return msg || "İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.";
}

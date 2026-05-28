/**
 * WhatsApp formatlı / Markdown benzeri zengin metin yardımcıları.
 *
 * Desteklenen söz dizimi (kullanıcının da öğrenmesi en kolay set):
 *   **bold**     veya *bold*       → <strong>bold</strong>
 *   _italic_                        → <em>italic</em>
 *   ~strike~                        → <s>strike</s>
 *   `mono`                          → <code>mono</code>
 *
 * - Çift yıldız (**) ve tek yıldız (*) ikisi de bold üretir. WhatsApp standardı
 *   tek yıldız; kullanıcılar markdown'dan alışkın olduğu için ikisi de desteklenir.
 * - Newline (\n) <br/> olarak render edilir.
 * - HTML enjeksiyonuna karşı önce kaçış yapılır; sonra biçim etiketleri eklenir.
 * - Mesajların bir reklam paneli değil duyuru olduğu varsayımıyla link auto-detect
 *   yok (basit tut; ileride ihtiyaç olursa eklenir).
 */

/** HTML kaçış. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Metni HTML olarak render edilebilir biçime çevirir.
 * Sadece bizim güvendiğimiz tag'leri ekleriz; geri kalan kullanıcı girdisi kaçırılır.
 */
export function whatsappMarkdownToHtml(input: string): string {
  if (!input) return "";

  let html = escapeHtml(input);

  // Code (`...`) — önce işlemek lazım ki içerideki * _ ~ işaretleri biçime girmesin.
  html = html.replace(
    /`([^`\n]+?)`/g,
    (_m, inner) => `<code class="px-1 py-0.5 rounded bg-muted text-[0.9em]">${inner}</code>`
  );

  // Bold: **...**  (çift yıldız önce, daha açgözlü olmasın diye non-greedy)
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");

  // Bold: *...*  (tek yıldız — WhatsApp standardı). Çift yıldız zaten üstte tüketildi.
  html = html.replace(/(^|[\s(])\*([^*\n]+?)\*(?=$|[\s.,!?)\]])/g, "$1<strong>$2</strong>");

  // Italic: _..._
  html = html.replace(/(^|[\s(])_([^_\n]+?)_(?=$|[\s.,!?)\]])/g, "$1<em>$2</em>");

  // Strike: ~...~
  html = html.replace(/(^|[\s(])~([^~\n]+?)~(?=$|[\s.,!?)\]])/g, "$1<s>$2</s>");

  // Satır sonları
  html = html.replace(/\n/g, "<br/>");

  return html;
}

/**
 * Kullanıcının yazdığı `**bold**` formatını WhatsApp'ın anladığı `*bold*`'a çevirir.
 * Diğer işaretler (_italic_, ~strike~, `mono`) zaten WhatsApp ile uyumlu.
 */
export function toWhatsAppFormat(input: string): string {
  if (!input) return "";
  // **xxx** → *xxx*  (sadece çift yıldızlı segmentleri sadeleştir)
  return input.replace(/\*\*([^*\n]+?)\*\*/g, "*$1*");
}

/**
 * Görüntülenmek üzere biçim etiketlerini soyup düz metin döner.
 * Marquee gibi tek satırlık kayan yazıda kullanılır.
 */
export function whatsappMarkdownToPlain(input: string): string {
  if (!input) return "";
  return input
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1")
    .replace(/\*([^*\n]+?)\*/g, "$1")
    .replace(/_([^_\n]+?)_/g, "$1")
    .replace(/~([^~\n]+?)~/g, "$1")
    .replace(/`([^`\n]+?)`/g, "$1");
}

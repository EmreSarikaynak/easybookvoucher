#!/usr/bin/env node
/**
 * EasyBook WhatsApp bilet şablonlarını (görsel + tüm detaylar) Twilio Content
 * API ile oluşturur ve WhatsApp onayına gönderir.
 *
 * Neden gerekli: WhatsApp 24 saat penceresi dışındaki alıcılara yalnızca ONAYLI
 * şablon iletilir ve mesaj YALNIZCA şablon gövdesindeki alanları içerebilir.
 * Bilet görseli, kalkış saati, otel, katalog linki gibi alanların müşteriye
 * ulaşması için bu alanları İÇEREN onaylı şablonlar gerekir.
 *
 * Kullanım:
 *   node scripts/create-whatsapp-templates.mjs
 *
 * .env içinde TWILIO_ACCOUNT_SID ve TWILIO_AUTH_TOKEN olmalı.
 *
 * Çıktıdaki SID'leri (onay 'approved' olunca) Cloudflare env'ine ekleyin:
 *   TWILIO_PDF_MEDIA_TEMPLATE_SID_TR
 *   TWILIO_PDF_MEDIA_TEMPLATE_SID_EN
 *   TWILIO_PDF_MEDIA_INTERNAL_TEMPLATE_SID
 *
 * Onay durumunu izlemek için: node scripts/check-twilio-templates.mjs
 *
 * NOT: Değişken sıraları src/lib/twilio-core.ts içindeki *MediaVars ile
 * birebir aynıdır. Şablon gövdesini değiştirirseniz orayı da güncelleyin.
 */
import { config } from "dotenv";
config({ path: ".env" });

const sid = process.env.TWILIO_ACCOUNT_SID;
const tok = process.env.TWILIO_AUTH_TOKEN;

if (!sid || !tok) {
  console.error("HATA: TWILIO_ACCOUNT_SID ve TWILIO_AUTH_TOKEN .env dosyasında olmalı.");
  process.exit(1);
}

const auth = "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64");

// ── Şablon gövdeleri ─────────────────────────────────────────────────────────
// {{1}} her zaman media header (bilet görseli URL'si).
const customerBodyTr =
  "Sayın {{2}}, EasyBook Tours Bodrum'a hoş geldiniz! 🎫 Biletiniz hazır.\n\n" +
  "🎫 Bilet No: {{3}}\n" +
  "🚢 Tur: {{4}}\n" +
  "📅 Tarih: {{5}}\n" +
  "🏨 Otel: {{6}}\n" +
  "📍 Alış Noktası: {{7}}\n" +
  "⏰ Alış Saati: {{8}}\n" +
  "👥 Kişi: {{9}}\n\n" +
  "📄 Biletiniz (PDF): {{10}}\n" +
  "🌍 Tüm turlarımız: {{11}}\n\n" +
  "Sorularınız için bu numaradan bize yazabilirsiniz. İyi tatiller! 🌊";

const customerBodyEn =
  "Dear {{2}}, welcome to EasyBook Tours Bodrum! 🎫 Your ticket is ready.\n\n" +
  "🎫 Ticket No: {{3}}\n" +
  "🚢 Tour: {{4}}\n" +
  "📅 Date: {{5}}\n" +
  "🏨 Hotel: {{6}}\n" +
  "📍 Pickup: {{7}}\n" +
  "⏰ Pickup Time: {{8}}\n" +
  "👥 Guests: {{9}}\n\n" +
  "📄 Your Ticket (PDF): {{10}}\n" +
  "🌍 All our tours: {{11}}\n\n" +
  "You can reach us via this number for any questions. Have a great holiday! 🌊";

const internalBodyTr =
  "📋 *YENİ BİLET KAYDI*\n\n" +
  "🎫 Bilet No: {{2}}\n" +
  "👤 Misafir: {{3}}\n" +
  "📱 Telefon: {{4}}\n" +
  "🚢 Tur: {{5}}\n" +
  "📅 Tarih: {{6}}\n" +
  "🏨 Otel: {{7}}\n" +
  "📍 Alış: {{8}}\n" +
  "⏰ Saat: {{9}}\n" +
  "👥 PAX: {{10}}\n" +
  "🏢 Acente Kodu: {{11}}\n\n" +
  "📄 PDF Bilet: {{12}}\n\n" +
  "Bu otomatik bir bildirimdir.";

const sampleImg = "https://bodrumdayiz.com.tr/voucher-pdfs/ornek.jpg";
const samplePdf = "https://bodrumdayiz.com.tr/voucher-pdfs/ornek.pdf";

const TEMPLATES = [
  {
    friendly_name: "easybook_customer_media_tr",
    language: "tr",
    envVar: "TWILIO_PDF_MEDIA_TEMPLATE_SID_TR",
    body: customerBodyTr,
    variables: {
      1: sampleImg, 2: "Ahmet Yılmaz", 3: "EBook-100", 4: "Günlük Tekne Turu",
      5: "30 Mayıs 2026 Cumartesi", 6: "Ramada Resort", 7: "Otel önü", 8: "09:30",
      9: "2 Yetişkin", 10: samplePdf, 11: "https://bodrumdayiz.com.tr/c/ABC",
    },
  },
  {
    friendly_name: "easybook_customer_media_en",
    language: "en",
    envVar: "TWILIO_PDF_MEDIA_TEMPLATE_SID_EN",
    body: customerBodyEn,
    variables: {
      1: sampleImg, 2: "John Smith", 3: "EBook-100", 4: "Daily Boat Trip",
      5: "30 May 2026 Saturday", 6: "Ramada Resort", 7: "Hotel lobby", 8: "09:30",
      9: "2 Adults", 10: samplePdf, 11: "https://bodrumdayiz.com.tr/c/ABC",
    },
  },
  {
    friendly_name: "easybook_internal_media_tr",
    language: "tr",
    envVar: "TWILIO_PDF_MEDIA_INTERNAL_TEMPLATE_SID",
    body: internalBodyTr,
    variables: {
      1: sampleImg, 2: "EBook-100", 3: "Ahmet Yılmaz", 4: "+905321234567",
      5: "Günlük Tekne Turu", 6: "30 Mayıs 2026 Cumartesi", 7: "Ramada Resort",
      8: "Otel önü", 9: "09:30", 10: "2 Yetişkin", 11: "ERK", 12: samplePdf,
    },
  },
];

async function createContent(t) {
  const res = await fetch("https://content.twilio.com/v1/Content", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      friendly_name: t.friendly_name,
      language: t.language,
      variables: Object.fromEntries(
        Object.entries(t.variables).map(([k, v]) => [k, String(v)])
      ),
      types: {
        "twilio/media": { body: t.body, media: ["{{1}}"] },
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`İçerik oluşturulamadı (${res.status}): ${JSON.stringify(data)}`);
  }
  return data.sid;
}

async function submitForWhatsAppApproval(contentSid, name) {
  const res = await fetch(
    `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests/whatsapp`,
    {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name, category: "UTILITY" }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Onaya gönderilemedi (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

console.log("EasyBook WhatsApp şablonları oluşturuluyor...\n");
const envLines = [];

for (const t of TEMPLATES) {
  try {
    const contentSid = await createContent(t);
    await submitForWhatsAppApproval(contentSid, t.friendly_name);
    console.log(`✅ ${t.friendly_name}  →  ${contentSid}  (onaya gönderildi)`);
    envLines.push(`${t.envVar}=${contentSid}`);
  } catch (err) {
    console.error(`❌ ${t.friendly_name}: ${err.message}`);
  }
}

console.log(`
Şablonlar WhatsApp onayına gönderildi (genelde birkaç dakika–saat sürer).
Onay durumunu izleyin:  node scripts/check-twilio-templates.mjs

Hepsi 'approved' olunca Cloudflare env'ine ekleyin:

${envLines.join("\n")}
`);

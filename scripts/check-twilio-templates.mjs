#!/usr/bin/env node
/**
 * Twilio Content Template onay durumlarını listeler.
 * Kullanım:
 *   node scripts/check-twilio-templates.mjs
 *
 * Çalışma için .env içinde TWILIO_ACCOUNT_SID ve TWILIO_AUTH_TOKEN olmalı.
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

const TARGETS = {
  "easybook_ticket_full_tr (müşteri TR, link'li)": "HX0e6bd3d0d29ee86d1c1610a52535e360",
  "easybook_ticket_full_en (müşteri EN, link'li)": "HX904db708f87cb544eba0e484dcc166a7",
  "easybook_ticket_internal_tr (admin/acente, link'li)": "HXe26a025a272376c6450b9ae6bec6db84",
  "voucher_confirmation_utility (geçici TR, link'siz)": "HX19a06ee7ab88346ad976f1495e31e512",
};

const PADDING = Math.max(...Object.keys(TARGETS).map((k) => k.length));

console.log("Twilio şablon onay durumları:\n");
for (const [name, contentSid] of Object.entries(TARGETS)) {
  const res = await fetch(
    `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests`,
    { headers: { Authorization: auth } }
  );
  if (!res.ok) {
    console.log(`  ${name.padEnd(PADDING)}  →  HTTP ${res.status}`);
    continue;
  }
  const data = await res.json();
  const wa = data.whatsapp || data;
  const reason = wa.rejection_reason ? `  (${wa.rejection_reason.slice(0, 80)})` : "";
  console.log(`  ${name.padEnd(PADDING)}  →  ${wa.status}${reason}`);
}

console.log(`
Hepsi 'approved' olduğunda Cloudflare'deki env'leri şu şekilde yenile:

  TWILIO_PDF_TEMPLATE_SID_TR=${TARGETS["easybook_ticket_full_tr (müşteri TR, link'li)"]}
  TWILIO_PDF_TEMPLATE_SID_EN=${TARGETS["easybook_ticket_full_en (müşteri EN, link'li)"]}
  TWILIO_PDF_INTERNAL_TEMPLATE_SID=${TARGETS["easybook_ticket_internal_tr (admin/acente, link'li)"]}
`);

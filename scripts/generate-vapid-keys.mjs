// Yeni VAPID anahtarları üretir.
// Kullanım: node scripts/generate-vapid-keys.mjs

const { subtle } = globalThis.crypto;

function b64url(buf) {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

const keyPair = await subtle.generateKey(
  { name: "ECDH", namedCurve: "P-256" },
  true,
  ["deriveBits"]
);

const publicKeyRaw = await subtle.exportKey("raw", keyPair.publicKey);
const privateKeyJwk = await subtle.exportKey("jwk", keyPair.privateKey);

console.log("\n✅ VAPID Anahtarları üretildi:\n");
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + b64url(publicKeyRaw));
console.log("VAPID_PRIVATE_KEY=" + privateKeyJwk.d);
console.log("\n⚠️  Bu anahtarları .env.local ve Cloudflare'e ekleyin.");
console.log("⚠️  Bir kez üretilmeli — değiştirirseniz kayıtlı tüm push abonelikleri geçersiz olur.\n");

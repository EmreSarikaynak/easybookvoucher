/**
 * Web Push (RFC 8030 / RFC 8291) implementation using Web Crypto API.
 * Compatible with Cloudflare Workers (no Node.js dependencies).
 */

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = ArrayBuffer.isView(buf)
    ? new Uint8Array(buf.buffer as ArrayBuffer, buf.byteOffset, buf.byteLength)
    : new Uint8Array(buf as ArrayBuffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const raw = atob(s + pad);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function concat(...arrays: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

const enc = new TextEncoder();

/**
 * HKDF implementation matching the web-push library algorithm.
 * Extract: PRK = HMAC-SHA-256(salt, ikm)
 * Expand:  T(i) = HMAC-SHA-256(PRK, T(i-1) || info || i)
 */
async function hkdf(
  salt: Uint8Array<ArrayBuffer>,
  ikm: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  length: number
): Promise<Uint8Array<ArrayBuffer>> {
  const prkKey = await crypto.subtle.importKey(
    "raw",
    salt,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prkBuf = await crypto.subtle.sign("HMAC", prkKey, ikm);
  const prk = new Uint8Array(prkBuf as ArrayBuffer);

  const expKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const results: Uint8Array<ArrayBuffer>[] = [];
  let prev = new Uint8Array(new ArrayBuffer(0));
  let totalLen = 0;
  let counter = 0;

  while (totalLen < length) {
    counter++;
    const ctr = new Uint8Array(new ArrayBuffer(1));
    ctr[0] = counter;
    const data = concat(prev, info, ctr);
    const block = await crypto.subtle.sign("HMAC", expKey, data);
    prev = new Uint8Array(block as ArrayBuffer);
    results.push(prev);
    totalLen += prev.length;
  }

  return concat(...results).slice(0, length) as Uint8Array<ArrayBuffer>;
}

/**
 * Encrypt a Web Push message using RFC 8291 (aes128gcm Content-Encoding).
 */
export async function encryptWebPush(
  message: string,
  clientPublicKeyB64: string,
  authSecretB64: string
): Promise<{ body: Uint8Array<ArrayBuffer> }> {
  const plaintext = enc.encode(message) as unknown as Uint8Array<ArrayBuffer>;
  const clientPublicKey = b64urlDecode(clientPublicKeyB64);
  const auth = b64urlDecode(authSecretB64);

  const saltBuf = new Uint8Array(new ArrayBuffer(16));
  crypto.getRandomValues(saltBuf);

  const serverKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const serverPubRaw = await crypto.subtle.exportKey("raw", serverKP.publicKey);
  const serverPublicKey = new Uint8Array(serverPubRaw as ArrayBuffer);

  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey },
    serverKP.privateKey!,
    256
  );
  const sharedSecret = new Uint8Array(sharedBits as ArrayBuffer);

  // IKM
  const keyInfo = concat(
    enc.encode("WebPush: info\x00") as unknown as Uint8Array<ArrayBuffer>,
    clientPublicKey,
    serverPublicKey
  );
  const ikm = await hkdf(auth, sharedSecret, keyInfo, 32);

  // CEK (16 bytes)
  const cek = await hkdf(
    saltBuf,
    ikm,
    enc.encode("Content-Encoding: aes128gcm\x00\x01") as unknown as Uint8Array<ArrayBuffer>,
    16
  );

  // Nonce (12 bytes)
  const nonce = await hkdf(
    saltBuf,
    ikm,
    enc.encode("Content-Encoding: nonce\x00\x01") as unknown as Uint8Array<ArrayBuffer>,
    12
  );

  // AES-128-GCM: plaintext + 0x02 record delimiter
  const delim = new Uint8Array(new ArrayBuffer(1));
  delim[0] = 0x02;
  const padded = concat(plaintext, delim);

  const cekKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    cekKey,
    padded
  );
  const ciphertext = new Uint8Array(ciphertextBuf as ArrayBuffer);

  // aes128gcm header: salt(16) | rs(4,be) | keylen(1) | serverPublicKey(65)
  const headerBuf = new ArrayBuffer(16 + 4 + 1 + serverPublicKey.length);
  const header = new Uint8Array(headerBuf);
  header.set(saltBuf, 0);
  new DataView(headerBuf).setUint32(16, 4096, false);
  header[20] = serverPublicKey.length;
  header.set(serverPublicKey, 21);

  return { body: concat(header, ciphertext) };
}

/**
 * Create a VAPID JWT (ES256) for the Authorization header.
 */
export async function createVapidJwt(
  vapidPrivateKeyB64: string,
  vapidPublicKeyB64: string,
  audience: string,
  subject: string
): Promise<string> {
  const pubBytes = b64urlDecode(vapidPublicKeyB64);
  const x = b64url(pubBytes.slice(1, 33));
  const y = b64url(pubBytes.slice(33, 65));

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: vapidPrivateKeyB64, x, y, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = b64url(
    enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))
  );
  const payload = b64url(
    enc.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 86400,
        sub: subject,
      })
    )
  );

  const signingInput = `${header}.${payload}`;
  const sigBuf = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    enc.encode(signingInput)
  );

  return `${signingInput}.${b64url(sigBuf)}`;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Send a Web Push notification to a single subscription endpoint.
 */
export async function sendWebPush(
  subscription: PushSubscriptionData,
  payload: PushNotificationPayload,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  vapidSubject: string
): Promise<{ success: boolean; statusCode: number; error?: string }> {
  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

  const jwt = await createVapidJwt(
    vapidPrivateKey,
    vapidPublicKey,
    audience,
    vapidSubject
  );

  const { body } = await encryptWebPush(
    JSON.stringify(payload),
    subscription.keys.p256dh,
    subscription.keys.auth
  );

  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
      },
      body: body.buffer as ArrayBuffer,
    });

    if (response.ok || response.status === 201) {
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text().catch(() => "");
    return {
      success: false,
      statusCode: response.status,
      error: errorText,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

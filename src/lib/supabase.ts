import { createBrowserClient } from "@supabase/ssr";

type BrowserClient = ReturnType<typeof createBrowserClient>;
let cached: BrowserClient | undefined;

export function createClient(): BrowserClient {
  if (!cached) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      console.error(
        "❌ Supabase Client Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing! " +
        "If you are deploying on Cloudflare Pages, make sure to add these to the environment variables " +
        "in your Cloudflare Dashboard and trigger a NEW deployment (Rebuild)."
      );
    }

    cached = createBrowserClient(
      url || "",
      anonKey || "",
      {
        auth: {
          // navigator.locks deadlock'u bypass et — tek-sekme varsayımıyla no-op lock
          lock: async (_name, _acquireTimeout, fn) => fn(),
        },
      }
    );
  }
  return cached;
}

import { createBrowserClient } from "@supabase/ssr";

type BrowserClient = ReturnType<typeof createBrowserClient>;
let cached: BrowserClient | undefined;

export function createClient(): BrowserClient {
  if (!cached) {
    cached = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

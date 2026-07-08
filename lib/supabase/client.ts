// Supabase browser client — for login/signup/logout in client components.
// Stores the session in cookies (via @supabase/ssr) so the server can read it.
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Supabase service-role client — SERVER ONLY. Full admin access (bypasses RLS,
// can list/manage auth users). Never import into client components.
import { createClient } from "@supabase/supabase-js";

export function supabaseAdminConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

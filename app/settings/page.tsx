import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db, dbConfigured } from "@/lib/db";
import { gravatarUrl } from "@/lib/gravatar";
import { SettingsView } from "./SettingsView";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SettingsPage() {
  if (!dbConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Set <code>DATABASE_URL</code> to use settings.
        </p>
      </div>
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const profile = await db.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email ?? null },
    update: {},
    select: {
      name: true,
      workspaceName: true,
      notifyConversion: true,
      notifyDeployment: true,
      notifyProduct: true,
    },
  });

  return (
    <SettingsView
      email={user.email ?? ""}
      avatarUrl={gravatarUrl(user.email ?? "")}
      emailVerified={!!user.email_confirmed_at}
      name={profile.name || ""}
      workspaceName={profile.workspaceName || "Personal workspace"}
      notifyConversion={profile.notifyConversion}
      notifyDeployment={profile.notifyDeployment}
      notifyProduct={profile.notifyProduct}
    />
  );
}

import { headers } from "next/headers";
import { listJobs } from "@/lib/store";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const jobs = await listJobs().catch(() => []);
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  return <AdminDashboard jobs={jobs} baseUrl={baseUrl} />;
}

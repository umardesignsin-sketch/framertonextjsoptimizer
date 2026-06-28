// Deploy a static bundle to Netlify or Vercel using the user's own token.
// A fresh site/deployment is created per deploy. Output is pure static .html +
// assets, so no build step runs on either host.
import type { ConvertedFile } from "./types";
import { zipBundle } from "./bundle";

export interface DeployResult {
  url: string;
  adminUrl?: string;
  provider: "netlify" | "vercel";
}

export async function deployNetlify(
  token: string,
  files: ConvertedFile[],
  name?: string
): Promise<DeployResult> {
  // 1. Create a fresh site.
  const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(name ? { name } : {}),
  });
  if (!createRes.ok) {
    throw new Error(
      `Netlify site creation failed (${createRes.status}): ${await safeText(createRes)}`
    );
  }
  const site = (await createRes.json()) as {
    id: string;
    ssl_url?: string;
    url?: string;
    admin_url?: string;
  };

  // 2. Zip-deploy. Netlify serves the zip contents AS-IS (no build) — exactly
  //    what we want for prebuilt static files.
  const zip = await zipBundle(files);
  const deployRes = await fetch(
    `https://api.netlify.com/api/v1/sites/${site.id}/deploys`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/zip",
      },
      body: new Uint8Array(zip),
    }
  );
  if (!deployRes.ok) {
    throw new Error(
      `Netlify deploy failed (${deployRes.status}): ${await safeText(deployRes)}`
    );
  }
  const deploy = (await deployRes.json()) as {
    ssl_url?: string;
    deploy_ssl_url?: string;
  };

  return {
    provider: "netlify",
    url: site.ssl_url || site.url || deploy.ssl_url || "",
    adminUrl: site.admin_url,
  };
}

export async function deployVercel(
  token: string,
  files: ConvertedFile[],
  name?: string,
  teamId?: string
): Promise<DeployResult> {
  const projectName = (name || "framer-optimized-" + Date.now().toString(36))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 52);

  const inlineFiles = files.map((f) => {
    const path = f.path.replace(/^\/+/, "");
    if (f.binary) {
      return { file: path, data: f.binary.toString("base64"), encoding: "base64" as const };
    }
    return { file: path, data: f.content ?? "", encoding: "utf-8" as const };
  });

  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const res = await fetch(`https://api.vercel.com/v13/deployments${qs}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      files: inlineFiles,
      target: "production",
      projectSettings: { framework: null },
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Vercel deploy failed (${res.status}): ${await safeText(res)}`
    );
  }
  const dep = (await res.json()) as { url?: string; id?: string };
  return {
    provider: "vercel",
    url: dep.url ? `https://${dep.url}` : "",
    adminUrl: dep.id
      ? `https://vercel.com/dashboard`
      : undefined,
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "(no body)";
  }
}

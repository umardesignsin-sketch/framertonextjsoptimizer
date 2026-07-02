// Deploy a static bundle to Netlify or Vercel using the user's own token.
// A fresh site/deployment is created per deploy. Output is pure static .html +
// assets, so no build step runs on either host.
import type { ConvertedFile } from "./types";
import { zipBundle } from "./bundle";

export interface DeployResult {
  url: string;
  adminUrl?: string;
  provider: "netlify" | "vercel";
  /** Redeploy target: Netlify site id / Vercel project name. */
  externalId?: string;
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
  const deploy = await netlifyZipDeploy(token, site.id, files);

  return {
    provider: "netlify",
    url: site.ssl_url || site.url || deploy.ssl_url || "",
    adminUrl: site.admin_url,
    externalId: site.id,
  };
}

async function netlifyZipDeploy(
  token: string,
  siteId: string,
  files: ConvertedFile[]
): Promise<{ ssl_url?: string; deploy_ssl_url?: string }> {
  const zip = await zipBundle(files);
  const deployRes = await fetch(
    `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
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
  return (await deployRes.json()) as { ssl_url?: string; deploy_ssl_url?: string };
}

/** Redeploys updated files to an EXISTING Netlify site (same URL). */
export async function redeployNetlify(
  token: string,
  siteId: string,
  files: ConvertedFile[]
): Promise<DeployResult> {
  const deploy = await netlifyZipDeploy(token, siteId, files);
  const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const site = siteRes.ok
    ? ((await siteRes.json()) as { ssl_url?: string; url?: string; admin_url?: string })
    : {};
  return {
    provider: "netlify",
    url: site.ssl_url || site.url || deploy.ssl_url || deploy.deploy_ssl_url || "",
    adminUrl: site.admin_url,
    externalId: siteId,
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
    // Deploying again with the same project name lands on the same project,
    // so the name is the redeploy target.
    externalId: projectName,
  };
}

/** Redeploys updated files to an EXISTING Vercel project (same project name). */
export async function redeployVercel(
  token: string,
  projectName: string,
  files: ConvertedFile[],
  teamId?: string
): Promise<DeployResult> {
  return deployVercel(token, files, projectName, teamId);
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "(no body)";
  }
}

"use client";

import { useState } from "react";

const BOT_PRESETS = [
  { id: "all", label: "All crawlers (*)", value: "*" },
  { id: "googlebot", label: "Googlebot", value: "Googlebot" },
  { id: "bingbot", label: "Bingbot", value: "Bingbot" },
  { id: "gptbot", label: "GPTBot (OpenAI)", value: "GPTBot" },
  { id: "ccbot", label: "CCBot (Common Crawl)", value: "CCBot" },
  { id: "claudebot", label: "ClaudeBot (Anthropic)", value: "ClaudeBot" },
];

type Rule = { agent: string; allow: boolean };

export function RobotsTxtGenerator() {
  const [mode, setMode] = useState<"allow-all" | "block-all" | "custom">("allow-all");
  const [rules, setRules] = useState<Rule[]>([{ agent: "*", allow: true }]);
  const [disallowPaths, setDisallowPaths] = useState("/admin\n/api");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [copied, setCopied] = useState(false);

  function toggleBot(agent: string, checked: boolean) {
    setRules((prev) => {
      const exists = prev.some((r) => r.agent === agent);
      if (checked && !exists) return [...prev, { agent, allow: true }];
      if (!checked) return prev.filter((r) => r.agent !== agent);
      return prev;
    });
  }
  function setBotAllow(agent: string, allow: boolean) {
    setRules((prev) => prev.map((r) => (r.agent === agent ? { ...r, allow } : r)));
  }

  const output = (() => {
    if (mode === "allow-all") {
      const lines = ["User-agent: *", "Allow: /"];
      if (sitemapUrl.trim()) lines.push("", `Sitemap: ${sitemapUrl.trim()}`);
      return lines.join("\n");
    }
    if (mode === "block-all") {
      return ["User-agent: *", "Disallow: /"].join("\n");
    }
    const paths = disallowPaths
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    const blocks = rules.map((r) => {
      const lines = [`User-agent: ${r.agent}`];
      if (!r.allow) {
        lines.push("Disallow: /");
      } else if (paths.length) {
        paths.forEach((p) => lines.push(`Disallow: ${p}`));
      } else {
        lines.push("Allow: /");
      }
      return lines.join("\n");
    });
    if (sitemapUrl.trim()) blocks.push(`Sitemap: ${sitemapUrl.trim()}`);
    return blocks.join("\n\n");
  })();

  function copy() {
    navigator.clipboard?.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  function download() {
    const blob = new Blob([output], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "robots.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["allow-all", "Allow everything"],
            ["block-all", "Block everything"],
            ["custom", "Custom rules"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              mode === id
                ? "bg-foreground text-background"
                : "border border-border-strong text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "custom" && (
        <div className="mt-4 space-y-4">
          <div>
            <span className="text-[12px] font-medium text-muted-foreground">Crawlers to configure</span>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {BOT_PRESETS.map((bot) => {
                const rule = rules.find((r) => r.agent === bot.value);
                return (
                  <label key={bot.id} className="flex items-center gap-1.5 text-[13px]">
                    <input
                      type="checkbox"
                      checked={!!rule}
                      onChange={(e) => toggleBot(bot.value, e.target.checked)}
                    />
                    {bot.label}
                    {rule && (
                      <select
                        value={rule.allow ? "allow" : "block"}
                        onChange={(e) => setBotAllow(bot.value, e.target.value === "allow")}
                        className="ml-1 rounded border border-border-strong bg-background px-1.5 py-0.5 text-[12px]"
                      >
                        <option value="allow">allow</option>
                        <option value="block">block</option>
                      </select>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-[12px] font-medium text-muted-foreground">
              Paths to disallow (one per line, applied to allowed crawlers)
            </span>
            <textarea
              value={disallowPaths}
              onChange={(e) => setDisallowPaths(e.target.value)}
              rows={4}
              spellCheck={false}
              className="mt-1 w-full rounded-lg border border-border-strong bg-background px-3 py-2 font-mono text-[13px] outline-none focus:border-foreground"
            />
          </label>
        </div>
      )}

      <label className="mt-4 block">
        <span className="text-[12px] font-medium text-muted-foreground">Sitemap URL (optional)</span>
        <input
          type="url"
          value={sitemapUrl}
          onChange={(e) => setSitemapUrl(e.target.value)}
          placeholder="https://example.com/sitemap.xml"
          spellCheck={false}
          className="mt-1 h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-[14px] outline-none focus:border-foreground"
        />
      </label>

      <div className="mt-4">
        <span className="text-[12px] font-medium text-muted-foreground">robots.txt</span>
        <pre className="mt-1 overflow-x-auto rounded-lg border border-border bg-muted p-3 font-mono text-[13px] leading-relaxed">
{output}
        </pre>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={copy}
          className="rounded-md border border-border-strong px-3 py-1.5 text-[12px] hover:border-foreground"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button
          onClick={download}
          className="rounded-md border border-border-strong px-3 py-1.5 text-[12px] hover:border-foreground"
        >
          Download robots.txt
        </button>
      </div>
    </div>
  );
}

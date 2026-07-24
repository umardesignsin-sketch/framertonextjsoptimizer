// Minimal, dependency-free User-Agent sniffing for signup analytics.
// Deliberately hand-rolled rather than a library — the set of things we
// actually need (rough device/browser/OS buckets) is small and stable.
//
// Honest limitation: several Chromium-based browsers (Arc, Brave in its
// default config, Vivaldi) present as plain "Chrome" in their UA string on
// purpose, for site-compatibility reasons. They are NOT distinguishable from
// real Chrome by UA alone — this reports them as "Chrome", not a guess at
// their real identity.
export interface UaInfo {
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
}

export function parseUserAgent(ua: string | null | undefined): UaInfo {
  const s = ua || "";

  // Order matters: more specific checks must come before broader ones that
  // would otherwise false-match (e.g. Edge and Opera UAs both contain "Chrome/").
  let browser = "Other";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/CriOS\//.test(s)) browser = "Chrome"; // Chrome on iOS
  else if (/FxiOS\//.test(s)) browser = "Firefox"; // Firefox on iOS
  else if (/Chrome\//.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s) && /Version\//.test(s)) browser = "Safari";

  // iOS/iPadOS UAs contain "like Mac OS X" — check device-specific tokens
  // before the generic "Mac OS X" match.
  let os = "Other";
  if (/iPhone|iPad|iPod/.test(s)) os = "iOS";
  else if (/Android/.test(s)) os = "Android";
  else if (/Windows NT/.test(s)) os = "Windows";
  else if (/Mac OS X/.test(s)) os = "macOS";
  else if (/CrOS/.test(s)) os = "ChromeOS";
  else if (/Linux/.test(s)) os = "Linux";

  // Note: iPadOS 13+ Safari defaults to a desktop-class UA indistinguishable
  // from macOS (no "iPad" token at all) unless the site opts out of it —
  // those will be reported as "desktop", not "tablet". A real UA limitation,
  // not a bug in this parser.
  let device: UaInfo["device"] = "desktop";
  if (/iPad/.test(s)) device = "tablet";
  else if (/Android/.test(s)) device = /Mobile/.test(s) ? "mobile" : "tablet";
  else if (/Mobi|iPhone/.test(s)) device = "mobile";

  return { device, browser, os };
}

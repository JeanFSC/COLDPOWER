// Offline MaxMind-derived lookup (geoip-lite bundles its own database, no
// network call per audit row). Loopback/private ranges never resolve, which
// is correct — local/dev traffic has no real geography.
//
// geoip-lite's published engines range currently excludes this project's
// Node version, so `pnpm install` may skip it entirely (it's registered as
// serverExternalPackages, resolved from node_modules at runtime rather than
// bundled). A missing/incompatible install must degrade to "unknown
// geography" — not throw at import time and take down every caller of
// audit-repository.ts — so this is loaded lazily and defensively.
type GeoipModule = { lookup(ip: string): { city?: string; country?: string } | null };
let geoipModule: GeoipModule | null | undefined;
function loadGeoip(): GeoipModule | null {
  if (geoipModule !== undefined) return geoipModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    geoipModule = require("geoip-lite") as GeoipModule;
  } catch {
    geoipModule = null;
  }
  return geoipModule;
}

export function geoLabel(ip: string | null | undefined): { city: string | null; country: string | null } {
  if (!ip) return { city: null, country: null };
  const clean = ip.split(",")[0]?.trim();
  if (!clean || clean === "::1" || clean.startsWith("127.") || clean.startsWith("10.") || clean.startsWith("192.168.")) {
    return { city: null, country: null };
  }
  const geoip = loadGeoip();
  if (!geoip) return { city: null, country: null };
  const result = geoip.lookup(clean);
  if (!result) return { city: null, country: null };
  return { city: result.city || null, country: result.country || null };
}

const uaPatterns: Array<{ name: string; regex: RegExp }> = [
  { name: "Edge", regex: /Edg\/([\d.]+)/ },
  { name: "Chrome", regex: /Chrome\/([\d.]+)/ },
  { name: "Firefox", regex: /Firefox\/([\d.]+)/ },
  { name: "Safari", regex: /Version\/([\d.]+).*Safari/ },
];

// Minimal, dependency-free UA parse: enough to label the browser in the audit
// drawer without pulling in a full parser for a display-only field.
export function browserLabel(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  for (const { name, regex } of uaPatterns) {
    const match = userAgent.match(regex);
    if (match) return `${name} ${match[1]}`;
  }
  return null;
}

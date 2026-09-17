import type { NextConfig } from "next";

const allowIframePreview = process.env.COLDPOWER_ALLOW_IFRAME_PREVIEW === "true";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["dev.coldpower.pe"],
  // geoip-lite reads its bundled .dat files via a path relative to its own module
  // location at require-time; bundling it rewrites that path and breaks the lookup
  // (see node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md).
  serverExternalPackages: ["geoip-lite"],
  experimental: { cpus: 1, workerThreads: true, webpackBuildWorker: false, parallelServerCompiles: false, parallelServerBuildTraces: false },
  async headers() {
    return [
      {
        // X-Frame-Options: DENY applies to every route unconditionally,
        // including /admin/*. This must never be relaxed site-wide — a prior
        // version of this config omitted DENY globally whenever the CMS
        // iframe preview flag was on, which also disabled clickjacking
        // protection for the authenticated admin panel.
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      ...(allowIframePreview
        ? [
            {
              // Only the public homepage itself may be framed, and only by
              // our own origin (the admin CMS "Vista previa del sitio"
              // iframe). CSP frame-ancestors takes precedence over the
              // X-Frame-Options: DENY set above when both are present, so
              // this scoped exception doesn't weaken protection anywhere
              // else, including /admin/*.
              source: "/",
              headers: [
                {
                  key: "Content-Security-Policy",
                  value: "frame-ancestors 'self'",
                },
              ],
            },
          ]
        : []),
    ];
  },
};

export default nextConfig;

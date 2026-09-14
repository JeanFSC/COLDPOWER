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
          ...(!allowIframePreview
            ? [
                {
                  key: "X-Frame-Options",
                  value: "DENY",
                },
              ]
            : []),
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const allowIframePreview = process.env.COLDPOWER_ALLOW_IFRAME_PREVIEW === "true";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["dev.coldpower.pe"],
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

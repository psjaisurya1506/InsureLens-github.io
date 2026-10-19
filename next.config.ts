import type { NextConfig } from "next";

// GitHub Pages serves the site from https://<user>.github.io/<repo>/, so the static
// export needs a base path. The workflow sets GITHUB_PAGES=true and NEXT_PUBLIC_BASE_PATH
// to "/<repo-name>" automatically. Vercel and local dev run at the domain root (no base path).
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? process.env.NEXT_PUBLIC_BASE_PATH ?? "" : "";

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath,
        assetPrefix: basePath ? `${basePath}/` : undefined,
      }
    : {}),
  // Lets you open the dev server via 127.0.0.1 as well as localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

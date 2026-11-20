import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: false,
  // Signed-in pages must not be cached, so the Back button cannot recover
  // them after sign out (01-requirements.md AC-08, 02-design.md §2 rule 8).
  async headers() {
    return [
      {
        source: "/:section(employee|supervisor|hr|admin)/:rest*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
  turbopack: {
    root: projectRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

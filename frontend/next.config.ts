import type { NextConfig } from "next";

/**
 * When BACKEND_ORIGIN is set, the browser talks to this app's own /api path and
 * Next forwards it on. That keeps the session cookie first-party - a cookie set
 * on a different domain needs SameSite=None, and browsers are increasingly
 * happy to drop those - and it means there is no CORS in the deployed setup at
 * all.
 *
 * Locally nothing changes: the variable is unset, no rewrite is added, and the
 * frontend calls http://localhost:4000/api directly through NEXT_PUBLIC_API_URL.
 */
const backendOrigin = process.env.BACKEND_ORIGIN?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendOrigin) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

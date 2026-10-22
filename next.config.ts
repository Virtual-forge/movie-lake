import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    /**
     * Legacy demo pages now live on the TMDB engine; old /title/[slug] links
     * point at the real /movie/[id] or /tv/[id] pages (ids verified against
     * catalog metadata in October 2026).
     */
    return [
      { source: "/title/fallout", destination: "/tv/106379", permanent: true },
      { source: "/title/pluribus", destination: "/tv/225171", permanent: true },
      { source: "/title/his-and-hers", destination: "/tv/259731", permanent: true },
      { source: "/title/tell-me-lies", destination: "/tv/130464", permanent: true },
      { source: "/title/the-night-manager", destination: "/tv/61859", permanent: true },
      { source: "/title/the-pitt", destination: "/tv/250307", permanent: true },
      { source: "/title/dune-part-two", destination: "/movie/693134", permanent: true },
      { source: "/title/tron-ares", destination: "/movie/533533", permanent: true },
      { source: "/title/avatar-the-way-of-water", destination: "/movie/76600", permanent: true },
      { source: "/title/greenland-migration", destination: "/movie/840464", permanent: true },
      { source: "/title/xxx", destination: "/movie/7451", permanent: true },
      { source: "/title/the-internship", destination: "/movie/116741", permanent: true },
      { source: "/title/marty-supreme", destination: "/movie/1317288", permanent: true },
      { source: "/title/pillion", destination: "/movie/1287141", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "static.tvmaze.com", pathname: "/uploads/images/**" },
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/**" },
      { protocol: "https", hostname: "is1-ssl.mzstatic.com", pathname: "/image/thumb/**" },
    ],
  },
  async headers() {
    /**
     * Watch-page embed policy (docs/PROJECT_PLAN.md → Security): the site
     * only frames its two verified video hosts — the privacy-friendly
     * YouTube trailer embed and the Internet Archive free-film player.
     * frame-src alone, so hydration/inline scripts stay untouched.
     */
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-src https://www.youtube-nocookie.com https://archive.org",
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

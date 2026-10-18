import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // `image.tmdb.org` is deliberately absent. Every TMDB image in the app is `unoptimized`,
    // so the browser fetches the CDN directly and needs no allowlist entry -- posters,
    // backdrops, cast avatars and provider logos alike.
    //
    // It used to be listed here, and the provider logos were the one TMDB image without
    // `unoptimized`, which sent them through this optimizer. Its server-side fetch of the TMDB
    // CDN is rejected from Vercel's infrastructure, so on the deployment they rendered as
    // broken-image glyphs while every other TMDB image loaded fine. Leaving the pattern out
    // means the next TMDB image added without `unoptimized` fails loudly here instead of
    // silently breaking in production.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
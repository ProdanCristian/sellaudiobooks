import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.75"],

  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['app', 'components', 'lib']
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "graph.facebook.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "65159395407fee3da9935f6bcd84eb64.r2.cloudflarestorage.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pub-69dd0729934f48d7846c61d339d8b69e.r2.dev",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pub-334b909a9d3d41a69d80729391954a40.r2.dev",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "tempfile.aiquickdraw.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "d2p7pge43lyniu.cloudfront.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "d1q70pf5vjeyhc.cloudfront.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "public-platform.r2.fish.audio",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.aimlapi.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

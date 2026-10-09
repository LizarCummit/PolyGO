import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: true, // Enables strict mode for React
  compiler: {
    styledComponents: true, // Enables support for styled-components if needed
  },
  images: {
    domains: ["localhost"], // Add any external domains for images if necessary
  },
};

export default nextConfig;

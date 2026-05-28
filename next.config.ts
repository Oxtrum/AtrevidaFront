import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure allowed image quality values so next/image warnings are resolved.
  // The app uses explicit Image quality values, so keep them in the allowlist.
  images: {
    qualities: [100, 75, 72],
  },
};

export default nextConfig;

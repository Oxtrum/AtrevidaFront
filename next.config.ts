import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure allowed image quality values so next/image warnings are resolved.
  // The app uses quality={100} in some Image components, so include 100 and 75.
  images: {
    qualities: [100, 75],
  },
};

export default nextConfig;

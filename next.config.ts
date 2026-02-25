import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    appIsrStatus: false, // Hides the static/ISR indicator ("N" logo)
    buildActivity: false, // Hides the compiling indicator
  },
};

export default nextConfig;

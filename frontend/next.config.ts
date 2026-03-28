import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@getpara/core-sdk",
    "@getpara/evm-wallet-connectors",
    "@getpara/react-common",
    "@getpara/react-sdk-lite",
    "@getpara/wagmi-v2-integration",
    "@getpara/wagmi-v2-connector",
    "@getpara/web-sdk",
  ],
};

export default nextConfig;

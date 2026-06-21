import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@base-org/account": false,
      "@metamask/connect-evm": false,
      "@walletconnect/ethereum-provider": false,
      accounts: false,
      porto: false,
      "porto/internal": false
    };

    return config;
  }
};

export default nextConfig;

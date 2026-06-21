export const SONEIUM_MAINNET = {
  id: 1868,
  hexChainId: "0x74c",
  name: "Soneium Mainnet",
  rpcUrl: "https://rpc.soneium.org/",
  explorerUrl: "https://soneium.blockscout.com",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  }
} as const;

export const SONEIUM_MINATO = {
  id: 1946,
  hexChainId: "0x79a",
  name: "Soneium Minato",
  rpcUrl: "https://rpc.minato.soneium.org",
  explorerUrl: "https://soneium-minato.blockscout.com",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18
  }
} as const;

export const DEFAULT_CHAIN = SONEIUM_MAINNET;

export const FAUCET_CHAINS = [SONEIUM_MAINNET, SONEIUM_MINATO] as const;

export type FaucetChainId = (typeof FAUCET_CHAINS)[number]["id"];

export function getFaucetChain(chainId: number) {
  return FAUCET_CHAINS.find((chain) => chain.id === chainId) || null;
}

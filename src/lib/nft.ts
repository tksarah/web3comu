import { createPublicClient, defineChain, getAddress, http, parseUnits, type Address } from "viem";

import type { NftConfig } from "@/lib/types";

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }]
  }
] as const;

const erc721Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }]
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }]
  }
] as const;

const erc1155Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" }
    ],
    outputs: [{ name: "balance", type: "uint256" }]
  }
] as const;

export type NftVerificationResult = {
  ok: boolean;
  reason?: string;
};

function createConfiguredClient(config: NftConfig) {
  const chain = defineChain({
    id: config.chainId,
    name: `Configured chain ${config.chainId}`,
    nativeCurrency: { decimals: 18, name: "Native", symbol: "ETH" },
    rpcUrls: {
      default: { http: [config.rpcUrl] }
    }
  });

  return createPublicClient({
    chain,
    transport: http(config.rpcUrl)
  });
}

function parseTokenId(tokenId: string | null) {
  if (!tokenId) {
    throw new Error("tokenId is required.");
  }
  return BigInt(tokenId);
}

function parseIntegerBalance(minBalance: string) {
  return BigInt(minBalance);
}

export async function verifyNftOwnership(
  walletAddress: string,
  config: NftConfig
): Promise<NftVerificationResult> {
  if (!config.enabled) {
    return { ok: false, reason: "トークン条件が管理画面で有効化されていません。" };
  }
  if (!config.rpcUrl || !config.contractAddress) {
    return { ok: false, reason: "トークン条件のRPC URLまたはコントラクトアドレスが未設定です。" };
  }

  try {
    const wallet = getAddress(walletAddress) as Address;
    const contractAddress = getAddress(config.contractAddress) as Address;
    const client = createConfiguredClient(config);

    if (config.standard === "erc20") {
      const balance = await client.readContract({
        address: contractAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [wallet]
      });
      return BigInt(balance) >= parseUnits(config.minBalance, config.tokenDecimals)
        ? { ok: true }
        : { ok: false, reason: "必要なERC-20トークン残高を確認できませんでした。" };
    }

    if (config.standard === "erc1155") {
      const balance = await client.readContract({
        address: contractAddress,
        abi: erc1155Abi,
        functionName: "balanceOf",
        args: [wallet, parseTokenId(config.tokenId)]
      });
      return BigInt(balance) >= parseIntegerBalance(config.minBalance)
        ? { ok: true }
        : { ok: false, reason: "必要なERC-1155トークン残高を確認できませんでした。" };
    }

    if (config.checkMode === "tokenOwner") {
      const owner = await client.readContract({
        address: contractAddress,
        abi: erc721Abi,
        functionName: "ownerOf",
        args: [parseTokenId(config.tokenId)]
      });
      return getAddress(owner).toLowerCase() === wallet.toLowerCase()
        ? { ok: true }
        : { ok: false, reason: "指定ERC-721 tokenIdの所有者が接続ウォレットと一致しません。" };
    }

    const balance = await client.readContract({
      address: contractAddress,
      abi: erc721Abi,
      functionName: "balanceOf",
      args: [wallet]
    });
    return BigInt(balance) >= BigInt(config.minBalance)
      ? { ok: true }
      : { ok: false, reason: "必要なトークンの保有を確認できませんでした。" };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error
          ? `トークン検証に失敗しました: ${error.message}`
          : "トークン検証に失敗しました。RPC、chainId、コントラクト設定を確認してください。"
    };
  }
}

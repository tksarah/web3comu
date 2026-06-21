import { createPublicClient, defineChain, formatUnits, getAddress, http, isAddress, type Address } from "viem";

import { SONEIUM_MINATO } from "@/lib/chains";

export const BMT_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_BMT_TOKEN_ADDRESS || "") as Address;
export const BMT_DECIMALS = 18;
export const BMT_GAS_LIMITS = {
  transfer: 100_000n,
  mint: 180_000n,
  setMinter: 80_000n,
  setLoginBonus: 80_000n,
  claimLoginBonus: 180_000n
} as const;

export const bmtChain = defineChain({
  id: SONEIUM_MINATO.id,
  name: SONEIUM_MINATO.name,
  nativeCurrency: SONEIUM_MINATO.nativeCurrency,
  rpcUrls: {
    default: {
      http: [SONEIUM_MINATO.rpcUrl]
    }
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: SONEIUM_MINATO.explorerUrl
    }
  },
  testnet: true
});

export const bmtPublicClient = createPublicClient({
  chain: bmtChain,
  transport: http(SONEIUM_MINATO.rpcUrl)
});

export type BmtPortalStatus = {
  balance: bigint;
  canClaimLoginBonus: boolean;
  lastLoginBonusDay: bigint;
  currentJstDay: bigint;
  loginBonusClaimedToday: boolean;
};

export const bmtAbi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "cap",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "claimLoginBonus",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    type: "function",
    name: "canClaimLoginBonus",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "lastLoginBonusDay",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "loginBonusEnabled",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "loginBonusAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "loginBonusMinBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "minters",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "setLoginBonusEnabled",
    stateMutability: "nonpayable",
    inputs: [{ name: "enabled", type: "bool" }],
    outputs: []
  },
  {
    type: "function",
    name: "setLoginBonusAmount",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "setLoginBonusMinBalance",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "setMinter",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "enabled", type: "bool" }
    ],
    outputs: []
  }
] as const;

export function isBmtConfigured() {
  return isAddress(BMT_TOKEN_ADDRESS);
}

export function formatBmtAmount(value: bigint) {
  return `${formatUnits(value, BMT_DECIMALS)} BMT`;
}

export async function getBmtPortalStatus(walletAddress: string): Promise<BmtPortalStatus | null> {
  if (!isBmtConfigured() || !isAddress(walletAddress)) {
    return null;
  }

  try {
    const account = getAddress(walletAddress) as Address;
    const block = await bmtPublicClient.getBlock();
    const currentJstDay = (block.timestamp + 9n * 60n * 60n) / 86_400n;
    const [balance, canClaimLoginBonus, lastLoginBonusDay] = await Promise.all([
      bmtPublicClient.readContract({
        address: BMT_TOKEN_ADDRESS,
        abi: bmtAbi,
        functionName: "balanceOf",
        args: [account]
      }),
      bmtPublicClient.readContract({
        address: BMT_TOKEN_ADDRESS,
        abi: bmtAbi,
        functionName: "canClaimLoginBonus",
        args: [account]
      }),
      bmtPublicClient.readContract({
        address: BMT_TOKEN_ADDRESS,
        abi: bmtAbi,
        functionName: "lastLoginBonusDay",
        args: [account]
      })
    ]);

    return {
      balance,
      canClaimLoginBonus,
      lastLoginBonusDay,
      currentJstDay,
      loginBonusClaimedToday: lastLoginBonusDay === currentJstDay
    };
  } catch {
    return null;
  }
}

export function bmtTxUrl(txHash: string) {
  return `${SONEIUM_MINATO.explorerUrl}/tx/${txHash}`;
}

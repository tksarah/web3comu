export type SessionRole = "member" | "admin";

export type NftStandard = "erc20" | "erc721" | "erc1155";

export type NftCheckMode = "collection" | "tokenOwner" | "balance";

export type FaucetClaimStatus = "requested" | "submitted" | "confirmed" | "failed" | "cancelled";

export type NftConfig = {
  id: number;
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
  standard: NftStandard;
  checkMode: NftCheckMode;
  tokenId: string | null;
  minBalance: string;
  tokenDecimals: number;
  enabled: boolean;
  version: number;
  updatedAt: string;
};

export type MemberProfile = {
  walletAddress: string;
  displayName: string | null;
  email: string | null;
  xAccount: string | null;
  discordAccount: string | null;
  telegramAccount: string | null;
  bio: string | null;
  profileImageFilename: string | null;
  profileImageMime: string | null;
  profilePublic: boolean;
  forceProfilePrivate: boolean;
  suspended: boolean;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicMemberProfile = Pick<
  MemberProfile,
  | "walletAddress"
  | "displayName"
  | "xAccount"
  | "discordAccount"
  | "telegramAccount"
  | "bio"
  | "profileImageFilename"
  | "lastVerifiedAt"
  | "updatedAt"
>;

export type FaucetSetting = {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  amountEth: string;
  enabled: boolean;
  updatedAt: string;
};

export type FaucetAllowlistEntry = {
  walletAddress: string;
  note: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FaucetClaim = {
  id: number;
  walletAddress: string;
  chainId: number;
  chainName: string;
  amountEth: string;
  claimDateJst: string;
  status: FaucetClaimStatus;
  txHash: string | null;
  adminWalletAddress: string | null;
  failureReason: string | null;
  requestedAt: string;
  submittedAt: string | null;
  confirmedAt: string | null;
  updatedAt: string;
};

export type Session = {
  tokenHash: string;
  walletAddress: string;
  role: SessionRole;
  nftConfigVersion: number | null;
  expiresAt: number;
};

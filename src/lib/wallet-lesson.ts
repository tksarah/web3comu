import { getAddress, isAddress } from "viem";

export type LessonStepId =
  | "intro"
  | "create"
  | "recovery"
  | "faucet"
  | "send"
  | "network"
  | "token"
  | "complete";

export type LessonWallet = {
  address: `0x${string}`;
  recoveryCode: string[];
  createdAt: string;
};

export type LessonNetwork = {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  addedAt: string;
};

export type LessonToken = {
  contractAddress: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  balance: number;
  addedAt: string;
};

export type LessonTransaction = {
  id: string;
  hash: `0x${string}`;
  type: "faucet" | "send";
  tokenSymbol: string;
  amount: number;
  gasFee: number;
  from: string;
  to: string;
  status: "success" | "failed";
  message: string;
  createdAt: string;
};

export type LessonProgress = {
  safeNoticeAccepted: boolean;
  recoveryConfirmed: boolean;
  faucetClaimed: boolean;
  sendCompleted: boolean;
  networkAdded: boolean;
  tokenAdded: boolean;
  finalQuizConfirmed: boolean;
};

export type LessonState = {
  version: 1;
  activeStep: LessonStepId;
  wallet: LessonWallet | null;
  networks: LessonNetwork[];
  tokens: LessonToken[];
  nativeBalance: number;
  learningTokenBalance: number;
  progress: LessonProgress;
  transactions: LessonTransaction[];
  updatedAt: string;
};

export const LESSON_STATE_VERSION = 1;
export const LESSON_NATIVE_SYMBOL = "tETH";
export const LESSON_TOKEN_SYMBOL = "LRN";
export const LESSON_FAUCET_NATIVE_AMOUNT = 0.05;
export const LESSON_FAUCET_TOKEN_AMOUNT = 100;
export const LESSON_GAS_FEE = 0.001;

export const LESSON_STEPS: ReadonlyArray<{ id: LessonStepId; label: string; title: string }> = [
  { id: "intro", label: "01", title: "安全確認" },
  { id: "create", label: "02", title: "ウォレット作成" },
  { id: "recovery", label: "03", title: "コード確認" },
  { id: "network", label: "04", title: "ネットワーク登録" },
  { id: "token", label: "05", title: "トークン追加" },
  { id: "faucet", label: "06", title: "受け取り" },
  { id: "send", label: "07", title: "送信" },
  { id: "complete", label: "08", title: "完了チェック" }
];

export const LESSON_NETWORK_TEMPLATE = {
  name: "LiON Lesson Chain",
  chainId: 31337,
  rpcUrl: "https://rpc.lesson.invalid",
  explorerUrl: "https://explorer.lesson.invalid",
  nativeCurrency: {
    symbol: LESSON_NATIVE_SYMBOL,
    decimals: 18
  }
} as const;

export const LESSON_TOKEN_TEMPLATE = {
  contractAddress: getAddress("0x1234567890abcdef1234567890abcdef12345678"),
  name: "Learning Token",
  symbol: LESSON_TOKEN_SYMBOL,
  decimals: 18
} as const;

export const LESSON_SAMPLE_RECIPIENT = getAddress("0x2222222222222222222222222222222222222222");

const INITIAL_PROGRESS: LessonProgress = {
  safeNoticeAccepted: false,
  recoveryConfirmed: false,
  faucetClaimed: false,
  sendCompleted: false,
  networkAdded: false,
  tokenAdded: false,
  finalQuizConfirmed: false
};

export function createInitialLessonState(): LessonState {
  return {
    version: LESSON_STATE_VERSION,
    activeStep: "intro",
    wallet: null,
    networks: [],
    tokens: [],
    nativeBalance: 0,
    learningTokenBalance: 0,
    progress: { ...INITIAL_PROGRESS },
    transactions: [],
    updatedAt: new Date().toISOString()
  };
}

export function normalizeLessonAddress(value: string) {
  const trimmed = value.trim();
  if (!isAddress(trimmed)) {
    return null;
  }
  return getAddress(trimmed);
}

export function formatLessonAmount(value: number, fractionDigits = 4) {
  return new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  }).format(value);
}

export function roundLessonAmount(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function getLessonStepIndex(stepId: LessonStepId) {
  return LESSON_STEPS.findIndex((step) => step.id === stepId);
}

export function getUnlockedLessonStepIndex(state: LessonState) {
  if (
    state.progress.finalQuizConfirmed &&
    state.progress.sendCompleted &&
    state.progress.faucetClaimed &&
    state.progress.tokenAdded &&
    state.progress.networkAdded
  ) {
    return 7;
  }
  if (
    state.progress.sendCompleted &&
    state.progress.faucetClaimed &&
    state.progress.tokenAdded &&
    state.progress.networkAdded
  ) {
    return 7;
  }
  if (state.progress.faucetClaimed && state.progress.tokenAdded && state.progress.networkAdded) {
    return 6;
  }
  if (state.progress.tokenAdded && state.progress.networkAdded) {
    return 5;
  }
  if (state.progress.networkAdded) {
    return 4;
  }
  if (state.progress.recoveryConfirmed) {
    return 3;
  }
  if (state.wallet) {
    return 2;
  }
  if (state.progress.safeNoticeAccepted) {
    return 1;
  }
  return 0;
}

export function setLessonActiveStep(state: LessonState, stepId: LessonStepId): LessonState {
  return {
    ...state,
    activeStep: stepId,
    updatedAt: new Date().toISOString()
  };
}

export function acceptLessonSafety(state: LessonState): LessonState {
  return {
    ...state,
    activeStep: "create",
    progress: {
      ...state.progress,
      safeNoticeAccepted: true
    },
    updatedAt: new Date().toISOString()
  };
}

export function attachLessonWallet(state: LessonState, wallet: LessonWallet): LessonState {
  return {
    ...state,
    activeStep: "recovery",
    wallet,
    updatedAt: new Date().toISOString()
  };
}

export function confirmLessonRecovery(state: LessonState): LessonState {
  return {
    ...state,
    activeStep: "network",
    progress: {
      ...state.progress,
      recoveryConfirmed: true
    },
    updatedAt: new Date().toISOString()
  };
}

export function claimLessonFaucet(
  state: LessonState,
  tx: Pick<LessonTransaction, "id" | "hash" | "to" | "createdAt">
): LessonState {
  const learningTokenBalance = state.learningTokenBalance + LESSON_FAUCET_TOKEN_AMOUNT;
  return {
    ...state,
    activeStep: "send",
    nativeBalance: roundLessonAmount(state.nativeBalance + LESSON_FAUCET_NATIVE_AMOUNT),
    learningTokenBalance,
    tokens: syncLearningTokenBalance(state.tokens, learningTokenBalance),
    progress: {
      ...state.progress,
      faucetClaimed: true
    },
    transactions: [
      {
        id: tx.id,
        hash: tx.hash,
        type: "faucet",
        tokenSymbol: `${LESSON_NATIVE_SYMBOL} / ${LESSON_TOKEN_SYMBOL}`,
        amount: LESSON_FAUCET_NATIVE_AMOUNT,
        gasFee: 0,
        from: "Lesson Faucet",
        to: tx.to,
        status: "success",
        message: `${LESSON_FAUCET_NATIVE_AMOUNT} ${LESSON_NATIVE_SYMBOL} と ${LESSON_FAUCET_TOKEN_AMOUNT} ${LESSON_TOKEN_SYMBOL} を受け取りました。`,
        createdAt: tx.createdAt
      },
      ...state.transactions
    ],
    updatedAt: new Date().toISOString()
  };
}

export function completeTokenSend(
  state: LessonState,
  input: Pick<LessonTransaction, "id" | "hash" | "to" | "amount" | "createdAt">
): LessonState {
  const from = state.wallet?.address || "Unknown";
  const learningTokenBalance = roundLessonAmount(state.learningTokenBalance - input.amount);
  return {
    ...state,
    activeStep: "complete",
    nativeBalance: roundLessonAmount(state.nativeBalance - LESSON_GAS_FEE),
    learningTokenBalance,
    tokens: syncLearningTokenBalance(state.tokens, learningTokenBalance),
    progress: {
      ...state.progress,
      sendCompleted: true
    },
    transactions: [
      {
        id: input.id,
        hash: input.hash,
        type: "send",
        tokenSymbol: LESSON_TOKEN_SYMBOL,
        amount: input.amount,
        gasFee: LESSON_GAS_FEE,
        from,
        to: input.to,
        status: "success",
        message: `${formatLessonAmount(input.amount)} ${LESSON_TOKEN_SYMBOL} を送信しました。`,
        createdAt: input.createdAt
      },
      ...state.transactions
    ],
    updatedAt: new Date().toISOString()
  };
}

export function addLessonNetwork(state: LessonState): LessonState {
  const existing = state.networks.some((network) => network.chainId === LESSON_NETWORK_TEMPLATE.chainId);
  const networks = existing
    ? state.networks
    : [
        {
          ...LESSON_NETWORK_TEMPLATE,
          addedAt: new Date().toISOString()
        },
        ...state.networks
      ];

  return {
    ...state,
    activeStep: "token",
    networks,
    progress: {
      ...state.progress,
      networkAdded: true
    },
    updatedAt: new Date().toISOString()
  };
}

export function addLessonToken(state: LessonState): LessonState {
  const existing = state.tokens.some(
    (token) => token.contractAddress.toLowerCase() === LESSON_TOKEN_TEMPLATE.contractAddress.toLowerCase()
  );
  const tokens = existing
    ? syncLearningTokenBalance(state.tokens, state.learningTokenBalance)
    : [
        {
          ...LESSON_TOKEN_TEMPLATE,
          balance: state.learningTokenBalance,
          addedAt: new Date().toISOString()
        },
        ...state.tokens
      ];

  return {
    ...state,
    activeStep: "faucet",
    tokens,
    progress: {
      ...state.progress,
      tokenAdded: true
    },
    updatedAt: new Date().toISOString()
  };
}

export function completeLesson(state: LessonState): LessonState {
  return {
    ...state,
    activeStep: "complete",
    progress: {
      ...state.progress,
      finalQuizConfirmed: true
    },
    updatedAt: new Date().toISOString()
  };
}

export function normalizeStoredLessonState(value: unknown): LessonState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const partial = value as Partial<LessonState>;
  if (partial.version !== LESSON_STATE_VERSION) {
    return null;
  }

  const initial = createInitialLessonState();
  const activeStep: LessonStepId =
    partial.activeStep && LESSON_STEPS.some((step) => step.id === partial.activeStep)
      ? partial.activeStep
      : "intro";

  const normalized: LessonState = {
    ...initial,
    ...partial,
    activeStep,
    wallet: partial.wallet || null,
    networks: Array.isArray(partial.networks) ? partial.networks : [],
    tokens: Array.isArray(partial.tokens) ? partial.tokens : [],
    nativeBalance: typeof partial.nativeBalance === "number" ? partial.nativeBalance : 0,
    learningTokenBalance:
      typeof partial.learningTokenBalance === "number" ? partial.learningTokenBalance : 0,
    progress: {
      ...INITIAL_PROGRESS,
      ...(partial.progress || {})
    },
    transactions: Array.isArray(partial.transactions) ? partial.transactions : [],
    updatedAt: typeof partial.updatedAt === "string" ? partial.updatedAt : initial.updatedAt
  };

  const activeIndex = getLessonStepIndex(normalized.activeStep);
  const unlockedIndex = getUnlockedLessonStepIndex(normalized);
  if (activeIndex > unlockedIndex) {
    return {
      ...normalized,
      activeStep: LESSON_STEPS[unlockedIndex]?.id || "intro"
    };
  }

  return normalized;
}

function syncLearningTokenBalance(tokens: LessonToken[], balance: number) {
  return tokens.map((token) =>
    token.contractAddress.toLowerCase() === LESSON_TOKEN_TEMPLATE.contractAddress.toLowerCase()
      ? { ...token, balance }
      : token
  );
}

"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { defineChain, type AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { WagmiProvider, type Config } from "wagmi";

import { DEFAULT_CHAIN, SONEIUM_MINATO } from "@/lib/chains";

type PublicConfig = {
  walletConnectProjectId: string;
};

type AppKitRuntime = {
  wagmiConfig: Config;
  queryClient: QueryClient;
};

type AppKitRuntimeState = {
  ready: boolean;
  loading: boolean;
  error: string | null;
  walletConnectProjectId: string | null;
};

const AppKitRuntimeContext = createContext<AppKitRuntimeState>({
  ready: false,
  loading: true,
  error: null,
  walletConnectProjectId: null
});

const soneiumNetwork = defineChain({
  id: DEFAULT_CHAIN.id,
  caipNetworkId: `eip155:${DEFAULT_CHAIN.id}`,
  chainNamespace: "eip155",
  name: DEFAULT_CHAIN.name,
  nativeCurrency: DEFAULT_CHAIN.nativeCurrency,
  rpcUrls: {
    default: {
      http: [DEFAULT_CHAIN.rpcUrl]
    }
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: DEFAULT_CHAIN.explorerUrl
    }
  }
});

const soneiumMinatoNetwork = defineChain({
  id: SONEIUM_MINATO.id,
  caipNetworkId: `eip155:${SONEIUM_MINATO.id}`,
  chainNamespace: "eip155",
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

export const APPKIT_NETWORKS = [soneiumNetwork, soneiumMinatoNetwork] satisfies [
  AppKitNetwork,
  ...AppKitNetwork[]
];

let cachedRuntime: (AppKitRuntime & { projectId: string }) | null = null;

async function getPublicConfig() {
  const response = await fetch("/api/public-config", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("公開設定を取得できませんでした。");
  }

  return (await response.json()) as PublicConfig;
}

function createRuntime(projectId: string): AppKitRuntime {
  if (cachedRuntime?.projectId === projectId) {
    return cachedRuntime;
  }

  const wagmiAdapter = new WagmiAdapter({
    networks: APPKIT_NETWORKS,
    projectId,
    ssr: true
  });

  createAppKit({
    adapters: [wagmiAdapter],
    networks: APPKIT_NETWORKS,
    defaultNetwork: soneiumNetwork,
    projectId,
    enableBaseAccount: false,
    enableCoinbase: false,
    enableWalletConnect: true,
    enableInjected: true,
    enableEIP6963: true,
    metadata: {
      name: "Web3コミュニティポータル",
      description: "トークン保有者向けコミュニティポータル",
      url: window.location.origin,
      icons: [`${window.location.origin}/images/top.png`]
    },
    features: {
      analytics: false,
      allWallets: true,
      connectMethodsOrder: ["wallet"],
      connectorTypeOrder: ["walletConnect", "injected", "recent", "featured", "custom", "external", "recommended"],
      email: false,
      socials: false
    }
  });

  cachedRuntime = {
    projectId,
    wagmiConfig: wagmiAdapter.wagmiConfig,
    queryClient: new QueryClient()
  };

  return cachedRuntime;
}

export function AppKitRuntimeProvider({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<AppKitRuntime | null>(null);
  const [state, setState] = useState<AppKitRuntimeState>({
    ready: false,
    loading: true,
    error: null,
    walletConnectProjectId: null
  });

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const config = await getPublicConfig();
        const projectId = config.walletConnectProjectId?.trim();

        if (!projectId) {
          if (!cancelled) {
            setState({
              ready: false,
              loading: false,
              error:
                "WalletConnect Project IDが未設定です。.env の NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID を設定してください。",
              walletConnectProjectId: null
            });
          }
          return;
        }

        const nextRuntime = createRuntime(projectId);
        if (!cancelled) {
          setRuntime(nextRuntime);
          setState({
            ready: true,
            loading: false,
            error: null,
            walletConnectProjectId: projectId
          });
        }
      } catch (caught) {
        if (!cancelled) {
          setState({
            ready: false,
            loading: false,
            error: caught instanceof Error ? caught.message : "ウォレット接続設定の読み込みに失敗しました。",
            walletConnectProjectId: null
          });
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, []);

  const contextValue = useMemo(() => state, [state]);

  if (!runtime) {
    return <AppKitRuntimeContext.Provider value={contextValue}>{children}</AppKitRuntimeContext.Provider>;
  }

  return (
    <AppKitRuntimeContext.Provider value={contextValue}>
      <WagmiProvider config={runtime.wagmiConfig}>
        <QueryClientProvider client={runtime.queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </AppKitRuntimeContext.Provider>
  );
}

export function useAppKitRuntime() {
  return useContext(AppKitRuntimeContext);
}

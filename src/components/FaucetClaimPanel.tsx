"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { getAddress } from "viem";
import { useAccount, useSignMessage } from "wagmi";

import { useAppKitRuntime } from "@/components/AppKitRuntimeProvider";
import type { FaucetAllowlistEntry, FaucetClaim, FaucetSetting } from "@/lib/types";

type FaucetNetworkStatus = FaucetSetting & {
  claim: FaucetClaim | null;
  canRequest: boolean;
};

type FaucetStatus = {
  walletAddress: string;
  approved: boolean;
  allowlistEntry: FaucetAllowlistEntry | null;
  claimDateJst: string;
  networks: FaucetNetworkStatus[];
};

type FaucetNonce = {
  message: string;
};

type FaucetClaimResponse = {
  claim: FaucetClaim;
  txHash: string | null;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function claimStatusLabel(status: FaucetClaim["status"]) {
  const labels: Record<FaucetClaim["status"], string> = {
    requested: "処理中",
    submitted: "送信済み",
    confirmed: "完了",
    failed: "失敗",
    cancelled: "取消"
  };
  return labels[status];
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || "リクエストに失敗しました。";
  } catch {
    return "リクエストに失敗しました。";
  }
}

function normalizeWalletAddress(value: string) {
  try {
    return getAddress(value.trim());
  } catch {
    throw new Error("ウォレットアドレスの形式が正しくありません。");
  }
}

function FaucetFrame({ children }: { children: ReactNode }) {
  return (
    <main className="faucet-page">
      <header className="faucet-hero pixel-panel">
        <div>
          <h1>Faucet</h1>
          <p>Soneium Mainnet / Soneium Minato のガス代用ETHを受け取れます。</p>
        </div>
        <div className="faucet-nav">
          <Link className="text-link" href="/">
            LPへ戻る
          </Link>
        </div>
      </header>
      {children}
    </main>
  );
}

function FaucetClaimPanelInner() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<FaucetStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittingChainId, setSubmittingChainId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectedWalletAddress = useMemo(() => {
    if (!address) {
      return null;
    }

    try {
      return normalizeWalletAddress(address);
    } catch {
      return null;
    }
  }, [address]);

  const loadStatus = useCallback(async (walletAddress: string, options?: { preserveMessage?: boolean; signal?: AbortSignal }) => {
    setLoading(true);
    if (!options?.preserveMessage) {
      setMessage(null);
    }
    setError(null);

    try {
      const normalized = normalizeWalletAddress(walletAddress);
      const response = await fetch(`/api/faucet/status?wallet=${encodeURIComponent(normalized)}`, {
        signal: options?.signal
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      setStatus((await response.json()) as FaucetStatus);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        return;
      }
      setStatus(null);
      setError(caught instanceof Error ? caught.message : "Faucetの状態を確認できませんでした。");
    } finally {
      if (!options?.signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isConnected || !connectedWalletAddress) {
      setStatus(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setStatus(null);
    void loadStatus(connectedWalletAddress, { signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [connectedWalletAddress, isConnected, loadStatus]);

  async function connectWallet() {
    setError(null);
    setMessage(null);
    await open({ view: "Connect", namespace: "eip155" });
  }

  async function changeWallet() {
    setError(null);
    setMessage(null);
    await open({ view: "ProfileWallets", namespace: "eip155" });
  }

  async function requestClaim(network: FaucetNetworkStatus) {
    setSubmittingChainId(network.chainId);
    setMessage(null);
    setError(null);

    try {
      if (!isConnected || !address) {
        await open({ view: "Connect", namespace: "eip155" });
        setMessage("ウォレット接続後、もう一度Faucetを受け取ってください。");
        return;
      }

      const walletAddress = normalizeWalletAddress(address);

      if (getAddress(address).toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error("接続中のウォレットを確認できませんでした。");
      }

      const nonceResponse = await fetch("/api/faucet/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, chainId: network.chainId })
      });
      if (!nonceResponse.ok) {
        throw new Error(await readError(nonceResponse));
      }
      const nonce = (await nonceResponse.json()) as FaucetNonce;

      const signature = await signMessageAsync({
        account: walletAddress as `0x${string}`,
        message: nonce.message
      });

      const claimResponse = await fetch("/api/faucet/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, chainId: network.chainId, signature })
      });
      if (!claimResponse.ok) {
        throw new Error(await readError(claimResponse));
      }

      const body = (await claimResponse.json()) as FaucetClaimResponse;
      setMessage(
        body.txHash
          ? `Faucetから送金しました。tx hash: ${body.txHash}`
          : "Faucetの送金処理を受け付けました。"
      );
      await loadStatus(walletAddress, { preserveMessage: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Faucetの受け取りに失敗しました。");
    } finally {
      setSubmittingChainId(null);
    }
  }

  return (
    <FaucetFrame>
      <section className="faucet-shell">
        <section className="pixel-panel faucet-panel">
          <div className="section-head compact">
            <div>
              <h2>受け取りウォレット</h2>
              <p className="form-note">接続中のウォレットがFaucet受け取り対象か確認します。</p>
            </div>
            {connectedWalletAddress ? <span className="wallet-chip">接続中 {shortAddress(connectedWalletAddress)}</span> : null}
          </div>
          <div className="faucet-actions">
            {isConnected && connectedWalletAddress ? (
              <button className="pixel-button secondary" type="button" onClick={changeWallet}>
                ウォレット変更
              </button>
            ) : (
              <button className="pixel-button" type="button" onClick={connectWallet}>
                ウォレット接続
              </button>
            )}
            {loading ? <span className="form-note">承認状況を確認中...</span> : null}
          </div>
          {message ? <p className="form-success">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </section>

        {status ? (
          <section className="pixel-panel faucet-panel">
            <div className="section-head compact">
              <h2>{shortAddress(status.walletAddress)}</h2>
              <span className={`status-badge ${status.approved ? "enabled" : "disabled"}`}>
                {status.approved ? "承認済み" : "未承認"}
              </span>
            </div>
            <p className="form-note">受け取り制限はJST日付で1日1回です。本日: {status.claimDateJst}</p>

            <div className="faucet-network-grid">
              {status.networks.map((network) => (
                <article className="faucet-network-card" key={network.chainId}>
                  <div>
                    <h3>{network.chainName}</h3>
                    <p>支給額: {network.amountEth} ETH</p>
                  </div>
                  {network.claim ? (
                    <div className="test-result success">
                      <strong>{claimStatusLabel(network.claim.status)}</strong>
                      <span>受付日時: {new Date(network.claim.requestedAt).toLocaleString("ja-JP")}</span>
                      {network.claim.txHash ? (
                        <a
                          className="text-link"
                          href={`${network.explorerUrl}/tx/${network.claim.txHash}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          tx hashを確認
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <p className="form-note">
                      {network.enabled ? "本日はまだ受け取っていません。" : "このネットワークのFaucetは無効です。"}
                    </p>
                  )}
                  <button
                    className="pixel-button"
                    disabled={!network.canRequest || submittingChainId === network.chainId}
                    type="button"
                    onClick={() => requestClaim(network)}
                  >
                    {submittingChainId === network.chainId ? "送金中..." : "Faucetを受け取る"}
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </FaucetFrame>
  );
}

export function FaucetClaimPanel() {
  const runtime = useAppKitRuntime();

  if (!runtime.ready) {
    const message = runtime.loading
      ? "ウォレット接続設定を読み込み中です..."
      : runtime.error || "ウォレット接続設定が完了していません。";

    return (
      <FaucetFrame>
        <section className="faucet-shell">
          <div className="pixel-panel faucet-panel">
            <p className={runtime.loading ? "form-note" : "form-error"}>{message}</p>
          </div>
        </section>
      </FaucetFrame>
    );
  }

  return <FaucetClaimPanelInner />;
}

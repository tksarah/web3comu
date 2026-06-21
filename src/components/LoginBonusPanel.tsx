"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress, type Hash } from "viem";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";

import { useAppKitRuntime } from "@/components/AppKitRuntimeProvider";
import {
  BMT_GAS_LIMITS,
  BMT_TOKEN_ADDRESS,
  bmtAbi,
  bmtPublicClient,
  bmtTxUrl,
  formatBmtAmount,
  isBmtConfigured
} from "@/lib/bmt";
import { SONEIUM_MINATO } from "@/lib/chains";

type Props = {
  walletAddress: string;
};

type LoginBonusStatus = {
  balance: bigint;
  canClaim: boolean;
  lastClaimDay: bigint;
  currentDay: bigint;
  enabled: boolean;
  amount: bigint;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeAddress(value: string) {
  return getAddress(value.trim());
}

function jstDayToDate(day: bigint) {
  if (day === 0n) {
    return "未取得";
  }
  const unixSeconds = Number(day) * 86_400 - 9 * 60 * 60;
  return new Date(unixSeconds * 1000).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
}

function nextJstDate(day: bigint) {
  return jstDayToDate(day + 1n);
}

function LoginBonusPanelInner({ walletAddress }: Props) {
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const normalizedSessionWallet = useMemo(() => normalizeAddress(walletAddress), [walletAddress]);
  const connectedWallet = useMemo(() => (address ? normalizeAddress(address) : null), [address]);
  const connectedSessionWallet =
    connectedWallet?.toLowerCase() === normalizedSessionWallet.toLowerCase();

  const [status, setStatus] = useState<LoginBonusStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async (options?: { preserveMessage?: boolean }) => {
    if (!options?.preserveMessage) {
      setMessage(null);
    }
    setError(null);

    if (!isBmtConfigured()) {
      setStatus(null);
      setError("NEXT_PUBLIC_BMT_TOKEN_ADDRESS が未設定です。");
      return;
    }

    setLoading(true);
    try {
      const block = await bmtPublicClient.getBlock();
      const currentDay = (block.timestamp + 9n * 60n * 60n) / 86_400n;
      const [balance, canClaim, lastClaimDay, enabled, amount] = await Promise.all([
        bmtPublicClient.readContract({
          address: BMT_TOKEN_ADDRESS,
          abi: bmtAbi,
          functionName: "balanceOf",
          args: [normalizedSessionWallet]
        }),
        bmtPublicClient.readContract({
          address: BMT_TOKEN_ADDRESS,
          abi: bmtAbi,
          functionName: "canClaimLoginBonus",
          args: [normalizedSessionWallet]
        }),
        bmtPublicClient.readContract({
          address: BMT_TOKEN_ADDRESS,
          abi: bmtAbi,
          functionName: "lastLoginBonusDay",
          args: [normalizedSessionWallet]
        }),
        bmtPublicClient.readContract({
          address: BMT_TOKEN_ADDRESS,
          abi: bmtAbi,
          functionName: "loginBonusEnabled"
        }),
        bmtPublicClient.readContract({
          address: BMT_TOKEN_ADDRESS,
          abi: bmtAbi,
          functionName: "loginBonusAmount"
        })
      ]);

      setStatus({ balance, canClaim, lastClaimDay, currentDay, enabled, amount });
    } catch (caught) {
      setStatus(null);
      setError(caught instanceof Error ? caught.message : "ログインボーナスの状態を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [normalizedSessionWallet]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function claim() {
    setClaiming(true);
    setMessage(null);
    setError(null);
    setTxHash(null);

    try {
      if (!isBmtConfigured()) {
        throw new Error("NEXT_PUBLIC_BMT_TOKEN_ADDRESS が未設定です。");
      }
      if (!isConnected || !address) {
        throw new Error("ログイン中のウォレットを接続してください。");
      }
      if (!connectedSessionWallet) {
        throw new Error(`ログイン中のウォレット ${shortAddress(normalizedSessionWallet)} を接続してください。`);
      }
      if (chainId !== SONEIUM_MINATO.id) {
        await switchChainAsync({ chainId: SONEIUM_MINATO.id });
      }

      const hash = await writeContractAsync({
        address: BMT_TOKEN_ADDRESS,
        abi: bmtAbi,
        functionName: "claimLoginBonus",
        args: [],
        chainId: SONEIUM_MINATO.id,
        gas: BMT_GAS_LIMITS.claimLoginBonus
      });
      setTxHash(hash);
      const receipt = await bmtPublicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("トランザクションが失敗しました。");
      }

      setMessage("ログインボーナスを受け取りました。");
      await loadStatus({ preserveMessage: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ログインボーナスの受け取りに失敗しました。");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <section className="pixel-panel focused-panel login-bonus-panel">
      <h2>Big Medal Token ログインボーナス</h2>
      <p>
        Minato上で1日1回、接続ウォレット自身がBMTをclaimします。受け取りにはガス代用のETHが必要です。
      </p>
      <img className="login-bonus-art" src="/images/treasure.png" alt="" />

      <div className="bmt-stat-grid login-bonus-grid">
        <div className="test-result">
          <strong>Wallet</strong>
          <span className="member-address">{normalizedSessionWallet}</span>
        </div>
        <div className="test-result">
          <strong>BMT Balance</strong>
          <span>{status ? formatBmtAmount(status.balance) : "確認中..."}</span>
        </div>
        <div className={`test-result ${status?.canClaim ? "success" : "failed"}`}>
          <strong>Claim</strong>
          <span>{status?.canClaim ? "受け取り可能" : "本日は受け取り不可"}</span>
          {status ? (
            <small>
              {status.lastClaimDay === status.currentDay
                ? `次回: ${nextJstDate(status.currentDay)}`
                : `本日: ${jstDayToDate(status.currentDay)}`}
            </small>
          ) : null}
        </div>
        <div className="test-result">
          <strong>Reward</strong>
          <span>{status ? formatBmtAmount(status.amount) : "確認中..."}</span>
        </div>
      </div>

      <div className="wallet-login-actions">
        <button className="pixel-button secondary" disabled={loading} type="button" onClick={() => loadStatus()}>
          {loading ? "更新中..." : "状態を更新"}
        </button>
        <button
          className="pixel-button"
          disabled={claiming || !status?.canClaim || !connectedSessionWallet}
          type="button"
          onClick={claim}
        >
          {claiming ? "受け取り中..." : "BMTを受け取る"}
        </button>
      </div>

      {connectedWallet && !connectedSessionWallet ? (
        <p className="form-error">
          接続中のウォレットがログイン中のウォレットと違います。{shortAddress(normalizedSessionWallet)} を接続してください。
        </p>
      ) : null}
      {!isBmtConfigured() ? <p className="form-error">BMTコントラクトアドレスが未設定です。</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {txHash ? (
        <a className="text-link" href={bmtTxUrl(txHash)} rel="noreferrer" target="_blank">
          tx hashを確認
        </a>
      ) : null}
    </section>
  );
}

export function LoginBonusPanel(props: Props) {
  const runtime = useAppKitRuntime();

  if (!runtime.ready) {
    const runtimeMessage = runtime.loading
      ? "ウォレット接続設定を読み込み中です..."
      : runtime.error || "ウォレット接続設定が完了していません。";

    return (
      <section className="pixel-panel focused-panel">
        <p className={runtime.loading ? "form-note" : "form-error"}>{runtimeMessage}</p>
      </section>
    );
  }

  return <LoginBonusPanelInner {...props} />;
}

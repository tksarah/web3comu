"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { formatUnits, getAddress, parseUnits, type Hash } from "viem";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";

import { useAppKitRuntime } from "@/components/AppKitRuntimeProvider";
import {
  BMT_DECIMALS,
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
  adminWallet: string;
};

type LoginBonusStatus = {
  owner: string;
  enabled: boolean;
  amount: bigint;
  minBalance: bigint;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeAddress(value: string) {
  return getAddress(value.trim());
}

async function waitForBmtReceipt(hash: Hash) {
  const receipt = await bmtPublicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("トランザクションが失敗しました。");
  }
}

function AdminLoginBonusPanelInner({ adminWallet }: Props) {
  const { open } = useAppKit();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [status, setStatus] = useState<LoginBonusStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bonusEnabled, setBonusEnabled] = useState(true);
  const [bonusAmount, setBonusAmount] = useState("1");
  const [bonusMinBalance, setBonusMinBalance] = useState("1");
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedAdminWallet = useMemo(() => normalizeAddress(adminWallet), [adminWallet]);
  const connectedAdmin = address ? address.toLowerCase() === normalizedAdminWallet.toLowerCase() : false;

  const loadStatus = useCallback(async (options?: { preserveMessage?: boolean }) => {
    if (!options?.preserveMessage) {
      setMessage(null);
    }
    setError(null);

    if (!isBmtConfigured()) {
      setStatus(null);
      setError("NEXT_PUBLIC_BMT_TOKEN_ADDRESS が未設定です。BMTをデプロイ後に設定してください。");
      return;
    }

    setLoading(true);
    try {
      const [owner, enabled, amount, minBalance] = await Promise.all([
        bmtPublicClient.readContract({ address: BMT_TOKEN_ADDRESS, abi: bmtAbi, functionName: "owner" }),
        bmtPublicClient.readContract({
          address: BMT_TOKEN_ADDRESS,
          abi: bmtAbi,
          functionName: "loginBonusEnabled"
        }),
        bmtPublicClient.readContract({ address: BMT_TOKEN_ADDRESS, abi: bmtAbi, functionName: "loginBonusAmount" }),
        bmtPublicClient.readContract({
          address: BMT_TOKEN_ADDRESS,
          abi: bmtAbi,
          functionName: "loginBonusMinBalance"
        })
      ]);

      setStatus({ owner, enabled, amount, minBalance });
      setBonusEnabled(enabled);
      setBonusAmount(formatUnits(amount, BMT_DECIMALS));
      setBonusMinBalance(formatUnits(minBalance, BMT_DECIMALS));
    } catch (caught) {
      setStatus(null);
      setError(caught instanceof Error ? caught.message : "ログインボーナス設定を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function ensureAdminWallet() {
    if (!isBmtConfigured()) {
      throw new Error("NEXT_PUBLIC_BMT_TOKEN_ADDRESS が未設定です。");
    }
    if (!isConnected || !address) {
      throw new Error("管理者ウォレットを接続してください。");
    }
    if (!connectedAdmin) {
      throw new Error(`接続中のウォレットが管理者ではありません。${shortAddress(normalizedAdminWallet)} を接続してください。`);
    }
    if (chainId !== SONEIUM_MINATO.id) {
      await switchChainAsync({ chainId: SONEIUM_MINATO.id });
    }
  }

  async function runBmtTransaction(successMessage: string, request: () => Promise<Hash>) {
    setBusy(true);
    setMessage(null);
    setError(null);
    setTxHash(null);

    try {
      await ensureAdminWallet();
      const hash = await request();
      setTxHash(hash);
      await waitForBmtReceipt(hash);
      setMessage(successMessage);
      await loadStatus({ preserveMessage: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ログインボーナス設定の更新に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function saveBonusSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runBmtTransaction("ログインボーナス設定を更新しました。", async () => {
      const parsedBonusAmount = parseUnits(bonusAmount, BMT_DECIMALS);
      const parsedMinBalance = parseUnits(bonusMinBalance, BMT_DECIMALS);
      let latestHash: Hash | null = null;

      if (!status || bonusEnabled !== status.enabled) {
        latestHash = await writeContractAsync({
          address: BMT_TOKEN_ADDRESS,
          abi: bmtAbi,
          functionName: "setLoginBonusEnabled",
          args: [bonusEnabled],
          chainId: SONEIUM_MINATO.id,
          gas: BMT_GAS_LIMITS.setLoginBonus
        });
        await waitForBmtReceipt(latestHash);
      }

      if (!status || parsedBonusAmount !== status.amount) {
        latestHash = await writeContractAsync({
          address: BMT_TOKEN_ADDRESS,
          abi: bmtAbi,
          functionName: "setLoginBonusAmount",
          args: [parsedBonusAmount],
          chainId: SONEIUM_MINATO.id,
          gas: BMT_GAS_LIMITS.setLoginBonus
        });
        await waitForBmtReceipt(latestHash);
      }

      if (!status || parsedMinBalance !== status.minBalance) {
        latestHash = await writeContractAsync({
          address: BMT_TOKEN_ADDRESS,
          abi: bmtAbi,
          functionName: "setLoginBonusMinBalance",
          args: [parsedMinBalance],
          chainId: SONEIUM_MINATO.id,
          gas: BMT_GAS_LIMITS.setLoginBonus
        });
        await waitForBmtReceipt(latestHash);
      }

      if (!latestHash) {
        throw new Error("変更された設定がありません。");
      }

      return latestHash;
    });
  }

  return (
    <div className="bmt-admin-stack">
      <section className="pixel-panel admin-members admin-section-card">
        <div className="section-head">
          <div>
            <h2>ログインボーナス状態</h2>
            <p className="form-note">BMTのclaimLoginBonus設定を読み込みます。</p>
          </div>
          <button className="member-action-button secondary" disabled={loading} type="button" onClick={() => loadStatus()}>
            {loading ? "更新中..." : "更新"}
          </button>
        </div>

        {!isBmtConfigured() ? (
          <p className="form-error">NEXT_PUBLIC_BMT_TOKEN_ADDRESS が未設定です。</p>
        ) : null}

        {status ? (
          <div className="bmt-stat-grid">
            <div className={`test-result ${status.enabled ? "success" : "failed"}`}>
              <strong>claimLoginBonus</strong>
              <span>{status.enabled ? "有効" : "無効"}</span>
            </div>
            <div className="test-result">
              <strong>Daily amount</strong>
              <span>{formatBmtAmount(status.amount)}</span>
            </div>
            <div className="test-result">
              <strong>Required balance</strong>
              <span>{formatBmtAmount(status.minBalance)}</span>
            </div>
            <div className="test-result">
              <strong>Owner</strong>
              <span className="member-address">{status.owner}</span>
            </div>
          </div>
        ) : null}

        <div className="wallet-login-actions">
          <button
            className="pixel-button secondary"
            type="button"
            onClick={() => open({ view: isConnected ? "ProfileWallets" : "Connect", namespace: "eip155" })}
          >
            {isConnected ? "ウォレット変更" : "管理者ウォレット接続"}
          </button>
          {address ? (
            <span className={`member-status-badge ${connectedAdmin ? "enabled" : "danger"}`}>
              {connectedAdmin ? `接続中 ${shortAddress(address)}` : `管理者ではありません ${shortAddress(address)}`}
            </span>
          ) : null}
        </div>
      </section>

      <form className="pixel-panel admin-form admin-section-card" onSubmit={saveBonusSettings}>
        <div className="section-head compact">
          <h2>ログインボーナス設定</h2>
          <span className={`status-badge ${bonusEnabled ? "enabled" : "disabled"}`}>
            {bonusEnabled ? "有効" : "無効"}
          </span>
        </div>
        <label className="toggle-row">
          <input checked={bonusEnabled} type="checkbox" onChange={(event) => setBonusEnabled(event.target.checked)} />
          <span>claimLoginBonusを有効にする</span>
        </label>
        <div className="form-grid">
          <label>
            <span>Daily amount</span>
            <input inputMode="decimal" value={bonusAmount} onChange={(event) => setBonusAmount(event.target.value)} />
          </label>
          <label>
            <span>Required balance</span>
            <input
              inputMode="decimal"
              value={bonusMinBalance}
              onChange={(event) => setBonusMinBalance(event.target.value)}
            />
          </label>
        </div>
        <button className="pixel-button" disabled={busy} type="submit">
          {busy ? "処理中..." : "ログインボーナス設定を保存"}
        </button>
      </form>

      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {txHash ? (
        <a className="text-link" href={bmtTxUrl(txHash)} rel="noreferrer" target="_blank">
          tx hashを確認
        </a>
      ) : null}
    </div>
  );
}

export function AdminLoginBonusPanel(props: Props) {
  const runtime = useAppKitRuntime();

  if (!runtime.ready) {
    const message = runtime.loading
      ? "ウォレット接続設定を読み込み中です..."
      : runtime.error || "ウォレット接続設定が完了していません。";

    return (
      <section className="pixel-panel admin-form admin-section-card">
        <h2>ログインボーナス管理</h2>
        <p className={runtime.loading ? "form-note" : "form-error"}>{message}</p>
      </section>
    );
  }

  return <AdminLoginBonusPanelInner {...props} />;
}

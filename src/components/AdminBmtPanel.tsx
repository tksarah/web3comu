"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { getAddress, parseUnits, type Address, type Hash } from "viem";
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

type BmtStatus = {
  name: string;
  symbol: string;
  owner: string;
  totalSupply: bigint;
  cap: bigint;
  adminBalance: bigint;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeAddress(value: string) {
  return getAddress(value.trim());
}

function parsePositiveBmtAmount(value: string) {
  const amount = parseUnits(value, BMT_DECIMALS);

  if (amount <= 0n) {
    throw new Error("Amountは0より大きい値を入力してください。");
  }

  return amount;
}

function formatPercent(value: bigint, max: bigint) {
  if (max === 0n) {
    return "0%";
  }
  return `${Number((value * 10_000n) / max) / 100}%`;
}

function AdminBmtPanelInner({ adminWallet }: Props) {
  const { open } = useAppKit();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [status, setStatus] = useState<BmtStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("1");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("1");
  const [minterAddress, setMinterAddress] = useState("");
  const [minterEnabled, setMinterEnabled] = useState(true);
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
      const [name, symbol, owner, totalSupply, cap, adminBalance] = await Promise.all([
        bmtPublicClient.readContract({ address: BMT_TOKEN_ADDRESS, abi: bmtAbi, functionName: "name" }),
        bmtPublicClient.readContract({ address: BMT_TOKEN_ADDRESS, abi: bmtAbi, functionName: "symbol" }),
        bmtPublicClient.readContract({ address: BMT_TOKEN_ADDRESS, abi: bmtAbi, functionName: "owner" }),
        bmtPublicClient.readContract({ address: BMT_TOKEN_ADDRESS, abi: bmtAbi, functionName: "totalSupply" }),
        bmtPublicClient.readContract({ address: BMT_TOKEN_ADDRESS, abi: bmtAbi, functionName: "cap" }),
        bmtPublicClient.readContract({
          address: BMT_TOKEN_ADDRESS,
          abi: bmtAbi,
          functionName: "balanceOf",
          args: [normalizedAdminWallet as Address]
        })
      ]);

      setStatus({
        name,
        symbol,
        owner,
        totalSupply,
        cap,
        adminBalance
      });
    } catch (caught) {
      setStatus(null);
      setError(caught instanceof Error ? caught.message : "BMTの状態を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [normalizedAdminWallet]);

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
      const receipt = await bmtPublicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("トランザクションが失敗しました。");
      }
      setMessage(successMessage);
      await loadStatus({ preserveMessage: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "BMTトランザクションに失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function mintBmt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runBmtTransaction("BMTをmintしました。", () => {
      const recipient = normalizeAddress(mintTo);
      const amount = parsePositiveBmtAmount(mintAmount);

      return writeContractAsync({
        address: BMT_TOKEN_ADDRESS,
        abi: bmtAbi,
        functionName: "mint",
        args: [recipient, amount],
        chainId: SONEIUM_MINATO.id,
        gas: BMT_GAS_LIMITS.mint
      });
    });
  }

  async function transferBmt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runBmtTransaction("BMTを送付しました。", () => {
      const recipient = normalizeAddress(transferTo);
      const amount = parsePositiveBmtAmount(transferAmount);

      return writeContractAsync({
        address: BMT_TOKEN_ADDRESS,
        abi: bmtAbi,
        functionName: "transfer",
        args: [recipient, amount],
        chainId: SONEIUM_MINATO.id,
        gas: BMT_GAS_LIMITS.transfer
      });
    });
  }

  async function saveMinter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runBmtTransaction("minter権限を更新しました。", () => {
      const minter = normalizeAddress(minterAddress);

      return writeContractAsync({
        address: BMT_TOKEN_ADDRESS,
        abi: bmtAbi,
        functionName: "setMinter",
        args: [minter, minterEnabled],
        chainId: SONEIUM_MINATO.id,
        gas: BMT_GAS_LIMITS.setMinter
      });
    });
  }

  return (
    <div className="bmt-admin-stack">
      <section className="pixel-panel admin-members admin-section-card">
        <div className="section-head">
          <div>
            <h2>BMTステータス</h2>
            <p className="form-note">Minato上のBig Medal Tokenを読み込みます。</p>
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
            <div className="test-result">
              <strong>{status.name}</strong>
              <span>{status.symbol}</span>
            </div>
            <div className="test-result">
              <strong>Total Supply</strong>
              <span>{formatBmtAmount(status.totalSupply)}</span>
              <small>{formatPercent(status.totalSupply, status.cap)} / cap</small>
            </div>
            <div className="test-result">
              <strong>Cap</strong>
              <span>{formatBmtAmount(status.cap)}</span>
            </div>
            <div className="test-result">
              <strong>Admin Balance</strong>
              <span>{formatBmtAmount(status.adminBalance)}</span>
            </div>
            <div className="test-result">
              <strong>Owner</strong>
              <span className="member-address">{status.owner}</span>
            </div>
          </div>
        ) : null}

        <div className="wallet-login-actions admin-wallet-actions-spaced">
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

      <form className="pixel-panel admin-form admin-section-card" onSubmit={mintBmt}>
        <h2>BMT mint</h2>
        <p className="form-note">新しいBMTを発行して相手に渡す機能です。</p>
        <label>
          <span>Recipient</span>
          <input placeholder="0x..." value={mintTo} onChange={(event) => setMintTo(event.target.value)} />
        </label>
        <label>
          <span>Amount</span>
          <input inputMode="decimal" value={mintAmount} onChange={(event) => setMintAmount(event.target.value)} />
        </label>
        <button className="pixel-button" disabled={busy || !mintTo.trim() || !mintAmount.trim()} type="submit">
          {busy ? "処理中..." : "mintする"}
        </button>
      </form>

      <form className="pixel-panel admin-form admin-section-card" onSubmit={transferBmt}>
        <h2>BMT transfer</h2>
        <p className="form-note">
          接続中の管理者ウォレットから、指定したアドレスへBMTを送付します。totalSupplyは変わりません。
        </p>
        <label>
          <span>Recipient</span>
          <input placeholder="0x..." value={transferTo} onChange={(event) => setTransferTo(event.target.value)} />
        </label>
        <label>
          <span>Amount</span>
          <input inputMode="decimal" value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} />
        </label>
        <button className="pixel-button" disabled={busy || !transferTo.trim() || !transferAmount.trim()} type="submit">
          {busy ? "処理中..." : "送付する"}
        </button>
      </form>

      <form className="pixel-panel admin-form admin-section-card" onSubmit={saveMinter}>
        <h2>minter権限</h2>
        <p className="form-note">owner以外にもBMT発行を任せるための権限管理です。</p>
        <label>
          <span>Minter address</span>
          <input placeholder="0x..." value={minterAddress} onChange={(event) => setMinterAddress(event.target.value)} />
        </label>
        <label className="toggle-row">
          <input checked={minterEnabled} type="checkbox" onChange={(event) => setMinterEnabled(event.target.checked)} />
          <span>mint権限を付与する</span>
        </label>
        <button className="pixel-button" disabled={busy || !minterAddress.trim()} type="submit">
          {busy ? "処理中..." : "minter権限を更新"}
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

export function AdminBmtPanel(props: Props) {
  const runtime = useAppKitRuntime();

  if (!runtime.ready) {
    const message = runtime.loading
      ? "ウォレット接続設定を読み込み中です..."
      : runtime.error || "ウォレット接続設定が完了していません。";

    return (
      <section className="pixel-panel admin-form admin-section-card">
        <h2>BMT管理</h2>
        <p className={runtime.loading ? "form-note" : "form-error"}>{message}</p>
      </section>
    );
  }

  return <AdminBmtPanelInner {...props} />;
}

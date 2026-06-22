"use client";

import { FormEvent, useEffect, useState } from "react";

import type { FaucetAllowlistEntry, FaucetClaim, FaucetSetting } from "@/lib/types";

type Props = {
  initialSettings: FaucetSetting[];
  initialAllowlist: FaucetAllowlistEntry[];
  initialClaims: FaucetClaim[];
};

type FaucetWalletStatus = {
  configured: boolean;
  walletAddress: string | null;
  balances: Array<{
    chainId: number;
    chainName: string;
    balanceEth: string | null;
    error: string | null;
  }>;
};

const MAX_FAUCET_AMOUNT_ETH = "0.1";

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || "リクエストに失敗しました。";
  } catch {
    return "リクエストに失敗しました。";
  }
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function txUrl(claim: FaucetClaim, settings: FaucetSetting[]) {
  const setting = settings.find((item) => item.chainId === claim.chainId);
  return claim.txHash && setting ? `${setting.explorerUrl}/tx/${claim.txHash}` : null;
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

export function AdminFaucetPanel({ initialSettings, initialAllowlist, initialClaims }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [allowlist, setAllowlist] = useState(initialAllowlist);
  const [claims, setClaims] = useState(initialClaims);
  const [walletStatus, setWalletStatus] = useState<FaucetWalletStatus | null>(null);
  const [allowlistQuery, setAllowlistQuery] = useState("");
  const [claimQuery, setClaimQuery] = useState("");
  const [newWallet, setNewWallet] = useState("");
  const [newNote, setNewNote] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAllowlist, setSavingAllowlist] = useState(false);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshWalletStatus() {
    setLoadingWallet(true);
    const response = await fetch("/api/admin/faucet/wallet");
    setLoadingWallet(false);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    setWalletStatus((await response.json()) as FaucetWalletStatus);
  }

  useEffect(() => {
    refreshWalletStatus();
  }, []);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSettings(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/faucet/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: settings.map((setting) => ({
          chainId: setting.chainId,
          amountEth: setting.amountEth,
          enabled: setting.enabled
        }))
      })
    });

    setSavingSettings(false);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    const body = (await response.json()) as { settings: FaucetSetting[] };
    setSettings(body.settings);
    setMessage("Faucet設定を保存しました。");
    await refreshWalletStatus();
  }

  async function refreshAllowlist(nextQuery = allowlistQuery) {
    const response = await fetch(`/api/admin/faucet/allowlist?query=${encodeURIComponent(nextQuery)}`);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const body = (await response.json()) as { allowlist: FaucetAllowlistEntry[] };
    setAllowlist(body.allowlist);
  }

  async function addAllowlistEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAllowlist(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/faucet/allowlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: newWallet, note: newNote })
    });

    setSavingAllowlist(false);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    setNewWallet("");
    setNewNote("");
    setMessage("Faucet受け取りアドレスを登録しました。");
    await refreshAllowlist();
  }

  async function toggleAllowlistEntry(entry: FaucetAllowlistEntry) {
    setMessage(null);
    setError(null);
    const response = await fetch(`/api/admin/faucet/allowlist/${encodeURIComponent(entry.walletAddress)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !entry.active })
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    await refreshAllowlist();
  }

  async function refreshClaims(nextQuery = claimQuery) {
    const response = await fetch(`/api/admin/faucet/claims?query=${encodeURIComponent(nextQuery)}`);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const body = (await response.json()) as { claims: FaucetClaim[] };
    setClaims(body.claims);
  }

  return (
    <div className="admin-faucet-stack">
      <form className="pixel-panel admin-form admin-section-card" id="faucet-settings" onSubmit={saveSettings}>
        <div className="section-head compact">
          <h2>Faucet設定</h2>
          <button className="member-action-button secondary" disabled={loadingWallet} type="button" onClick={refreshWalletStatus}>
            {loadingWallet ? "更新中..." : "残高を更新"}
          </button>
        </div>

        <section className="faucet-wallet-panel">
          <strong>Faucet送金元ウォレット</strong>
          {!walletStatus ? <p className="form-note">確認中...</p> : null}
          {walletStatus && !walletStatus.configured ? (
            <p className="form-error">FAUCET_PRIVATE_KEYが未設定です。</p>
          ) : null}
          {walletStatus?.walletAddress ? (
            <>
              <p className="member-address">{walletStatus.walletAddress}</p>
              <div className="faucet-balance-grid">
                {walletStatus.balances.map((balance) => (
                  <div className="test-result" key={balance.chainId}>
                    <strong>{balance.chainName}</strong>
                    {balance.error ? (
                      <span className="form-error">{balance.error}</span>
                    ) : (
                      <span>{balance.balanceEth} ETH</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <p className="form-note">Max per claim: {MAX_FAUCET_AMOUNT_ETH} ETH</p>

        {settings.map((setting, index) => (
          <div className="faucet-setting-row" key={setting.chainId}>
            <label className="toggle-row">
              <input
                checked={setting.enabled}
                type="checkbox"
                onChange={(event) => {
                  const next = settings.slice();
                  next[index] = { ...setting, enabled: event.target.checked };
                  setSettings(next);
                }}
              />
              <span>{setting.chainName}</span>
            </label>
            <label>
              <span>支給額(ETH)</span>
              <input
                inputMode="decimal"
                value={setting.amountEth}
                onChange={(event) => {
                  const next = settings.slice();
                  next[index] = { ...setting, amountEth: event.target.value };
                  setSettings(next);
                }}
              />
            </label>
          </div>
        ))}
        {message ? <p className="form-success">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button className="pixel-button" disabled={savingSettings} type="submit">
          {savingSettings ? "保存中..." : "Faucet設定を保存"}
        </button>
      </form>

      <section className="pixel-panel admin-members admin-section-card" id="faucet-allowlist">
        <div className="section-head">
          <h2>Faucet受け取りアドレス</h2>
          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              refreshAllowlist();
            }}
          >
            <input
              placeholder="ウォレットまたはメモ"
              value={allowlistQuery}
              onChange={(event) => setAllowlistQuery(event.target.value)}
            />
            <button className="pixel-button small" type="submit">
              検索
            </button>
          </form>
        </div>

        <form className="faucet-add-form" onSubmit={addAllowlistEntry}>
          <input placeholder="0x..." value={newWallet} onChange={(event) => setNewWallet(event.target.value)} />
          <input placeholder="メモ" value={newNote} onChange={(event) => setNewNote(event.target.value)} />
          <button className="pixel-button small" disabled={savingAllowlist || !newWallet.trim()} type="submit">
            追加
          </button>
        </form>

        <div className="member-admin-list">
          {allowlist.length ? (
            allowlist.map((entry) => (
              <article className="member-admin-row" key={entry.walletAddress}>
                <div className="member-main">
                  <strong>{shortAddress(entry.walletAddress)}</strong>
                  <span className="member-address">{entry.walletAddress}</span>
                  <small className={entry.note ? "" : "empty-value"}>{entry.note || "メモなし"}</small>
                </div>
                <div className="member-actions">
                  <span className={`member-status-badge ${entry.active ? "enabled" : "danger"}`}>
                    {entry.active ? "有効" : "停止中"}
                  </span>
                  <button className="member-action-button" type="button" onClick={() => toggleAllowlistEntry(entry)}>
                    {entry.active ? "停止" : "有効化"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="empty-state">Faucet受け取りアドレスはまだ登録されていません。</p>
          )}
        </div>
      </section>

      <section className="pixel-panel admin-members admin-section-card" id="faucet-claims">
        <div className="section-head">
          <h2>Faucet送金履歴</h2>
          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              refreshClaims();
            }}
          >
            <input
              placeholder="ウォレットまたはtx hash"
              value={claimQuery}
              onChange={(event) => setClaimQuery(event.target.value)}
            />
            <button className="pixel-button small" type="submit">
              検索
            </button>
          </form>
        </div>

        <div className="member-admin-list">
          {claims.length ? (
            claims.map((claim) => {
              const link = txUrl(claim, settings);
              return (
                <article className="member-admin-row" key={claim.id}>
                  <div className="member-main">
                    <strong>
                      {claim.chainName} / {claim.amountEth} ETH
                    </strong>
                    <span className="member-address">{claim.walletAddress}</span>
                    <small>
                      {claim.claimDateJst} / {claimStatusLabel(claim.status)}
                    </small>
                    {claim.failureReason ? <small className="form-error">{claim.failureReason}</small> : null}
                    {link ? (
                      <a className="text-link" href={link} rel="noreferrer" target="_blank">
                        tx hashを確認
                      </a>
                    ) : null}
                  </div>
                  <div className="member-actions">
                    <span className={`member-status-badge ${claim.status === "failed" ? "danger" : "enabled"}`}>
                      {claimStatusLabel(claim.status)}
                    </span>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="empty-state">Faucet送金履歴はまだありません。</p>
          )}
        </div>
      </section>
    </div>
  );
}

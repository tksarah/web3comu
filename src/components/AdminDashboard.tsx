"use client";

import { FormEvent, useState } from "react";

import { AdminBmtPanel } from "@/components/AdminBmtPanel";
import { AdminContentPanel } from "@/components/AdminContentPanel";
import { AdminFaucetPanel } from "@/components/AdminFaucetPanel";
import { AdminLoginBonusPanel } from "@/components/AdminLoginBonusPanel";
import { DEFAULT_CHAIN } from "@/lib/chains";
import type {
  BadgeConfig,
  FaucetAllowlistEntry,
  FaucetClaim,
  FaucetSetting,
  MemberProfile,
  NftConfig,
  PortalContent
} from "@/lib/types";

type Props = {
  initialConfig: NftConfig;
  initialBadges: BadgeConfig[];
  initialMembers: MemberProfile[];
  initialFaucetSettings: FaucetSetting[];
  initialFaucetAllowlist: FaucetAllowlistEntry[];
  initialFaucetClaims: FaucetClaim[];
  initialContents: PortalContent[];
  adminWallet: string;
};

type NftTestResult = {
  ok: boolean;
  walletAddress: string;
  reason?: string;
};

type AdminPanel = "members" | "conditions" | "badges" | "content" | "bmt" | "loginBonus" | "faucet";

const adminNavItems = [
  { panel: "members", label: "メンバー管理" },
  { panel: "conditions", label: "メンバー条件" },
  { panel: "badges", label: "バッヂ管理" },
  { panel: "content", label: "コンテンツ管理" },
  { panel: "bmt", label: "BMT管理" },
  { panel: "loginBonus", label: "ログインボーナス管理" },
  { panel: "faucet", label: "Faucet管理" }
] satisfies Array<{ panel: AdminPanel; label: string }>;

const adminPanelTitles: Record<AdminPanel, string> = {
  members: "メンバー管理",
  conditions: "メンバー条件",
  badges: "バッヂ管理",
  content: "コンテンツ管理",
  bmt: "BMT管理",
  loginBonus: "ログインボーナス管理",
  faucet: "Faucet管理"
};

const adminPanelDescriptions: Record<AdminPanel, string> = {
  members: "登録済みメンバーの公開状態、停止状態、セッションを管理します。",
  conditions: "ログインに必要なトークン条件を設定し、ウォレットの判定をテストします。",
  badges: "ホーム画面に表示するNFT/SBTバッヂとサムネイルを管理します。",
  content: "ポータルのお知らせとライブラリリンクを作成・編集します。",
  bmt: "Big Medal Tokenのmint、送付、minter権限を管理します。",
  loginBonus: "Big Medal Tokenのログインボーナス設定を管理します。",
  faucet: "Faucetの支給設定、受け取りアドレス、送金履歴を管理します。"
};

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

function normalizeConfigForStandard(config: NftConfig, standard: NftConfig["standard"]): NftConfig {
  if (standard === "erc20") {
    return {
      ...config,
      standard,
      checkMode: "balance",
      tokenId: null,
      tokenDecimals: config.tokenDecimals ?? 18
    };
  }

  if (standard === "erc1155") {
    return {
      ...config,
      standard,
      checkMode: "balance",
      tokenDecimals: config.tokenDecimals ?? 18
    };
  }

  return {
    ...config,
    standard,
    checkMode: config.checkMode === "tokenOwner" ? "tokenOwner" : "collection",
    tokenDecimals: config.tokenDecimals ?? 18
  };
}

function createBadgeDraft(order: number): BadgeConfig {
  return {
    id: -Date.now(),
    label: "新しいバッヂ",
    chainId: DEFAULT_CHAIN.id,
    rpcUrl: DEFAULT_CHAIN.rpcUrl,
    contractAddress: "",
    standard: "erc721",
    checkMode: "collection",
    tokenId: null,
    thumbnailUrl: null,
    displayOrder: order,
    enabled: true,
    updatedAt: new Date().toISOString()
  };
}

function normalizeBadgeForStandard(badge: BadgeConfig, standard: BadgeConfig["standard"]): BadgeConfig {
  if (standard === "erc1155") {
    return {
      ...badge,
      standard,
      checkMode: "balance"
    };
  }

  return {
    ...badge,
    standard,
    checkMode: badge.checkMode === "tokenOwner" ? "tokenOwner" : "collection",
    tokenId: badge.checkMode === "tokenOwner" ? badge.tokenId : null
  };
}

export function AdminDashboard({
  initialConfig,
  initialBadges,
  initialMembers,
  initialFaucetSettings,
  initialFaucetAllowlist,
  initialFaucetClaims,
  initialContents,
  adminWallet
}: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [badges, setBadges] = useState(initialBadges);
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingBadges, setSavingBadges] = useState(false);
  const [syncingMembershipBadge, setSyncingMembershipBadge] = useState(false);
  const [testWallet, setTestWallet] = useState("");
  const [testResult, setTestResult] = useState<NftTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [activeAdminPanel, setActiveAdminPanel] = useState<AdminPanel>("members");

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });

    setSaving(false);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    const body = (await response.json()) as { config: NftConfig };
    setConfig(body.config);
    setMessage(
      body.config.enabled
        ? "メンバー条件を保存しました。メンバーセッションは再判定されます。"
        : "メンバー条件を保存しました。ただし無効のため、メンバーはログインできません。"
    );
  }

  async function verifyNft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTesting(true);
    setTestResult(null);
    setError(null);

    const response = await fetch("/api/admin/verify-nft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: testWallet })
    });

    setTesting(false);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    const body = (await response.json()) as NftTestResult;
    setTestResult(body);
  }

  async function refreshMembers(nextQuery = query) {
    const response = await fetch(`/api/admin/members?query=${encodeURIComponent(nextQuery)}`);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const body = (await response.json()) as { members: MemberProfile[] };
    setMembers(body.members);
  }

  async function updateMember(wallet: string, action: "force-private" | "suspend" | "revoke-sessions", payload = {}) {
    setMessage(null);
    setError(null);
    const response = await fetch(`/api/admin/members/${encodeURIComponent(wallet)}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    setMessage("メンバー設定を更新しました。");
    await refreshMembers();
  }

  function updateBadge(index: number, nextBadge: BadgeConfig) {
    setBadges((current) => current.map((badge, badgeIndex) => (badgeIndex === index ? nextBadge : badge)));
  }

  function addBadge() {
    setBadges((current) => [...current, createBadgeDraft(current.length)]);
  }

  function removeBadge(index: number) {
    setBadges((current) =>
      current
        .filter((_, badgeIndex) => badgeIndex !== index)
        .map((badge, displayOrder) => ({ ...badge, displayOrder }))
    );
  }

  async function saveBadges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingBadges(true);
    setMessage(null);
    setError(null);

    const payload = badges.map((badge, displayOrder) => ({ ...badge, displayOrder }));
    const response = await fetch("/api/admin/badges", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badges: payload })
    });

    setSavingBadges(false);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    const body = (await response.json()) as { badges: BadgeConfig[] };
    setBadges(body.badges);
    setMessage("バッヂ設定を保存しました。");
  }

  async function syncMembershipBadge() {
    setSyncingMembershipBadge(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/badges/membership", { method: "POST" });

    setSyncingMembershipBadge(false);
    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    const body = (await response.json()) as { badges: BadgeConfig[] };
    setBadges(body.badges);
    setMessage("会員証バッヂへ現在のメンバー条件を反映しました。");
  }

  const tokenIdHelp =
    config.standard === "erc1155"
      ? "判定するERC-1155 tokenIdを入力します。"
      : "ERC-721 token owner判定で所有者を確認するtokenIdを入力します。";
  const minBalanceHelp =
    config.standard === "erc20"
      ? "ERC-20はトークン単位で入力します。例: 1.5"
      : "ERC-721/1155は必要な保有数を正の整数で入力します。";

  return (
    <main className="admin-page">
      <header className="admin-header pixel-panel">
        <div>
          <p className="eyebrow">管理画面</p>
          <h1>ポータル管理</h1>
          <p className="admin-wallet-label">管理ウォレット: {shortAddress(adminWallet)}</p>
        </div>
        <a className="pixel-button small" href="/portal">
          ポータルへ
        </a>
      </header>

      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label="管理メニュー">
          <nav className="admin-side-nav">
            {adminNavItems.map((item) => (
              <button
                aria-pressed={activeAdminPanel === item.panel}
                className={activeAdminPanel === item.panel ? "active" : ""}
                key={item.panel}
                type="button"
                onClick={() => setActiveAdminPanel(item.panel)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="admin-workspace">
          <div className="admin-panel-heading">
            <h2>{adminPanelTitles[activeAdminPanel]}</h2>
            <p>{adminPanelDescriptions[activeAdminPanel]}</p>
          </div>

          <section
            className="admin-panel-view"
            hidden={activeAdminPanel !== "members"}
            id="member-management"
          >
            <section className="pixel-panel admin-members admin-section-card">
              <div className="section-head">
                <h2>メンバー管理</h2>
                <form
                  className="search-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    refreshMembers();
                  }}
                >
                  <input
                    placeholder="ウォレット、表示名、メール"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <button className="pixel-button small" type="submit">
                    検索
                  </button>
                </form>
              </div>
              <div className="member-admin-list">
                {members.length ? (
                  members.map((member) => (
                    <article className="member-admin-row" key={member.walletAddress}>
                      <div className="member-admin-summary">
                        <div className="member-main">
                          <strong>{member.displayName || shortAddress(member.walletAddress)}</strong>
                          <span className="member-address" title={member.walletAddress}>
                            {shortAddress(member.walletAddress)}
                          </span>
                          <small className={member.email ? "" : "empty-value"}>{member.email || "メール未設定"}</small>
                        </div>
                        <div className="member-status-list" aria-label="メンバー状態">
                          <span
                            className={`member-status-badge ${
                              member.profilePublic && !member.forceProfilePrivate ? "enabled" : "muted"
                            }`}
                          >
                            {member.profilePublic && !member.forceProfilePrivate ? "公開 ON" : "公開 OFF"}
                          </span>
                          <span className={`member-status-badge ${member.suspended ? "danger" : "enabled"}`}>
                            {member.suspended ? "停止 ON" : "停止 OFF"}
                          </span>
                        </div>
                      </div>
                      <div className="member-actions">
                        <button
                          className="member-action-button"
                          type="button"
                          onClick={() =>
                            updateMember(member.walletAddress, "force-private", {
                              forceProfilePrivate: !member.forceProfilePrivate
                            })
                          }
                        >
                          {member.forceProfilePrivate ? "非表示解除" : "強制非表示"}
                        </button>
                        <button
                          className="member-action-button"
                          type="button"
                          onClick={() =>
                            updateMember(member.walletAddress, "suspend", {
                              suspended: !member.suspended
                            })
                          }
                        >
                          {member.suspended ? "停止解除" : "メンバー停止"}
                        </button>
                        <button
                          className="member-action-button secondary"
                          type="button"
                          onClick={() => updateMember(member.walletAddress, "revoke-sessions")}
                        >
                          セッション停止
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">メンバーはまだいません。</p>
                )}
              </div>
            </section>
          </section>

          <section
            className="admin-panel-view compact"
            hidden={activeAdminPanel !== "conditions"}
            id="member-condition"
          >
            <form className="pixel-panel admin-form admin-section-card" onSubmit={saveConfig}>
              <div className="section-head compact">
                <h2>メンバー条件</h2>
                <span className={`status-badge ${config.enabled ? "enabled" : "disabled"}`}>
                  {config.enabled ? "有効" : "無効"}
                </span>
              </div>

              <label className="toggle-row nft-enable-toggle">
                <input
                  checked={config.enabled}
                  type="checkbox"
                  onChange={(event) => setConfig({ ...config, enabled: event.target.checked })}
                />
                <span>このメンバー条件を有効にする</span>
              </label>

              {!config.enabled ? (
                <div className="warning-panel">この状態ではメンバーはログインできません。</div>
              ) : null}

              <div className="form-grid">
                <label>
                  <span>chainId</span>
                  <input
                    min={1}
                    type="number"
                    value={config.chainId}
                    onChange={(event) => setConfig({ ...config, chainId: Number(event.target.value) })}
                  />
                </label>
                <label>
                  <span>minBalance</span>
                  <input
                    min={1}
                    inputMode="decimal"
                    type="text"
                    value={config.minBalance}
                    onChange={(event) => setConfig({ ...config, minBalance: event.target.value })}
                  />
                </label>
              </div>
              <p className="form-note">{minBalanceHelp}</p>
              <label>
                <span>RPC URL</span>
                <input value={config.rpcUrl} onChange={(event) => setConfig({ ...config, rpcUrl: event.target.value })} />
              </label>
              <label>
                <span>Contract Address</span>
                <input
                  value={config.contractAddress}
                  onChange={(event) => setConfig({ ...config, contractAddress: event.target.value })}
                />
              </label>
              <div className="form-grid">
                <label>
                  <span>トークン規格</span>
                  <select
                    value={config.standard}
                    onChange={(event) =>
                      setConfig(normalizeConfigForStandard(config, event.target.value as NftConfig["standard"]))
                    }
                  >
                    <option value="erc20">ERC-20</option>
                    <option value="erc721">ERC-721</option>
                    <option value="erc1155">ERC-1155</option>
                  </select>
                </label>
                <label>
                  <span>判定モード</span>
                  <select
                    value={config.checkMode}
                    disabled={config.standard !== "erc721"}
                    onChange={(event) =>
                      setConfig({ ...config, checkMode: event.target.value as NftConfig["checkMode"] })
                    }
                  >
                    {config.standard === "erc20" ? <option value="balance">ERC-20 balance</option> : null}
                    {config.standard === "erc1155" ? <option value="balance">ERC-1155 token balance</option> : null}
                    {config.standard === "erc721" ? (
                      <>
                        <option value="collection">ERC-721 collection balance</option>
                        <option value="tokenOwner">ERC-721 token owner</option>
                      </>
                    ) : null}
                  </select>
                </label>
              </div>
              {config.standard === "erc20" ? (
                <label>
                  <span>tokenDecimals</span>
                  <input
                    max={36}
                    min={0}
                    type="number"
                    value={config.tokenDecimals}
                    onChange={(event) => setConfig({ ...config, tokenDecimals: Number(event.target.value) })}
                  />
                </label>
              ) : null}
              {config.standard === "erc1155" || config.checkMode === "tokenOwner" ? (
                <>
                  <label>
                    <span>tokenId</span>
                    <input
                      value={config.tokenId || ""}
                      onChange={(event) => setConfig({ ...config, tokenId: event.target.value || null })}
                    />
                  </label>
                  <p className="form-note">{tokenIdHelp}</p>
                </>
              ) : null}
              <p className="form-note">現在の条件バージョン: {config.version}</p>
              <button
                className="pixel-button secondary"
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    chainId: DEFAULT_CHAIN.id,
                    rpcUrl: DEFAULT_CHAIN.rpcUrl
                  })
                }
              >
                Soneium Mainnet初期値を入力
              </button>
              {message ? <p className="form-success">{message}</p> : null}
              {error ? <p className="form-error">{error}</p> : null}
              <button className="pixel-button" disabled={saving} type="submit">
                {saving ? "保存中..." : "メンバー条件を保存"}
              </button>
            </form>

            <form className="pixel-panel admin-form admin-section-card" id="token-test" onSubmit={verifyNft}>
              <h2>トークン検証テスト</h2>
              <p className="form-note">
                現在のメンバー条件で、指定ウォレットがメンバー判定を通過するか確認できます。
              </p>
              <label>
                <span>ウォレットアドレス</span>
                <input
                  placeholder="0x..."
                  value={testWallet}
                  onChange={(event) => setTestWallet(event.target.value)}
                />
              </label>
              <button className="pixel-button" disabled={testing || !testWallet.trim()} type="submit">
                {testing ? "検証中..." : "トークン保有をテスト"}
              </button>
              {testResult ? (
                <div className={`test-result ${testResult.ok ? "success" : "failed"}`}>
                  <strong>{testResult.ok ? "判定成功" : "判定失敗"}</strong>
                  <span>{shortAddress(testResult.walletAddress)}</span>
                  {testResult.reason ? <p>{testResult.reason}</p> : null}
                </div>
              ) : null}
            </form>
          </section>

          <section
            className="admin-panel-view compact"
            hidden={activeAdminPanel !== "badges"}
            id="badge-management"
          >
            <form className="pixel-panel admin-form admin-section-card" onSubmit={saveBadges}>
              <div className="section-head compact">
                <h2>バッヂ管理</h2>
                <button className="member-action-button" type="button" onClick={addBadge}>
                  バッヂを追加
                </button>
              </div>
              <p className="form-note">
                ホーム画面のメンバーステータスに表示するNFT/SBTバッヂを設定します。サムネイルURLは /images/... または https://... を指定できます。
              </p>
              <div className="wallet-login-actions">
                <button
                  className="pixel-button secondary"
                  disabled={syncingMembershipBadge}
                  type="button"
                  onClick={syncMembershipBadge}
                >
                  {syncingMembershipBadge ? "反映中..." : "会員証として現在のメンバー条件を反映"}
                </button>
              </div>

              <div className="badge-admin-list">
                {badges.length ? (
                  badges.map((badge, index) => (
                    <article className="badge-admin-row" key={badge.id}>
                      <div className="section-head compact">
                        <h3>{badge.label || "バッヂ"}</h3>
                        <button className="member-action-button secondary" type="button" onClick={() => removeBadge(index)}>
                          削除
                        </button>
                      </div>
                      <label className="toggle-row nft-enable-toggle">
                        <input
                          checked={badge.enabled}
                          type="checkbox"
                          onChange={(event) => updateBadge(index, { ...badge, enabled: event.target.checked })}
                        />
                        <span>このバッヂを表示対象にする</span>
                      </label>
                      <div className="form-grid">
                        <label>
                          <span>表示名</span>
                          <input value={badge.label} onChange={(event) => updateBadge(index, { ...badge, label: event.target.value })} />
                        </label>
                        <label>
                          <span>表示順</span>
                          <input
                            type="number"
                            value={badge.displayOrder}
                            onChange={(event) => updateBadge(index, { ...badge, displayOrder: Number(event.target.value) })}
                          />
                        </label>
                      </div>
                      <label>
                        <span>サムネイルURL</span>
                        <input
                          placeholder="/images/badge.webp"
                          value={badge.thumbnailUrl || ""}
                          onChange={(event) => updateBadge(index, { ...badge, thumbnailUrl: event.target.value || null })}
                        />
                      </label>
                      <div className="form-grid">
                        <label>
                          <span>chainId</span>
                          <input
                            min={1}
                            type="number"
                            value={badge.chainId}
                            onChange={(event) => updateBadge(index, { ...badge, chainId: Number(event.target.value) })}
                          />
                        </label>
                        <label>
                          <span>トークン規格</span>
                          <select
                            value={badge.standard}
                            onChange={(event) =>
                              updateBadge(index, normalizeBadgeForStandard(badge, event.target.value as BadgeConfig["standard"]))
                            }
                          >
                            <option value="erc721">ERC-721 / SBT</option>
                            <option value="erc1155">ERC-1155 / SBT</option>
                          </select>
                        </label>
                      </div>
                      <label>
                        <span>RPC URL</span>
                        <input value={badge.rpcUrl} onChange={(event) => updateBadge(index, { ...badge, rpcUrl: event.target.value })} />
                      </label>
                      <label>
                        <span>Contract Address</span>
                        <input
                          value={badge.contractAddress}
                          onChange={(event) => updateBadge(index, { ...badge, contractAddress: event.target.value })}
                        />
                      </label>
                      <div className="form-grid">
                        <label>
                          <span>判定モード</span>
                          <select
                            disabled={badge.standard !== "erc721"}
                            value={badge.checkMode}
                            onChange={(event) =>
                              updateBadge(index, { ...badge, checkMode: event.target.value as BadgeConfig["checkMode"] })
                            }
                          >
                            {badge.standard === "erc1155" ? <option value="balance">ERC-1155 token balance</option> : null}
                            {badge.standard === "erc721" ? (
                              <>
                                <option value="collection">ERC-721 collection balance</option>
                                <option value="tokenOwner">ERC-721 token owner</option>
                              </>
                            ) : null}
                          </select>
                        </label>
                        {badge.standard === "erc1155" || badge.checkMode === "tokenOwner" ? (
                          <label>
                            <span>tokenId</span>
                            <input
                              value={badge.tokenId || ""}
                              onChange={(event) => updateBadge(index, { ...badge, tokenId: event.target.value || null })}
                            />
                          </label>
                        ) : (
                          <div aria-hidden="true" />
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">バッヂ設定はまだありません。</p>
                )}
              </div>

              {message ? <p className="form-success">{message}</p> : null}
              {error ? <p className="form-error">{error}</p> : null}
              <button className="pixel-button" disabled={savingBadges} type="submit">
                {savingBadges ? "保存中..." : "バッヂ設定を保存"}
              </button>
            </form>
          </section>

          <section className="admin-panel-view" hidden={activeAdminPanel !== "content"}>
            <AdminContentPanel initialContents={initialContents} />
          </section>

          <section className="admin-panel-view" hidden={activeAdminPanel !== "faucet"}>
            <AdminFaucetPanel
              initialAllowlist={initialFaucetAllowlist}
              initialClaims={initialFaucetClaims}
              initialSettings={initialFaucetSettings}
            />
          </section>

          <section className="admin-panel-view" hidden={activeAdminPanel !== "bmt"}>
            <AdminBmtPanel adminWallet={adminWallet} />
          </section>

          <section className="admin-panel-view" hidden={activeAdminPanel !== "loginBonus"}>
            <AdminLoginBonusPanel adminWallet={adminWallet} />
          </section>
        </div>
      </div>
    </main>
  );
}

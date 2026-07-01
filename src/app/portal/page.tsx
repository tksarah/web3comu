import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { PortalFrame } from "@/components/PortalFrame";
import { getPortalContext } from "@/lib/auth";
import { formatBmtAmount, getBmtPortalStatus } from "@/lib/bmt";
import { getMemberBadgeStatuses } from "@/lib/nft";
import { countPublishedPortalContent, listBadgeConfigs, listPublishedPortalContent } from "@/lib/repository";
import type { PortalContent } from "@/lib/types";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function displayName(walletAddress: string, name: string | null) {
  return name || shortAddress(walletAddress);
}

function contentSummary(count: number, latest: PortalContent | undefined) {
  if (!count || !latest) {
    return "未掲載";
  }
  return `${count}件 / 最新: ${latest.title}`;
}

export default async function PortalPage() {
  const context = await getPortalContext();
  if (!context) {
    redirect("/");
  }

  const name = displayName(context.session.walletAddress, context.member.displayName);
  const bmtStatus = await getBmtPortalStatus(context.session.walletAddress);
  const latestNotices = listPublishedPortalContent("notice", 1);
  const latestResources = listPublishedPortalContent("resource", 1);
  const noticeCount = countPublishedPortalContent("notice");
  const resourceCount = countPublishedPortalContent("resource");
  const badgeStatuses = await getMemberBadgeStatuses(context.session.walletAddress, listBadgeConfigs(false));
  const bmtBalanceLabel = bmtStatus ? formatBmtAmount(bmtStatus.balance) : "確認できません";
  const loginBonusLabel = bmtStatus
    ? bmtStatus.loginBonusClaimedToday
      ? "本日取得済み"
      : bmtStatus.canClaimLoginBonus
        ? "本日受け取り可能"
        : "本日は受け取り不可"
    : "1日1回のアイテム取得へ";

  return (
    <PortalFrame walletAddress={context.session.walletAddress}>
      <section className="portal-hero pixel-panel">
        <div>
          <h1>ようこそ、{name}</h1>
          <p>コミュニティメンバー専用の情報拠点です。</p>
        </div>
        <img className="portal-hero-icon" src="/icons/site-crest-180.png" alt="" aria-hidden="true" />
      </section>

      <div className="portal-layout">
        <section className="portal-menu-grid" aria-label="ポータルメニュー">
          <Link className="menu-card image-menu-card" href="/portal/news">
            <Image src="/images/info.webp" alt="" width={256} height={256} sizes="128px" />
            <strong>おしらせ</strong>
            <span>{contentSummary(noticeCount, latestNotices[0])}</span>
          </Link>
          <Link className="menu-card image-menu-card" href="/portal/library">
            <Image src="/images/items.webp" alt="" width={256} height={256} sizes="128px" />
            <strong>ライブラリ</strong>
            <span>{contentSummary(resourceCount, latestResources[0])}</span>
          </Link>
          <Link className="menu-card image-menu-card" href="/portal/login-bonus">
            <Image src="/images/treasure.webp" alt="" width={256} height={256} sizes="128px" />
            <strong>ログインボーナス</strong>
            <span>{loginBonusLabel}</span>
          </Link>
          <Link className="menu-card image-menu-card" href="/portal/learn">
            <Image src="/images/wallet-small.svg" alt="" width={256} height={256} sizes="128px" />
            <strong>体験学習</strong>
            <span>Lesson一覧から順番にWeb3操作を体験する</span>
          </Link>
        </section>

        <aside className="portal-sidebar">
          <section className="pixel-panel status-panel">
            <h2>メンバーステータス</h2>
            <p>認証状態: {context.isAdmin ? "管理ウォレット" : "トークン確認済み"}</p>
            <p className="status-icon-row">
              <img src="/images/bmt-coin-stack.svg" alt="" aria-hidden="true" />
              <span>BMT残高: {bmtBalanceLabel}</span>
            </p>
            <p className="status-icon-row">
              <img src="/images/wallet-small.svg" alt="" aria-hidden="true" />
              <span>ウォレット: {shortAddress(context.session.walletAddress)}</span>
            </p>
            <div className="member-badge-section">
              <h3>取得バッヂ</h3>
              <div className="member-badge-grid">
                {badgeStatuses.length ? (
                  badgeStatuses.map(({ badge, owned }) => (
                    <article className={`member-badge ${owned ? "owned" : "locked"}`} key={badge.id}>
                      <div className="member-badge-thumb">
                        {badge.thumbnailUrl ? <img src={badge.thumbnailUrl} alt="" /> : <span>NO IMAGE</span>}
                      </div>
                      <strong>{badge.label}</strong>
                      <small>{owned ? "取得済み" : "未取得"}</small>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">表示できるバッヂはまだありません。</p>
                )}
              </div>
            </div>
          </section>
          <section className="pixel-panel status-panel">
            <h2>今日のクエスト</h2>
            <Link className="pixel-button" href="/portal/login-bonus">
              今すぐ見る
            </Link>
          </section>
        </aside>
      </div>
    </PortalFrame>
  );
}
